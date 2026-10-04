// Milestone 13: Smart Quiz Teacher Control Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import type { Quiz, QuizQuestion, QuestionAggregate, QuizResults } from '../../../types/quiz.ts';
import {
  HelpCircle,
  Plus,
  Play,
  Pause,
  Lock,
  SkipForward,
  CheckCircle,
  Award,
  Clock,
  BarChart2,
  Trash2,
  AlertCircle,
  Send,
  RefreshCw,
  Eye,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface SmartQuizTeacherPanelProps {
  sessionId: string;
  classId: string;
  userId: string;
  activeStudentCount: number;
  activeQuiz: Quiz | null;
  onQuizChange: (quiz: Quiz | null) => void;
  showNotice: (msg: string) => void;
}

export const SmartQuizTeacherPanel: React.FC<SmartQuizTeacherPanelProps> = ({
  sessionId,
  classId,
  userId,
  activeStudentCount,
  activeQuiz,
  onQuizChange,
  showNotice
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(activeQuiz?.id || null);
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>([]);
  const [currentAggregate, setCurrentAggregate] = useState<QuestionAggregate | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // New Quiz Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  // Add Question Modal state
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<boolean>(false);
  const [qText, setQText] = useState<string>('');
  const [optA, setOptA] = useState<string>('');
  const [optB, setOptB] = useState<string>('');
  const [optC, setOptC] = useState<string>('');
  const [optD, setOptD] = useState<string>('');
  const [correctOpt, setCorrectOpt] = useState<string>('A');
  const [timeLimit, setTimeLimit] = useState<number>(30);
  const [points, setPoints] = useState<number>(10);

  // 1. Fetch Quizzes for this classroom session
  const fetchQuizzes = useCallback(async (preferredSelectId?: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/classroom/quizzes?sessionId=${sessionId}&classId=${classId}&workspaceId=ws-stark-core`, {
        headers: { 'x-user-id': userId, 'x-user-role': 'teacher' }
      });
      if (res.ok) {
        const data = await res.json();
        const fetchedQuizzes: Quiz[] = data.quizzes || [];
        setQuizzes(fetchedQuizzes);

        setSelectedQuizId((prevId) => {
          // If preferred target specified and exists, select it
          if (preferredSelectId && fetchedQuizzes.some((q) => q.id === preferredSelectId)) {
            return preferredSelectId;
          }
          // If previous selection still exists in the fetched list, preserve it!
          if (prevId && fetchedQuizzes.some((q) => q.id === prevId)) {
            return prevId;
          }
          // If a quiz is live or paused, prioritize selecting it
          const live = fetchedQuizzes.find((q) => q.status === 'live' || q.status === 'paused');
          if (live) {
            return live.id;
          }
          // Fall back to first quiz or null
          return fetchedQuizzes.length > 0 ? fetchedQuizzes[0].id : null;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch quizzes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, classId, userId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // 2. Fetch selected quiz details, questions & active state
  const fetchQuizDetails = useCallback(async (quizId: string) => {
    if (!quizId) return;
    try {
      const res = await fetch(`/api/classroom/quizzes/${quizId}?workspaceId=ws-stark-core`, {
        headers: { 'x-user-id': userId, 'x-user-role': 'teacher' }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentQuestions(data.questions || []);

        // Update local quiz object if changed
        setQuizzes((prev) =>
          prev.map((q) => (q.id === data.quiz.id ? data.quiz : q))
        );

        if (data.quiz.status === 'live' || data.quiz.status === 'paused') {
          // Notify parent of active live quiz
          onQuizChange(data.quiz);

          // Fetch live active question & aggregate
          const stateRes = await fetch(`/api/classroom/quizzes/${quizId}/active-question?workspaceId=ws-stark-core`, {
            headers: { 'x-user-id': userId, 'x-user-role': 'teacher' }
          });
          if (stateRes.ok) {
            const stateData = await stateRes.json();
            setCurrentAggregate(stateData.aggregate);
          }
        } else if (data.quiz.status === 'completed') {
          onQuizChange(data.quiz);

          // Fetch results
          const resRes = await fetch(`/api/classroom/quizzes/${quizId}/results?workspaceId=ws-stark-core`, {
            headers: { 'x-user-id': userId, 'x-user-role': 'teacher' }
          });
          if (resRes.ok) {
            const resData = await resRes.json();
            setQuizResults(resData.results);
          }
        } else {
          setCurrentAggregate(null);
          setQuizResults(null);
        }
      }
    } catch (err) {
      console.warn('Failed to load quiz details:', err);
    }
  }, [userId, onQuizChange]);

  useEffect(() => {
    if (selectedQuizId) {
      fetchQuizDetails(selectedQuizId);
    } else {
      setCurrentQuestions([]);
      setCurrentAggregate(null);
      setQuizResults(null);
    }
  }, [selectedQuizId, fetchQuizDetails]);

  const activeSelectedQuiz = quizzes.find((q) => q.id === selectedQuizId) || null;

  // Actions
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/classroom/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({
          classId,
          classroomSessionId: sessionId,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          workspaceId: 'ws-stark-core'
        })
      });
      if (res.ok) {
        const data = await res.json();
        showNotice(`Created quiz: "${data.quiz.title}"`);
        setNewTitle('');
        setNewDescription('');
        setShowCreateModal(false);

        // Add new quiz immutably and select it immediately
        setQuizzes((prev) => {
          const exists = prev.some((q) => q.id === data.quiz.id);
          return exists ? prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)) : [...prev, data.quiz];
        });
        setSelectedQuizId(data.quiz.id);
        setCurrentQuestions([]);
        setCurrentAggregate(null);
        setQuizResults(null);
      }
    } catch (err: any) {
      alert(`Error creating quiz: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId || !qText.trim() || !optA.trim() || !optB.trim()) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/quizzes/${selectedQuizId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({
          questionText: qText.trim(),
          options: [optA.trim(), optB.trim(), optC.trim() || 'Option C', optD.trim() || 'Option D'],
          correctOption: correctOpt,
          points,
          timeLimitSeconds: timeLimit,
          workspaceId: 'ws-stark-core'
        })
      });
      if (res.ok) {
        showNotice('Question added successfully!');
        setQText('');
        setOptA('');
        setOptB('');
        setOptC('');
        setOptD('');
        setShowAddQuestionModal(false);
        fetchQuizDetails(selectedQuizId);
      }
    } catch (err: any) {
      alert(`Error adding question: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePublishReady = async () => {
    if (!selectedQuizId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/quizzes/${selectedQuizId}/ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        showNotice('Quiz published and ready to launch!');
        setQuizzes((prev) => prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)));
        if (activeQuiz?.id === data.quiz.id) {
          onQuizChange(data.quiz);
        }
      }
    } catch (err: any) {
      alert(`Failed to ready quiz: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedQuizId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/quizzes/${selectedQuizId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        showNotice('Quiz is now LIVE on Smart Board and Student Remotes!');
        setQuizzes((prev) => prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)));
        onQuizChange(data.quiz);
        setCurrentAggregate(data.aggregate || null);
        fetchQuizDetails(selectedQuizId);
      }
    } catch (err: any) {
      alert(`Failed to start quiz: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLockQuestion = async () => {
    if (!selectedQuizId || !currentAggregate) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/quizzes/${selectedQuizId}/questions/${currentAggregate.questionId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        showNotice('Question locked. Results displayed on Smart Board!');
        setCurrentAggregate(data.aggregate);
      }
    } catch (err: any) {
      alert(`Failed to lock question: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAdvanceQuestion = async () => {
    if (!selectedQuizId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/quizzes/${selectedQuizId}/advance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.completed) {
          showNotice('Quiz completed! Final scores computed.');
          setQuizResults(data.results || null);
        } else {
          showNotice(`Advanced to question ${(data.quiz.currentQuestionIndex || 0) + 1}!`);
          setCurrentAggregate(data.aggregate || null);
        }
        setQuizzes((prev) => prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)));
        onQuizChange(data.quiz);
        fetchQuizDetails(selectedQuizId);
      }
    } catch (err: any) {
      alert(`Failed to advance question: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTogglePause = async () => {
    if (!selectedQuizId || !activeSelectedQuiz) return;
    const isPaused = activeSelectedQuiz.status === 'paused';
    const endpoint = isPaused ? 'resume' : 'pause';
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/quizzes/${selectedQuizId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        showNotice(isPaused ? 'Quiz resumed.' : 'Quiz paused.');
        setQuizzes((prev) => prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)));
        onQuizChange(data.quiz);
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteQuiz = async () => {
    if (!selectedQuizId) return;
    if (!confirm('End and finalize this Smart Quiz session?')) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/quizzes/${selectedQuizId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-user-role': 'teacher'
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        showNotice('Smart Quiz concluded! Final leaderboard saved.');
        setQuizResults(data.results || null);
        setQuizzes((prev) => prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)));
        onQuizChange(data.quiz);
        fetchQuizDetails(selectedQuizId);
      }
    } catch (err: any) {
      alert(`Failed to complete quiz: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
              Smart Quiz & Live Responses
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                M13 Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive deterministic polling, live remote response aggregation & Smart Board sync
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Quiz</span>
          </button>
        </div>
      </div>

      {/* Quiz Selector bar */}
      <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-4">
        <div className="flex items-center space-x-2 overflow-x-auto max-w-xl py-0.5">
          <span className="text-xs text-slate-500 uppercase font-mono tracking-wider pl-1">Quizzes:</span>
          {quizzes.length === 0 ? (
            <span className="text-xs text-slate-500 italic">No quizzes created for this session yet.</span>
          ) : (
            quizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedQuizId(q.id)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition flex items-center space-x-1.5 whitespace-nowrap ${
                  selectedQuizId === q.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{q.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    q.status === 'live'
                      ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                      : q.status === 'ready'
                      ? 'bg-blue-500/20 text-blue-400'
                      : q.status === 'completed'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {q.status}
                </span>
              </button>
            ))
          )}
        </div>

        <button
          onClick={() => fetchQuizzes()}
          title="Refresh Quizzes"
          className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-md transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Selected Quiz Control Board */}
      {activeSelectedQuiz ? (
        <div className="space-y-4">
          {/* Top Status & Controls */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-bold text-white">{activeSelectedQuiz.title}</h4>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                      activeSelectedQuiz.status === 'live'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : activeSelectedQuiz.status === 'ready'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : activeSelectedQuiz.status === 'completed'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    STATUS: {activeSelectedQuiz.status.toUpperCase()}
                  </span>
                </div>
                {activeSelectedQuiz.description && (
                  <p className="text-xs text-slate-400 mt-1">{activeSelectedQuiz.description}</p>
                )}
                <div className="flex items-center space-x-4 text-xs text-slate-500 mt-2 font-mono">
                  <span>Questions: {currentQuestions.length}</span>
                  <span>Enrolled Students: {activeStudentCount}</span>
                  {activeSelectedQuiz.currentQuestionIndex >= 0 && (
                    <span>Current Question: {activeSelectedQuiz.currentQuestionIndex + 1} of {currentQuestions.length}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {activeSelectedQuiz.status === 'draft' && (
                  <>
                    <button
                      onClick={() => setShowAddQuestionModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 border border-slate-700 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                    <button
                      onClick={handlePublishReady}
                      disabled={isActionLoading || currentQuestions.length === 0}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition shadow"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Publish / Ready</span>
                    </button>
                  </>
                )}

                {activeSelectedQuiz.status === 'ready' && (
                  <button
                    onClick={handleStartQuiz}
                    disabled={isActionLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-emerald-600/30 animate-pulse"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Live Quiz</span>
                  </button>
                )}

                {(activeSelectedQuiz.status === 'live' || activeSelectedQuiz.status === 'paused') && (
                  <>
                    <button
                      onClick={handleLockQuestion}
                      disabled={isActionLoading || currentAggregate?.isLocked}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Question</span>
                    </button>

                    <button
                      onClick={handleAdvanceQuestion}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition shadow"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>
                        {activeSelectedQuiz.currentQuestionIndex + 1 >= currentQuestions.length
                          ? 'Finish Quiz'
                          : 'Next Question'}
                      </span>
                    </button>

                    <button
                      onClick={handleTogglePause}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 border border-slate-700 transition"
                    >
                      {activeSelectedQuiz.status === 'paused' ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current text-amber-400" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCompleteQuiz}
                      disabled={isActionLoading}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-lg text-xs font-medium transition"
                    >
                      <span>Conclude</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Live Question Monitor (When Live/Paused) */}
          {(activeSelectedQuiz.status === 'live' || activeSelectedQuiz.status === 'paused') && currentAggregate && (
            <div className="bg-slate-950/90 border border-cyan-900/40 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    Q{currentAggregate.order + 1}
                  </span>
                  <span className="text-sm font-semibold text-white">{currentAggregate.questionText}</span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {currentAggregate.isLocked ? 'Locked' : `${currentAggregate.timeRemainingSeconds ?? 0}s remaining`}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-900 text-slate-300 border border-slate-800">
                    Responses: {currentAggregate.answeredCount} / {currentAggregate.totalParticipants}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-cyan-500 h-2 transition-all duration-300 rounded-full"
                  style={{
                    width: `${
                      currentAggregate.totalParticipants > 0
                        ? Math.min(100, (currentAggregate.answeredCount / currentAggregate.totalParticipants) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>

              {/* Options breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {currentAggregate.options.map((optText, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const count = currentAggregate.optionCounts[letter] || 0;
                  const pct = currentAggregate.optionPercentages[letter] || 0;
                  const isCorrect = currentAggregate.correctOption === letter;

                  return (
                    <div
                      key={letter}
                      className={`p-3 rounded-lg border flex flex-col justify-between transition ${
                        isCorrect && currentAggregate.isLocked
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="flex items-center space-x-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                            isCorrect && currentAggregate.isLocked
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {letter}
                          </span>
                          <span>{optText}</span>
                        </span>
                        <span className="font-mono text-xs">{count} ({pct}%)</span>
                      </div>

                      {/* Vote share bar */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isCorrect && currentAggregate.isLocked ? 'bg-emerald-400' : 'bg-cyan-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Questions List (Draft / Prepared view) */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
            <h5 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Quiz Questions ({currentQuestions.length})</span>
              {activeSelectedQuiz.status === 'draft' && (
                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-sans text-xs flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Question</span>
                </button>
              )}
            </h5>

            {currentQuestions.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No questions yet. Click "Add Question" to start building this quiz.
              </div>
            ) : (
              <div className="space-y-2">
                {currentQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-2.5 rounded-md bg-slate-900 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-cyan-400 font-bold">Q{idx + 1}</span>
                      <span className="text-slate-200">{q.questionText}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
                      <span>Correct: <strong className="text-emerald-400">{q.correctOption}</strong></span>
                      <span>{q.timeLimitSeconds}s</span>
                      <span>{q.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Results Summary if Completed */}
          {activeSelectedQuiz.status === 'completed' && quizResults && (
            <div className="bg-slate-950/80 border border-purple-900/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-900/40 pb-2">
                <h5 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-400" />
                  Final Class Performance Results
                </h5>
                <span className="text-xs font-mono text-slate-400">
                  Avg: {quizResults.averagePercentage.toFixed(1)}% | Participants: {quizResults.totalParticipants}
                </span>
              </div>

              {/* Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-2">Rank</th>
                      <th className="p-2">Student</th>
                      <th className="p-2">Score</th>
                      <th className="p-2">Correct</th>
                      <th className="p-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.participants.map((p, idx) => (
                      <tr key={p.studentId} className="border-b border-slate-900">
                        <td className="p-2 font-mono font-bold text-cyan-400">#{idx + 1}</td>
                        <td className="p-2 text-white font-medium">{p.displayName}</td>
                        <td className="p-2 font-mono">{p.score} / {p.totalPossiblePoints}</td>
                        <td className="p-2 font-mono">{p.correctAnswers} / {p.answeredQuestions}</td>
                        <td className="p-2 font-mono text-emerald-400 font-bold">{p.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-xs">
          Select or create a Smart Quiz to manage live questions.
        </div>
      )}

      {/* CREATE QUIZ MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Create New Smart Quiz
            </h4>
            <form onSubmit={handleCreateQuiz} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Quiz Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wavefunction Collapse & Measurement"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Quick description or topic summary..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium"
                >
                  Create Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" />
              Add Question to Quiz
            </h4>
            <form onSubmit={handleAddQuestion} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Question Prompt</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. What is the consequence of quantum decoherence on a superposition state?"
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">Answer Options</label>
                <div className="flex items-center space-x-2">
                  <span className="w-6 text-center font-bold text-xs text-cyan-400 font-mono">A</span>
                  <input
                    type="text"
                    required
                    placeholder="Option A text..."
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 text-center font-bold text-xs text-cyan-400 font-mono">B</span>
                  <input
                    type="text"
                    required
                    placeholder="Option B text..."
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 text-center font-bold text-xs text-cyan-400 font-mono">C</span>
                  <input
                    type="text"
                    placeholder="Option C text..."
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 text-center font-bold text-xs text-cyan-400 font-mono">D</span>
                  <input
                    type="text"
                    placeholder="Option D text..."
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Correct Answer</label>
                  <select
                    value={correctOpt}
                    onChange={(e) => setCorrectOpt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Timer (sec)</label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 30)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Points</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
