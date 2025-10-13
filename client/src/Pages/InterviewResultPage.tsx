import React, { useState, useEffect } from "react";
import {
  Users,
  ChevronRight,
  BarChart3,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  FileText,
  Calendar,
} from "lucide-react";

// Type definitions
interface InterviewResponse {
  avg_prediction: number;
  numofwords: number;
  speech_rate_wpm: number;
  issues: Array<{ message: string } | string>;
  transcript: string;
  question: string;
}

interface InterviewData {
  _id: string;
  name: string;
  date: string;
  responses: InterviewResponse[];
}

interface ApiResponse {
  results: InterviewData[];
}

type ViewMode = "list" | "detail";

const InterviewerDashboard: React.FC = () => {
  const [interviews, setInterviews] = useState<InterviewData[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async (): Promise<void> => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/get_results");
      if (!response.ok) throw new Error("Failed to fetch interviews");
      const data: ApiResponse = await response.json();
      setInterviews(data.results || []);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 4) return "text-green-600 bg-green-100";
    if (score >= 3) return "text-blue-600 bg-blue-100";
    if (score >= 2) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 4) return "Excellent";
    if (score >= 3) return "Good";
    if (score >= 2) return "Fair";
    return "Needs Improvement";
  };

  const calculateOverallScore = (responses: InterviewResponse[]): string => {
    if (!responses || responses.length === 0) return "0";
    const sum = responses.reduce((acc, r) => acc + (r.avg_prediction || 0), 0);
    return (sum / responses.length).toFixed(1);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderInterviewList = (): React.ReactElement => (
    <div className="min-h-screen min-w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Interview Dashboard
          </h1>
          <p className="text-blue-200">
            Review and analyze candidate responses
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading interviews...</p>
          </div>
        ) : interviews.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Interviews Found
            </h3>
            <p className="text-gray-600">
              There are no completed interviews to review yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {interviews.map((interview: InterviewData) => {
              const overallScore = calculateOverallScore(interview.responses);
              const totalQuestions = interview.responses?.length || 0;
              const totalWords =
                interview.responses?.reduce(
                  (sum, r) => sum + (r.numofwords || 0),
                  0
                ) || 0;
              const totalIssues =
                interview.responses?.reduce(
                  (sum, r) => sum + (r.issues?.length || 0),
                  0
                ) || 0;

              return (
                <div
                  key={interview._id}
                  onClick={() => {
                    setSelectedInterview(interview);
                    setView("detail");
                  }}
                  className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl font-bold text-blue-600">
                            {interview.name?.charAt(0).toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">
                            {interview.name || "Unknown Candidate"}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(interview.date)}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>Overall Score</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {overallScore}
                          </span>
                          <span className="text-sm text-gray-500">/ 5.0</span>
                        </div>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${getScoreColor(
                            parseFloat(overallScore)
                          )}`}
                        >
                          {getScoreLabel(parseFloat(overallScore))}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>Questions</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {totalQuestions}
                        </div>
                        <span className="text-sm text-gray-500">answered</span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                          <FileText className="w-4 h-4" />
                          <span>Total Words</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {totalWords}
                        </div>
                        <span className="text-sm text-gray-500">spoken</span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                          <AlertCircle className="w-4 h-4" />
                          <span>Issues</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {totalIssues}
                        </div>
                        <span className="text-sm text-gray-500">
                          identified
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {interview.responses?.slice(0, 3).map((response, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 h-2 rounded-full ${getScoreColor(
                            response.avg_prediction
                          )
                            .replace("text-", "bg-")
                            .replace("bg-bg-", "bg-")}`}
                        />
                      ))}
                      {interview.responses?.length > 3 && (
                        <span className="text-sm text-gray-500">
                          +{interview.responses.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderInterviewDetail = (): React.ReactElement | null => {
    if (!selectedInterview) return null;

    const overallScore = calculateOverallScore(selectedInterview.responses);
    const avgWordsPerResponse =
      selectedInterview.responses?.length > 0
        ? Math.round(
            selectedInterview.responses.reduce(
              (sum, r) => sum + (r.numofwords || 0),
              0
            ) / selectedInterview.responses.length
          )
        : 0;
    const avgSpeechRate =
      selectedInterview.responses?.length > 0
        ? (
            selectedInterview.responses.reduce(
              (sum, r) => sum + (r.speech_rate_wpm || 0),
              0
            ) / selectedInterview.responses.length
          ).toFixed(1)
        : 0;

    return (
      <div className="min-h-screen min-w-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setView("list")}
            className="text-white hover:text-blue-200 mb-6 flex items-center gap-2 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Interviews
          </button>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-4xl font-bold">
                      {selectedInterview.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {selectedInterview.name || "Unknown Candidate"}
                    </h1>
                    <div className="flex items-center gap-2 text-blue-100">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(selectedInterview.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-100 text-sm mb-1">
                    Overall Score
                  </div>
                  <div className="text-5xl font-bold">{overallScore}</div>
                  <div className="text-blue-100 text-sm">out of 5.0</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 p-8 bg-gray-50">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-600 font-medium">
                    Avg Words/Response
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {avgWordsPerResponse}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-600 font-medium">
                    Avg Speech Rate
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {avgSpeechRate}
                </div>
                <div className="text-sm text-gray-500">words per minute</div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-gray-600 font-medium">
                    Total Responses
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {selectedInterview.responses?.length || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {selectedInterview.responses?.map((response, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                <div className="bg-gray-50 border-b border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          Question {idx + 1}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(
                            response.avg_prediction
                          )}`}
                        >
                          Score: {response.avg_prediction?.toFixed(1) || "N/A"}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {response.question}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                      Transcript
                    </h4>
                    <p className="text-lg text-gray-900 leading-relaxed">
                      {response.transcript || "No transcript available"}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Word Count
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {response.numofwords || 0}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Speech Rate
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {response.speech_rate_wpm?.toFixed(1) || 0}
                      </div>
                      <div className="text-xs text-gray-500">WPM</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Issues Found
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {response.issues?.length || 0}
                      </div>
                    </div>
                  </div>

                  {response.issues && response.issues.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-gray-900">
                          Issues Identified
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {response.issues.map((issue, issueIdx) => (
                          <li
                            key={issueIdx}
                            className="flex items-start gap-2 text-gray-700"
                          >
                            <span className="text-amber-600 mt-1">•</span>
                            <span>{typeof issue === 'string' ? issue : issue.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(!response.issues || response.issues.length === 0) && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800 font-medium">
                        No issues identified - Great response!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return view === "list" ? renderInterviewList() : renderInterviewDetail();
};

export default InterviewerDashboard;
