import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Mic,
  Square,
  Send,
  CheckCircle,
} from "lucide-react";

// Type definitions
interface RecordedAnswer {
  question: string;
  answer: any;
  audioBlob: Blob;
}

type Stage = "welcome" | "setup" | "interview" | "complete";

const BehavioralInterview: React.FC = () => {
  const [stage, setStage] = useState<Stage>("welcome");
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAnswers, setRecordedAnswers] = useState<RecordedAnswer[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recordedMimeType, setRecordedMimeType] = useState<string>("");
  const [interviewId, setInterviewId] = useState<string>("");
  const [name, setName] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sample behavioral questions
  const questions: string[] = [
    "Tell me about a time when you had to work under pressure. How did you handle it?",
    "Describe a situation where you had to work with a difficult team member. What was your approach?",
    "Give an example of a goal you set and how you achieved it.",
    "Tell me about a time you made a mistake. How did you handle it?",
    "Describe a situation where you showed leadership skills.",
  ];

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
    visualizeAudio();
  }, [stream, stage]);

  const startCamera = async (): Promise<void> => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setPermissionGranted(true);

      // Setup audio visualization
      const AudioContextClass = 
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setInterviewId(crypto.randomUUID());
      visualizeAudio();
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("Unable to access camera/microphone. Please grant permissions.");
    }
  };

  const visualizeAudio = (): void => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = (): void => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgb(15, 23, 42)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight: number;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        const gradient = ctx.createLinearGradient(
          0,
          canvas.height - barHeight,
          0,
          canvas.height
        );
        gradient.addColorStop(0, "#3b82f6");
        gradient.addColorStop(1, "#1d4ed8");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const startRecording = (): void => {
    if (!stream) return;
    setRecordedChunks([]);

    let mimeType = "";
    const possibleTypes = ["video/webm"];

    for (const type of possibleTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    const options = mimeType ? { mimeType } : {};
    const recorder = new MediaRecorder(stream, options);

    setRecordedMimeType(recorder.mimeType);

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        setRecordedChunks((prev) => [...prev, e.data]);
      }
    };

    recorder.start();
    setMediaRecorder(recorder);
    setIsRecording(true);
  };

  const stopRecording = (): void => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const submitAnswer = async (): Promise<void> => {
    if (recordedChunks.length === 0) {
      alert("Please record an answer before submitting.");
      return;
    }

    setIsSubmitting(true);

    const mimeType = recordedMimeType || "audio/webm";
    const blob = new Blob(recordedChunks, { type: mimeType });

    let extension = "webm";
    if (mimeType.includes("mp4")) extension = "mp4";
    else if (mimeType.includes("ogg")) extension = "ogg";
    else if (mimeType.includes("mpeg")) extension = "mp3";
    else if (mimeType.includes("wav")) extension = "wav";

    const formData = new FormData();
    formData.append(
      "audio",
      blob,
      `answer_${currentQuestion + 1}.${extension}`
    );
    formData.append("interview_id", interviewId);
    formData.append("name", name);
    formData.append("question", questions[currentQuestion]);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to analyze answer");

      const result = await response.json();

      setRecordedAnswers((prev) => [
        ...prev,
        {
          question: questions[currentQuestion],
          answer: result,
          audioBlob: blob,
        },
      ]);

      setRecordedChunks([]);

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        setStage("complete");
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      alert("Failed to submit answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipQuestion = (): void => {
    setRecordedChunks([]);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setStage("complete");
    }
  };

  return (
    <>
      {stage === "welcome" && (
        <div className="min-h-screen min-w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Camera className="w-10 h-10 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Behavioral Interview
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Welcome! This interview consists of {questions.length} behavioral
                questions. You'll record your answers using your camera and
                microphone.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Before you begin:
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Ensure you're in a quiet, well-lit environment</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>
                      Grant camera and microphone permissions when prompted
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Take your time to think before answering</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>Speak clearly and provide specific examples</span>
                  </li>
                </ul>
              </div>
              <div className="mb-4 flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Enter your Name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300"
                />

                <button
                  onClick={() => setStage("setup")}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg"
                >
                  Start Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {stage === "setup" && (
        <div className="min-h-screen min-w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-6">
          <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Camera & Audio Setup
            </h2>

            <div className="mb-6">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                {!permissionGranted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90">
                    <div className="text-center text-white">
                      <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 h-20 bg-gray-900 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width="800"
                  height="80"
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              {!permissionGranted ? (
                <button
                  onClick={startCamera}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Enable Camera & Microphone
                </button>
              ) : (
                <button
                  onClick={() => setStage("interview")}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Continue to Interview
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {stage === "interview" && (
        <div className="min-h-screen min-w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-blue-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">
                    Question {currentQuestion + 1} of {questions.length}
                  </h2>
                  <div className="bg-blue-700 px-4 py-2 rounded-lg">
                    {recordedAnswers.length} answered
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 p-6">
                <div>
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="h-24 bg-gray-900 rounded-lg overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width="800"
                      height="96"
                      className="w-full h-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-4 flex-grow">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">
                      YOUR QUESTION
                    </h3>
                    <p className="text-xl text-gray-900 leading-relaxed">
                      {questions[currentQuestion]}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={isSubmitting}
                        className="w-full bg-red-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Mic className="w-5 h-5" />
                        Start Recording Answer
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="w-full bg-gray-800 text-white px-6 py-4 rounded-lg font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 animate-pulse"
                      >
                        <Square className="w-5 h-5" />
                        Stop Recording
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={submitAnswer}
                        disabled={recordedChunks.length === 0 || isSubmitting}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>Processing...</>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Submit Answer
                          </>
                        )}
                      </button>

                      <button
                        onClick={skipQuestion}
                        disabled={isSubmitting}
                        className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors disabled:opacity-50"
                      >
                        Skip Question
                      </button>
                    </div>

                    {recordedChunks.length > 0 && !isRecording && (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">
                          Answer recorded! Ready to submit.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {stage === "complete" && (
        <div className="min-h-screen min-w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-6">
          <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Interview Complete!
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Thank you for completing the behavioral interview. Your responses
                have been recorded and analyzed.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Interview Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {recordedAnswers.length}
                    </div>
                    <div className="text-gray-600">Questions Answered</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {questions.length}
                    </div>
                    <div className="text-gray-600">Total Questions</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setStage("welcome");
                  setCurrentQuestion(0);
                  setRecordedAnswers([]);
                  setRecordedChunks([]);
                  if (stream) {
                    stream.getTracks().forEach((track) => track.stop());
                    setStream(null);
                  }
                  setPermissionGranted(false);
                }}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              >
                Start New Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BehavioralInterview;
