import joblib
import librosa
import numpy as np
import tensorflow as tf
import torch
from transformers import Wav2Vec2Processor, Wav2Vec2Model
import assemblyai as aai
import language_tool_python
from pymongo import MongoClient
import gridfs
from google import genai

class MLService:
    def __init__(self, app):
        config = app.config
        self.processor = Wav2Vec2Processor.from_pretrained(config['TRANSFORMER_MODEL_NAME'])
        self.wav2vec2_model = Wav2Vec2Model.from_pretrained(config['TRANSFORMER_MODEL_NAME'])
        self.model = tf.keras.models.load_model(config['MODEL_PATH'])
        self.scaler = joblib.load(config['SCALER_PATH'])
        self.sample_rate = config['SAMPLE_RATE']

    def _extract_wav2vec2_features(self, audio_chunk):
        inputs = self.processor(audio_chunk, sampling_rate=self.sample_rate, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs = self.wav2vec2_model(**inputs)
        return outputs.last_hidden_state.mean(dim=1).squeeze().numpy()

    def predict_from_audio_file(self, audio_file):
        audio, sr = librosa.load(audio_file, sr=self.sample_rate)
        
        chunk_size = 10 * sr
        num_chunks = int(np.ceil(len(audio) / chunk_size))
        prediction_sequence = []

        for i in range(num_chunks):
            start_sample = i * chunk_size
            end_sample = min((i + 1) * chunk_size, len(audio))
            audio_chunk = audio[start_sample:end_sample]

            if len(audio_chunk) == 0:
                continue

            features = self._extract_wav2vec2_features(audio_chunk)
            features_reshaped = features.reshape(1, -1)
            features_scaled = self.scaler.transform(features_reshaped)

            predictions = self.model.predict(features_scaled)
            predicted_class = int(np.argmax(predictions) + 1)
            prediction_sequence.append(predicted_class)
        
        avg_prediction = round(sum(prediction_sequence) / len(prediction_sequence), 2) if prediction_sequence else 0
        return prediction_sequence, avg_prediction

    def query_llm(self, question, transcript, avg_prediction, speech_rate_wpm):
        prompt = f"""
        You are an assistant to a hiring manager who is conducting a behavioral interview. You are given a question, a transcript of the answer, an average confidence prediction (range 1-5 where 1 is not confident and 5 is very confident), and a speech rate in words per minute.
        You need to analyze the question, relevancy of the answer to the question, other parameters provided to you.
        You need to provide helpful feedback to the hiring manager who is tasked to make the decision to hire the candidate.
        The feedback should be critical, short, and to the point.
        The feedback should be in the bullet points and can be 2-4 points.
        The feedback will only contain bullet points and no other text like headings or paragraphs or conclusions.
        Do not mention the question, answer, average prediction, or speech rate in the feedback. Just write your insights in the feedback.
        The feedback should not contain tips or suggestions for the candidate.
        The question is: {question}
        The transcript of the answer is: {transcript}
        The average prediction is: {avg_prediction}
        The speech rate is: {speech_rate_wpm}
        """

        print(prompt)

        client = genai.Client()

        response = client.models.generate_content(
            model="gemini-2.5-flash", contents=prompt
        )
        return response.text


class TranscriptionService:
    def __init__(self, app):
        aai.settings.api_key = app.config['ASSEMBLYAI_API_KEY']
        self.sample_rate = app.config['SAMPLE_RATE']

    def transcribe_and_analyze(self, audio_file):
        audio, sr = librosa.load(audio_file, sr=self.sample_rate)
        duration = librosa.get_duration(y=audio, sr=sr)
        
        audio_file.seek(0)
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_file)

        if transcript.error:
            raise Exception(f"Transcription failed: {transcript.error}")

        transcripted_text = transcript.text or ""
        num_of_words = len(transcripted_text.split())
        speech_rate_wpm = round((num_of_words / duration) * 60, 2) if duration > 0 else 0
        
        return transcripted_text, num_of_words, duration, speech_rate_wpm


class GrammarService:
    def __init__(self):
        self.tool = language_tool_python.LanguageTool('en-US')
        self.EXCLUDED_CATEGORIES = ["PUNCTUATION", "CASING", "TYPOS"]
        self.EXCLUDED_RULES = [
            "MORFOLOGIK_RULE_EN_US", "WHITESPACE_RULE"
        ]

    def check_grammar(self, text):
        matches = self.tool.check(text)
        grammar_issues = []

        for match in matches:
            if match.ruleId and any(cat in match.ruleId.upper() for cat in self.EXCLUDED_CATEGORIES):
                continue
            if match.ruleId in self.EXCLUDED_RULES:
                continue

            issue = {
                "ruleId": match.ruleId,
                "message": match.message,
                "mistake": text[match.offset: match.offset + match.errorLength],
                "suggestions": match.replacements,
                "position": (match.offset, match.offset + match.errorLength)
            }
            grammar_issues.append(issue)
        return grammar_issues

class DatabaseService:
    def __init__(self, app):
        config = app.config
        self.client = MongoClient(config['MONGO_URI'])
        self.db = self.client[config['DATABASE_NAME']]
        self.bucket = gridfs.GridFS(self.db, collection=config['GRIDFS_BUCKET_NAME'])
        self.files_collection = self.db[f"{config['GRIDFS_BUCKET_NAME']}.files"]

    def get_all_files(self):
        return list(self.files_collection.find({}, {"_id": 0, "filename": 1, "metadata": 1}))

    def get_file_by_name(self, filename):
        file_doc = self.files_collection.find_one({"filename": filename})
        if not file_doc:
            return None, None
        return self.bucket.get(file_doc["_id"]), file_doc
        
    def get_metadata_by_name(self, filename):
        file_doc = self.files_collection.find_one({"filename": filename})
        return file_doc.get("metadata", {}) if file_doc else None

    def upload_file(self, file_stream, filename, metadata):
        return self.bucket.put(
            file_stream.read(),
            filename=filename,
            contentType=file_stream.mimetype,
            metadata=metadata
        )

    def upload_results(self, metadata):
        interview_id = metadata["interview_id"]
        name = metadata["name"]
        question = metadata["question"]
        del metadata["interview_id"]
        del metadata["name"]
        current_result = self.db.results.find_one({"interview_id": interview_id})
        if current_result:
            current_result["responses"].append(metadata)
            return self.db.results.update_one({"interview_id": interview_id}, {"$set": current_result})
        else:
            return self.db.results.insert_one({"interview_id": interview_id, "name": name, "responses": [metadata]})

    def get_results(self):
        return list(self.db.results.find({}, {"_id": 0}))
        

    def find_results_by_interview_id(self, interview_id):
        return self.db.results.find_one({"interview_id": interview_id})

    def delete_file_by_name(self, filename):
        file_doc = self.files_collection.find_one({"filename": filename})
        if not file_doc:
            return False
        try:
            self.bucket.delete(file_doc["_id"])
            return True
        except Exception:
            return False