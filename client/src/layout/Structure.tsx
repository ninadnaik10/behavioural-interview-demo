import React from "react";
import { Routes, Route } from "react-router-dom";
import InterviewPage from "../Pages/InterviewPage";
import InterviewResultPage from "../Pages/InterviewResultPage";
import HomePage from "../Pages/HomePage";

const Structure: React.FC = () => {
  return (
    <div id="parent" className="flex flex-col">
      <div className="w-screen flex flex-row justify-center">
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/interview-result" element={<InterviewResultPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default Structure;
