// Milestone 13: Smart Board Live Quiz & Aggregate Results Display
import React, { useState, useEffect } from 'react';
import type { Quiz, QuizQuestion, QuestionAggregate, QuizResults } from '../../../types/quiz.ts';
import {
  HelpCircle,
  Clock,
  Users,
  CheckCircle2,
  Award,
  BarChart3,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SmartQuizSmartBoardViewProps {
  quiz: Quiz;
  activeQuestion: QuizQuestion | null;
  aggregate: QuestionAggregate | null;
  results: QuizResults | null;
  activeStudentCount: number;
}

export const SmartQuizSmartBoardView: React.FC<SmartQuizSmartBoardViewProps> = ({
  quiz,
  activeQuestion,
  aggregate,
  results,
  activeStudentCount
}) => {
  // Visual Countdown Timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!activeQuestion || activeQuestion.status !== 'active' || !activeQuestion.deadline) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const deadlineMs = Date.parse(activeQuestion.deadline!);
      const diffMs = deadlineMs - Date.now();
      const rem = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsRemaining(rem);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 500);
    return () => clearInterval(timer);
  }, [activeQuestion?.deadline, activeQuestion?.status]);

  // If Quiz is Completed
  if (quiz.status === 'completed' && results) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-5xl mx-auto space-y-8 animate-fadeIn">
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-sm font-mono uppercase tracking-widest shadow-lg shadow-purple-900/30">
            <Award className="w-4 h-4 text-purple-400" />
            <span>Smart Quiz Concluded</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            {quiz.title}
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Session completed across all {results.totalQuestions} questions with {results.totalParticipants} active participants.
          </p>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="text-3xl font-black font-mono text-cyan-400">{results.totalParticipants}</div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-mono mt-1">Total Students</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="text-3xl font-black font-mono text-emerald-400">{results.averagePercentage.toFixed(1)}%</div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-mono mt-1">Class Average</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="text-3xl font-black font-mono text-purple-400">{results.totalPossiblePoints} pts</div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-mono mt-1">Max Score</div>
          </div>
        </div>

        {/* Public Leaderboard (Only student names and scores, zero private telemetry) */}
        {results.participants.length > 0 && (
          <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Session Standings
              </h3>
              <span className="text-xs font-mono text-slate-400">Class Performance</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.participants.slice(0, 6).map((p, idx) => (
                <div
                  key={p.studentId}
                  className={`flex items-center justify-between p-3.5 rounded-xl border ${
                    idx === 0
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                      : idx === 1
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                      : idx === 2
                      ? 'bg-orange-950/20 border-orange-500/40 text-orange-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-orange-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm">{p.displayName}</span>
                  </div>
                  <div className="font-mono text-sm font-bold">
                    <span>{p.score} pts</span>
                    <span className="text-xs text-slate-400 ml-2 font-normal">({p.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Question Display
  if (!activeQuestion && !aggregate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <HelpCircle className="w-16 h-16 text-cyan-400/50 animate-pulse" />
        <h3 className="text-2xl font-bold text-white">Smart Quiz: {quiz.title}</h3>
        <p className="text-slate-400 text-sm max-w-md">
          Awaiting instructor to start Question 1...
        </p>
      </div>
    );
  }

  const isLocked = activeQuestion?.status === 'locked' || aggregate?.isLocked;
  const questionNumber = (quiz.currentQuestionIndex >= 0 ? quiz.currentQuestionIndex : 0) + 1;
  const answeredCount = aggregate?.answeredCount || 0;
  const totalCount = aggregate?.totalParticipants || activeStudentCount || 1;
  const options = activeQuestion?.options || aggregate?.options || [];

  return (
    <div className="flex-1 flex flex-col justify-between p-6 md:p-10 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Header / Metadata Banner */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-300 font-mono font-bold text-sm tracking-wider shadow">
            QUESTION {questionNumber} OF {quiz.totalQuestions}
          </span>
          <span className="text-xs text-slate-400 font-mono uppercase tracking-widest hidden md:inline">
            {quiz.title}
          </span>
        </div>

        {/* Live Respondent Counter & Timer */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-xl shadow">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-sm font-semibold text-white">
              {answeredCount} <span className="text-slate-500 font-normal">/ {totalCount} answered</span>
            </span>
          </div>

          <div
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl border font-mono font-bold text-sm shadow transition-all ${
              isLocked
                ? 'bg-slate-900 border-slate-800 text-slate-400'
                : secondsRemaining <= 5
                ? 'bg-red-950/80 border-red-500 text-red-400 animate-bounce'
                : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isLocked ? 'LOCKED' : `${secondsRemaining}s`}</span>
          </div>
        </div>
      </div>

      {/* Prominent Question Prompt */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md min-w-0">
        <h2 className="text-xl md:text-3xl font-extrabold text-white leading-relaxed tracking-tight break-words">
          {activeQuestion?.questionText || aggregate?.questionText}
        </h2>
      </div>

      {/* 4 Interactive Stylized Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        {options.map((optText, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const count = aggregate?.optionCounts?.[letter] || 0;
          const pct = aggregate?.optionPercentages?.[letter] || 0;
          const isCorrect = isLocked && aggregate?.correctOption === letter;

          return (
            <div
              key={letter}
              className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all duration-500 flex flex-col justify-between min-w-0 ${
                isCorrect
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-100 shadow-2xl shadow-emerald-900/40 ring-2 ring-emerald-500/50'
                  : isLocked
                  ? 'bg-slate-900/40 border-slate-800 text-slate-400 opacity-80'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200 shadow-lg'
              }`}
            >
              {/* Option Letter & Text */}
              <div className="flex items-start space-x-3.5 z-10 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base font-mono shrink-0 shadow-md ${
                    isCorrect
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : isLocked
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  {letter}
                </span>
                <span className="text-base md:text-lg font-medium leading-snug pt-1 break-words min-w-0 flex-1">
                  {optText}
                </span>
              </div>

              {/* Reveal Aggregates ONLY when Locked */}
              {isLocked && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between z-10">
                  <span className="text-xs font-mono font-medium text-slate-400">
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </span>
                  <span className={`text-base font-mono font-bold ${isCorrect ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {pct}%
                  </span>
                </div>
              )}

              {/* Background vote-share fill bar when locked */}
              {isLocked && (
                <div
                  className={`absolute bottom-0 left-0 top-0 transition-all duration-700 opacity-20 pointer-events-none ${
                    isCorrect ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Notice */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          Server-Authoritative Realtime Aggregation
        </span>
        {isLocked ? (
          <span className="text-emerald-400 font-semibold animate-pulse">
            ✓ Question Locked — Correct Answer Revealed: Option {aggregate?.correctOption}
          </span>
        ) : (
          <span className="text-cyan-400 font-medium">
            Waiting for student responses...
          </span>
        )}
      </div>
    </div>
  );
};
