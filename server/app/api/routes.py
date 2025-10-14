import io
import json
from flask import request, jsonify, current_app, send_file, Blueprint
from . import api_blueprint
from .services import MLService, TranscriptionService, GrammarService, DatabaseService
from moviepy.editor import VideoFileClip
import tempfile
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

@api_blueprint.route('/predict', methods=['POST'])
def predict():
    if 'audio' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    uploaded_file = request.files['audio']
    filename = uploaded_file.filename.lower()

    question = request.form.get('question', "N/A")

    if not (filename.endswith('.wav') or filename.endswith('.webm')):
        return jsonify({"error": "Unsupported file type. Only .wav or .webm allowed"}), 400

    return asyncio.run(predict_async(uploaded_file, filename, question))


async def predict_async(uploaded_file, filename, question):
    temp_audio_path = None
    executor = ThreadPoolExecutor()
    
    try:
        if filename.endswith('.webm'):
            audio_file_path = await asyncio.get_event_loop().run_in_executor(
                executor, process_webm, uploaded_file
            )
            temp_audio_path = audio_file_path
        else:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
                uploaded_file.save(temp_audio.name)
                audio_file_path = temp_audio.name

        with open(audio_file_path, 'rb') as audio_file:
            audio_content = audio_file.read()
        
        tasks = [
            asyncio.get_event_loop().run_in_executor(
                executor, run_ml_prediction, audio_content, current_app.ml_service
            ),
            asyncio.get_event_loop().run_in_executor(
                executor, run_transcription, audio_content, current_app.transcription_service
            ),
            
        ]
        
        results = await asyncio.gather(*tasks)
        prediction_sequence, avg_prediction = results[0]
        transcript, num_of_words, duration, speech_rate_wpm = results[1]
        print("Transcript:", transcript)
        feedback = await asyncio.get_event_loop().run_in_executor(
            executor, run_llm_prediction, question, transcript, avg_prediction, speech_rate_wpm, current_app.ml_service
        )

        
        metadata = {
            **request.form,
            "prediction": prediction_sequence,
            "avg_prediction": avg_prediction,
            "transcript": transcript,
            "numofwords": num_of_words,
            "speech_rate_wpm": speech_rate_wpm,
            "feedback": feedback
        }
        
        await asyncio.get_event_loop().run_in_executor(
            executor, current_app.db_service.upload_results, metadata
        )
        
        return jsonify({"message": "OK"}), 200

    except Exception as e:
        current_app.logger.error(f"Prediction error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        executor.shutdown(wait=False)


def process_webm(uploaded_file):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_video:
        uploaded_file.save(temp_video.name)
        temp_video.flush()

        with VideoFileClip(temp_video.name) as video:
            temp_audio_path = tempfile.NamedTemporaryFile(delete=False, suffix='.wav').name
            video.audio.write_audiofile(temp_audio_path, codec='pcm_s16le')
        
        return temp_audio_path


def run_ml_prediction(audio_content, ml_service):
    import io
    audio_file = io.BytesIO(audio_content)
    return ml_service.predict_from_audio_file(audio_file)


def run_llm_prediction(question, transcript, avg_prediction, speech_rate_wpm, ml_service):
    return ml_service.query_llm(question, transcript, avg_prediction, speech_rate_wpm)


def run_transcription(audio_content, transcription_service):
    import io
    audio_file = io.BytesIO(audio_content)
    return transcription_service.transcribe_and_analyze(audio_file)

# @api_blueprint.route('/predict', methods=['POST'])
# def predict():
#     if 'audio' not in request.files:
#         return jsonify({"error": "No audio file provided"}), 400

#     audio_file = request.files['audio']
    
#     try:
#         # Get predictions
#         prediction_sequence, avg_prediction = current_app.ml_service.predict_from_audio_file(audio_file)
        
#         # Get transcription and related metrics
#         audio_file.seek(0) # Reset file pointer after reading
#         transcript, num_of_words, duration, speech_rate_wpm = current_app.transcription_service.transcribe_and_analyze(audio_file)
        
#         # Get grammar issues
#         issues = current_app.grammar_service.check_grammar(transcript)

#         return jsonify({
#             "prediction": prediction_sequence,
#             "avg_prediction": avg_prediction,
#             "transcript": transcript,
#             "numofwords": num_of_words,
#             "speech_rate_wpm": speech_rate_wpm,
#             "issues": issues
#         }), 200

#     except Exception as e:
#         current_app.logger.error(f"Prediction error: {e}")
#         return jsonify({"error": str(e)}), 500

@api_blueprint.route('/upload', methods=['POST'])
def upload():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file uploaded"}), 400

    try:
        form_data = request.form.to_dict()
        audio_file = request.files['audio']
        
        score_str = form_data.get('score', '0')
        score = [int(s) for s in score_str.split(',') if s.strip()]
        avg_prediction = sum(score) / len(score) if score else 0
        
        issues_str = form_data.get('issues', "[]")
        issues = json.loads(issues_str)
        
        metadata = {
            "score": score,
            "avg_prediction": avg_prediction,
            "transcript": form_data.get('transcript', "N/A"),
            "numofwords": form_data.get('numofwords', "N/A"),
            "speed": form_data.get('speed', "N/A"),
            "noofgrammar": form_data.get('noofgrammar', "N/A"),
            "percentfiller": form_data.get('percentfiller', "N/A"),
            "issues": issues
        }

        filename = form_data.get('filename', "default.wav")
        file_id = current_app.db_service.upload_file(audio_file, filename, metadata)
        
        return jsonify({
            "message": "Data Uploaded Successfully",
            "file_id": str(file_id),
            "avg_prediction": avg_prediction
        }), 201

    except (ValueError, json.JSONDecodeError) as e:
        return jsonify({"error": f"Invalid form data: {e}"}), 400
    except Exception as e:
        current_app.logger.error(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500

@api_blueprint.route('/get_filenames', methods=['GET'])
def get_filenames():
    files = current_app.db_service.get_all_files()
    if not files:
        return jsonify({"error": "No files found"}), 404
    return jsonify({"files": files}), 200

@api_blueprint.route('/get_audio', methods=['GET'])
def get_audio():
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Filename is required"}), 400
    
    file_data, file_doc = current_app.db_service.get_file_by_name(filename)
    if not file_data:
        return jsonify({"error": "File not found"}), 404

    return send_file(
        io.BytesIO(file_data.read()),
        download_name=filename,
        mimetype='audio/wav',
        as_attachment=True
    )

@api_blueprint.route('/get_metadata', methods=['GET'])
def get_metadata():
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Filename is required"}), 400

    metadata = current_app.db_service.get_metadata_by_name(filename)
    if metadata is None:
        return jsonify({"error": "File not found"}), 404

    return jsonify({"metadata": metadata})

@api_blueprint.route('/delete_audio', methods=['DELETE'])
def delete_audio():
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Filename is required"}), 400

    success = current_app.db_service.delete_file_by_name(filename)
    if not success:
        return jsonify({"error": "File not found or failed to delete"}), 404
        
    return jsonify({"message": f"File '{filename}' deleted successfully"}), 200

@api_blueprint.route('/get_results', methods=['GET'])
def get_results():
    results = current_app.db_service.get_results()
    return jsonify({"results": results}), 200