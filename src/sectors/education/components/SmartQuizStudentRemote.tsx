// Milestone 13: Student Software Remote for Smart Quiz
import React, { useState, useEffect, useCallback } from 'react';
import type { Quiz, QuizQuestion, QuizResponse, QuestionAggregate, StudentQuizState } from '../../../types/quiz.ts';
import { authClient } from '../../../services/authClient.ts';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Award,
  RefreshCw,
  Lock,
  Sparkles
} from 'lucide-react';

interface SmartQuizStudentRemoteProps {
  quiz: Quiz;
  userId: string;
  showNotice: (msg: string) => void;
}

export const SmartQuizStudentRemote: React.FC<SmartQuizStudentRemoteProps> = ({
  quiz,
  userId,
  showNotice
}) => {
  const [activeQuestion, setActiveQuestion] = useState<QuizQuestion | null>(null);
  const [aggregate, setAggregate] = useState<QuestionAggregate | null>(null);
  const [myResponse, setMyResponse] = useState<QuizResponse | null>(null);
  const [myScore, setMyScore] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // 1. Fetch current question and student's submission state (Recovery / Reconnect)
  const fetchStudentState = useCallback(async () => {
    try {
      const res = await fetch(`/api/classroom/quizzes/${quiz.id}/active-question?workspaceId=ws-stark-core`, {
        headers: {
          ...authClient.getAuthHeaders()
        }
      });
      if (res.ok) {
        const data: StudentQuizState = await res.json();
        setActiveQuestion(data.currentQuestion as any);
        setAggregate(data.aggregate);
        setMyResponse(data.myResponse);
        setMyScore(data.myScore || 0);
        setAnsweredCount(data.answeredCount || 0);

        if (data.myResponse) {
          setSelectedOption(data.myResponse.selectedOption);
        } else {
          setSelectedOption(null);
        }
      }
    } catch (err) {
      console.warn('Failed to load student quiz state:', err);
    }
  }, [quiz.id]);

  useEffect(() => {
    fetchStudentState();
  }, [fetchStudentState]);

  // Timer countdown
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

      if (rem === 0 && !myResponse) {
        // Time expired, refresh state
        fetchStudentState();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeQuestion?.deadline, activeQuestion?.status, myResponse, fetchStudentState]);

  // Submit Answer handler
  const handleSubmitAnswer = async (opt: string) => {
    if (!activeQuestion || myResponse || isSubmitting) return;

    setSelectedOption(opt);
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const res = await fetch(`/api/classroom/quizzes/${quiz.id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          selectedOption: opt,
          workspaceId: 'ws-stark-core'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMyResponse(data.response);
        setAggregate(data.aggregate);
        showNotice(`Answer submitted: Option ${opt}`);
      } else {
        const err = await res.json().catch(() => ({}));
        setSubmissionError(err.error?.message || 'Failed to submit response');
      }
    } catch (err: any) {
      setSubmissionError(err.message || 'Network error submitting response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If Quiz is Completed
  if (quiz.status === 'completed') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center space-y-4 shadow-xl">
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-purple-400 shadow-lg">
          <Award className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white">Quiz Completed!</h4>
          <p className="text-xs text-slate-400">Great work participating in today's interactive session.</p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Your Final Score:</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">{myScore} pts</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Questions Answered:</span>
            <span className="font-mono text-slate-200">{answeredCount} of {quiz.totalQuestions}</span>
          </div>
        </div>
      </div>
    );
  }

  // If waiting for first question or between questions
  if (!activeQuestion) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-3 shadow-xl">
        <HelpCircle className="w-10 h-10 text-cyan-400/60 mx-auto animate-pulse" />
        <h4 className="text-sm font-bold text-white">Smart Quiz: {quiz.title}</h4>
        <p className="text-xs text-slate-400">
          Awaiting instructor to activate the next question...
        </p>
      </div>
    );
  }

  const isLocked = activeQuestion.status === 'locked' || aggregate?.isLocked;
  const isTimeExpired = secondsRemaining === 0 && activeQuestion.deadline;
  const hasSubmitted = Boolean(myResponse);
  const options = activeQuestion.options || [];

  return (
    <div className="bg-slate-900/95 border border-cyan-900/40 rounded-xl p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Remote Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono font-bold text-xs">
            Q{activeQuestion.order + 1} of {quiz.totalQuestions}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {activeQuestion.points} pts
          </span>
        </div>

        {/* Timer & Score Badge */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            Score: <strong className="text-cyan-400">{myScore}</strong>
          </span>

          <div
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${
              isLocked
                ? 'bg-slate-950 border-slate-800 text-slate-400'
                : secondsRemaining <= 5
                ? 'bg-red-950 text-red-400 border-red-500 animate-pulse'
                : 'bg-cyan-950 text-cyan-300 border-cyan-800'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{isLocked ? 'LOCKED' : `${secondsRemaining}s`}</span>
          </div>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800/80">
        <p className="text-sm font-semibold text-white leading-relaxed">
          {activeQuestion.questionText}
        </p>
      </div>

      {/* Submission Feedback Alert */}
      {submissionError && (
        <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submissionError}</span>
        </div>
      )}

      {hasSubmitted && !isLocked && (
        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-700/50 text-cyan-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <span className="font-semibold">Answer Recorded (Option {myResponse?.selectedOption})</span>
            <p className="text-[11px] text-cyan-300/70 mt-0.5">Responses are locked. Awaiting question closing.</p>
          </div>
        </div>
      )}

      {/* When Question is Locked: Show Student Results */}
      {isLocked && myResponse && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            myResponse.isCorrect
              ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
              : 'bg-red-950/40 border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2
              className={`w-5 h-5 ${myResponse.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}
            />
            <div>
              <span className="font-bold text-sm">
                {myResponse.isCorrect ? 'Correct Answer!' : 'Incorrect'}
              </span>
              <p className="text-[11px] opacity-80">
                You selected Option {myResponse.selectedOption} • Correct was Option {activeQuestion.correctOption}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-sm">
            +{myResponse.pointsAwarded} pts
          </span>
        </div>
      )}

      {/* 4 Large Tactile Remote Buttons (A, B, C, D) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {options.map((optText, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedOption === letter;
          const isCorrect = isLocked && activeQuestion.correctOption === letter;

          return (
            <button
              key={letter}
              type="button"
              disabled={hasSubmitted || isLocked || isSubmitting}
              onClick={() => handleSubmitAnswer(letter)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between text-left group ${
                isSelected && !isLocked
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : isCorrect && isLocked
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                  : isSelected && !myResponse?.isCorrect && isLocked
                  ? 'bg-red-950/50 border-red-500 text-red-200'
                  : hasSubmitted || isLocked
                  ? 'bg-slate-950/40 border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-slate-950/80 border-slate-800 hover:border-cyan-500/60 text-slate-200 hover:bg-slate-900 active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-black font-mono text-sm ${
                    isSelected
                      ? 'bg-cyan-400 text-slate-950'
                      : isCorrect
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 group-hover:text-cyan-300'
                  }`}
                >
                  {letter}
                </span>

                {isSelected && (
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                    Selected
                  </span>
                )}
              </div>

              <span className="text-xs font-medium leading-snug line-clamp-2">
                {optText}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom status hint */}
      <div className="text-center pt-1">
        {hasSubmitted ? (
          <span className="text-[11px] text-slate-400 font-mono">
            {isLocked ? 'Question completed • Waiting for instructor' : 'Answer submitted • Waiting for question to close'}
          </span>
        ) : isLocked ? (
          <span className="text-[11px] text-slate-500 font-mono">
            Question closed • No answer recorded
          </span>
        ) : (
          <span className="text-[11px] text-cyan-400/80 font-mono animate-pulse">
            Tap an option above to submit your response
          </span>
        )}
      </div>
    </div>
  );
};
