import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { CheckCircle2, Edit3, BarChart3 } from "lucide-react";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleStartInterview = () => {
    navigate("/interview");
  };

  const handleViewResults = () => {
    navigate("/interview-result");
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center p-6">
      <Card className="max-w-4xl w-full shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-5xl font-bold">
            SpeakSure Interview Platform
          </CardTitle>
          <CardDescription className="text-xl">
            AI-powered behavioral interview analysis and assessment platform
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit3 className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">Take Interview</CardTitle>
                <CardDescription className="text-base">
                  Start a new behavioral interview session with AI-powered
                  analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleStartInterview}
                  className="w-full"
                  size="lg"
                >
                  Start Interview
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl">View Results</CardTitle>
                <CardDescription className="text-base">
                  Review interview results and performance analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleViewResults}
                  className="w-full"
                  size="lg"
                >
                  View Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-center">
                Platform Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">AI Analysis</h4>
                    <p className="text-sm">
                      Advanced AI-powered response analysis
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Real-time Feedback</h4>
                    <p className="text-sm">Instant performance insights</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Detailed Reports</h4>
                    <p className="text-sm">
                      Comprehensive performance analytics
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;
