// JARVIS EDUCATION OS — PHASE D.14: STUDENT LIVE CLASSROOM SURFACE
// Focused, unified live classroom environment integrating SmartBoard, Quiz, Notes, Resources, Community, and Bounded Ask Jarvis

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import { authClient } from '../../../services/authClient.ts';

import type {
  LiveClassroomState,
  LiveConnectionState,
  LiveClassroomTab,
  LiveClassroomTimelineEvent,
  AskLiveClassResponse
} from '../../../types/liveClassroom.ts';
import {
  Radio,
  Wifi,
  WifiOff,
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  MessageSquare,
  FileCheck2,
  Clock,
  ArrowLeft,
  Timer,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Maximize2,
  Download,
  Share2,
  Play,
  RotateCcw,
  Zap,
  Bookmark,
  Check
} from 'lucide-react';

interface StudentLiveClassroomViewProps {
  classes: EducationClass[];
  currentClassId?: string;
  onBackToHome: () => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const StudentLiveClassroomView: React.FC<StudentLiveClassroomViewProps> = ({
  classes,
  currentClassId = 'class-phys-301',
  onBackToHome,
  onNavigateToContext
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(currentClassId);
  const [classroomState, setClassroomState] = useState<LiveClassroomState | null>(null);
  const [activeTab, setActiveTab] = useState<LiveClassroomTab>('ask_jarvis');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [displayMode, setDisplayMode] = useState<'board' | 'presentation'>('board');

  // Realtime Connection State
  const [connectionState, setConnectionState] = useState<LiveConnectionState>('CONNECTING');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Student In-Class Notes State
  const [notesContent, setNotesContent] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState<string | null>(null);

  // Bounded Ask Jarvis State
  const [jarvisQuery, setJarvisQuery] = useState<string>('');
  const [isAskingJarvis, setIsAskingJarvis] = useState<boolean>(false);
  const [jarvisHistory, setJarvisHistory] = useState<Array<{ query: string; response: AskLiveClassResponse }>>([]);

  // Live Quiz Submission State
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizFeedback, setQuizFeedback] = useState<{ isCorrect: boolean; points: number } | null>(null);

  // Class Discussion Quick Input
  const [discussionInput, setDiscussionInput] = useState<string>('');
  const [discussionMessages, setDiscussionMessages] = useState<Array<{ id: string; authorName: string; content: string; timestamp: string }>>([]);

  // EventSource stream ref
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notesDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0] || {
    id: 'class-phys-301',
    name: 'Advanced Quantum & Classical Electrodynamics',
    code: 'PHYS-301',
    room: 'Quantum Hall 4B',
    instructorName: 'Dr. Helen Cho'
  };

  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 4000);
  }, []);

  // 1. Fetch Canonical Live Classroom State
  const fetchLiveState = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/education/live-classroom/${selectedClassId}`, {
        headers: { ...authClient.getAuthHeaders() }
      });

      if (res.ok) {
        const data = await res.json();
        setClassroomState(data.state);
        setConnectionState('CONNECTED');
        if (data.state.studentNotes?.content && !notesContent) {
          setNotesContent(data.state.studentNotes.content);
        }
        if (data.state.discussion?.recentMessages) {
          setDiscussionMessages(data.state.discussion.recentMessages);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || 'Failed to load classroom session.');
        setConnectionState('DISCONNECTED');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error connecting to classroom.');
      setConnectionState('DISCONNECTED');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchLiveState();
  }, [fetchLiveState]);

  // 2. Realtime SSE Connection with Auto-Reconnect Resiliency
  useEffect(() => {
    let isCancelled = false;

    const connectSSE = async () => {
      if (isCancelled) return;
      setConnectionState('CONNECTING');
      const ticket = await authClient.getSSETicket('class', 'session-phys-101');
      if (!ticket || isCancelled) return;
      const sseUrl = `/api/classroom/sessions/session-phys-101/stream?workspaceId=ws-stark-core&ticket=${ticket}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isCancelled) {
          setConnectionState('CONNECTED');
        }
      };

      es.onerror = () => {
        if (!isCancelled) {
          setConnectionState('RECONNECTING');
          es.close();
          // Exponential backoff reconnect
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, 3000);
        }
      };

      es.addEventListener('classroom.board.state.changed', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.boardState?.activeSlideIndex !== undefined) {
            setSelectedPageIndex(payload.boardState.activeSlideIndex);
          }
          fetchLiveState();
        } catch {}
      });

      es.addEventListener('quiz.started', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          showNotice(`Teacher launched quiz: "${payload.quiz?.title || 'Checkpoint'}"`);
          setActiveTab('quiz');
          setQuizSubmitted(false);
          setQuizFeedback(null);
          fetchLiveState();
        } catch {}
      });

      es.addEventListener('quiz.question.locked', (e: MessageEvent) => {
        try {
          showNotice('Teacher locked quiz question. Reviewing answers.');
          fetchLiveState();
        } catch {}
      });

      es.addEventListener('classroom.session.ended', () => {
        showNotice('Classroom session has concluded.');
        fetchLiveState();
      });
    };

    connectSSE();

    return () => {
      isCancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [selectedClassId, fetchLiveState, showNotice]);

  // 3. Save Private Student Notes (Debounced)
  const handleNotesChange = (text: string) => {
    setNotesContent(text);
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);

    notesDebounceRef.current = setTimeout(async () => {
      setIsSavingNotes(true);
      try {
        const res = await fetch(`/api/education/live-classroom/${selectedClassId}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authClient.getAuthHeaders(),
            
          },
          body: JSON.stringify({
            sessionId: classroomState?.academicContext.classSessionId,
            lessonId: classroomState?.academicContext.lessonId,
            boardDocumentId: classroomState?.currentBoardPage?.boardDocumentId,
            pageIndex: selectedPageIndex,
            content: text
          })
        });
        if (res.ok) {
          setNotesSavedNotice('Auto-saved to Workspace');
          setTimeout(() => setNotesSavedNotice(null), 3000);
        }
      } catch {
        // Safe offline catch
      } finally {
        setIsSavingNotes(false);
      }
    }, 1000);
  };

  // 4. Bounded Ask Jarvis Execution
  const handleAskJarvis = async (qPrompt?: string) => {
    const query = qPrompt || jarvisQuery;
    if (!query.trim()) return;

    setIsAskingJarvis(true);
    setJarvisQuery('');
    try {
      const res = await fetch(`/api/education/live-classroom/${selectedClassId}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
          
        },
        body: JSON.stringify({
          query,
          sessionId: classroomState?.academicContext.classSessionId,
          boardDocumentId: classroomState?.currentBoardPage?.boardDocumentId,
          pageIndex: selectedPageIndex,
          lessonId: classroomState?.academicContext.lessonId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setJarvisHistory((prev) => [...prev, { query, response: data }]);
      } else {
        const err = await res.json().catch(() => ({}));
        showNotice(err.error || 'Unable to process question.');
      }
    } catch {
      showNotice('Tutor query error. Please retry.');
    } finally {
      setIsAskingJarvis(false);
    }
  };

  // 5. Submit Formative Live Quiz Option
  const handleSubmitQuiz = async () => {
    if (selectedOption === null || !classroomState?.activeQuiz?.currentQuestion) return;

    setIsSubmittingQuiz(true);
    try {
      const res = await fetch(`/api/education/live-classroom/${selectedClassId}/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
          
        },
        body: JSON.stringify({
          quizId: classroomState.activeQuiz.id,
          questionId: classroomState.activeQuiz.currentQuestion.id,
          selectedOptionIndex: selectedOption
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQuizSubmitted(true);
        setQuizFeedback({
          isCorrect: data.isCorrect,
          points: data.pointsAwarded
        });
        showNotice('Quiz answer recorded!');
      }
    } catch {
      showNotice('Submission failed.');
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // 6. Post Class Discussion Message
  const handleSendDiscussion = () => {
    if (!discussionInput.trim()) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      authorName: 'Alex Chen (You)',
      content: discussionInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setDiscussionMessages((prev) => [...prev, newMsg]);
    setDiscussionInput('');
  };

  const isLive = classroomState?.sessionStatus === 'live';
  const isCompleted = classroomState?.sessionStatus === 'completed';
  const activeBoard = classroomState?.currentBoardPage;
  const boardHistory = classroomState?.releasedBoardHistory || [];

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans pb-10">
      {/* 1. Header Bar & Connection HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Leave Class</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span className="font-bold">{selectedClass.code}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300 truncate">
                {classroomState?.academicContext.lessonTitle || 'Live Lecture Session'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              {selectedClass.instructorName} · {selectedClass.room}
            </div>
          </div>
        </div>

        {/* Realtime Connection & Status Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Connection State Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-black/40 text-xs font-mono">
            {connectionState === 'CONNECTED' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="text-emerald-300 font-bold text-[11px]">CONNECTED</span>
              </>
            ) : connectionState === 'RECONNECTING' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span className="text-amber-300 text-[11px]">RECONNECTING...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300 text-[11px]">OFFLINE</span>
              </>
            )}
          </div>

          {/* Session Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-200 font-bold uppercase text-[11px]">
              {classroomState?.sessionStatus || 'LIVE CLASS'}
            </span>
          </div>

          {/* Focus Sanctuary Jump */}
          {onNavigateToContext && (
            <button
              onClick={() => onNavigateToContext('focus', classroomState?.academicContext)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 hover:bg-amber-900/40 text-amber-200 text-xs font-mono transition-colors cursor-pointer"
              title="Start focused study session"
            >
              <Timer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Focus (25m)</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Toast */}
      {statusNotice && (
        <div className="p-3 rounded-xl border border-cyan-500/40 bg-cyan-950/70 text-cyan-200 text-xs font-mono flex items-center gap-2 animate-fade-in shadow-lg">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/70 text-rose-200 text-xs font-mono flex items-center gap-2 animate-fade-in shadow-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Post-Class Transition Banner (When class is completed) */}
      {isCompleted && (
        <div className="p-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-black p-6 backdrop-blur-md shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center gap-2.5 text-emerald-400 font-mono text-sm font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Class Completed — Great Session Today!</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed max-w-2xl">
            Dr. Helen Cho concluded the live session. Today's whiteboard derivations, structured formulas, and notes are securely preserved in your learning ledger.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={() => setActiveTab('notes')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 hover:bg-emerald-500/30 text-emerald-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Review My Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('ask_jarvis')}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Jarvis to Summarize</span>
            </button>

            {onNavigateToContext && (
              <>
                <button
                  onClick={() => onNavigateToContext('lesson_practice', classroomState?.academicContext)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Practice Questions</span>
                </button>

                <button
                  onClick={() => onNavigateToContext('assignments', classroomState?.academicContext)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Homework Assignment</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Live Classroom Stage & Side Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CENTER STAGE: Teacher Presentation & SmartBoard Canvas (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[500px]">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

            {/* Stage Top Bar: Page Selector & Presentation Toggle */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold">
                  {displayMode === 'board' ? 'LIVE SMARTBOARD' : 'PRESENTATION SLIDE'}
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  Page {selectedPageIndex + 1} of {Math.max(boardHistory.length, 1)}
                </span>
              </div>

              {/* Board Page Selector Pills */}
              <div className="flex items-center gap-1.5">
                {boardHistory.map((p, idx) => (
                  <button
                    key={p.pageId}
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                      selectedPageIndex === idx
                        ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    P{idx + 1}
                  </button>
                ))}

                <button
                  onClick={() => setDisplayMode(displayMode === 'board' ? 'presentation' : 'board')}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors ml-1 cursor-pointer"
                >
                  Toggle View
                </button>
              </div>
            </div>

            {/* Board Derivation Canvas Stage */}
            <div className="relative z-10 py-6 my-auto max-w-2xl mx-auto w-full space-y-5">
              {displayMode === 'board' ? (
                <div className="space-y-4">
                  {/* Topic Header */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
                      Derivation Topic · Page {selectedPageIndex + 1}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {boardHistory[selectedPageIndex]?.title || 'Quantum Harmonic Ladder Operator Dynamics'}
                    </h2>
                  </div>

                  {/* Mathematical Derivation Box */}
                  <div className="p-5 rounded-xl border border-cyan-500/30 bg-black/60 font-mono text-xs sm:text-sm text-cyan-100 space-y-3 leading-relaxed shadow-inner">
                    <div className="flex items-center justify-between text-[11px] text-cyan-400/70 border-b border-cyan-500/20 pb-2">
                      <span>WHITEBOARD MATHEMATICS</span>
                      <span className="text-emerald-400 font-semibold">● Live Teacher Broadcast</span>
                    </div>

                    <div className="space-y-2 pt-1 font-mono">
                      <div className="text-slate-300">1. Dimensionless ladder operator definition:</div>
                      <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 font-bold">
                        a = (mω x + i p) / √(2ħmω)
                      </div>
                      <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 font-bold">
                        a† = (mω x - i p) / √(2ħmω)
                      </div>

                      <div className="text-slate-300 pt-2">2. Fundamental Commutator Verification:</div>
                      <div className="p-2.5 rounded bg-blue-950/40 border border-blue-500/30 text-blue-200 font-bold">
                        [a, a†] = a a† - a† a = 1
                      </div>

                      <div className="text-slate-300 pt-2">3. Hamiltonian in terms of number operator N = a† a:</div>
                      <div className="p-2.5 rounded bg-slate-900 border border-slate-700 text-amber-200 font-bold">
                        H = ħω (a† a + 1/2) = ħω (N + 1/2)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Provenance: SmartBoard bdoc-phys-101 · Page {selectedPageIndex + 1}</span>
                    <span className="text-cyan-400">Authenticated & Released</span>
                  </div>
                </div>
              ) : (
                /* Slide Presentation View */
                <div className="space-y-4">
                  <div className="p-6 rounded-xl border border-slate-700 bg-slate-900/90 text-left space-y-3">
                    <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                      Lecture Slide 1 of 4
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      Harmonic Oscillator Eigenvalues & Zero-Point Energy
                    </h3>
                    <ul className="space-y-2 text-xs font-mono text-slate-300 list-disc list-inside">
                      <li>The ground state satisfies a|0⟩ = 0 with ground energy E₀ = 1/2 ħω.</li>
                      <li>Excited states are constructed via |n⟩ = (a†)ⁿ / √(n!) |0⟩.</li>
                      <li>Evenly spaced energy levels ΔE = ħω represent discrete quanta.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Stage Bottom Bar: Fast Actions */}
            <div className="relative z-10 border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span>Active Lesson: <strong>Creation & Annihilation Operators</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleAskJarvis('Explain the steps on this board page')}
                  className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explain Page</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECONDARY DOCK: In-Class Learning Tools (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dock Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-md text-xs font-mono">
            <button
              onClick={() => setActiveTab('ask_jarvis')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'ask_jarvis'
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ask Jarvis</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'quiz'
                  ? 'bg-indigo-500/20 border border-indigo-400/50 text-indigo-200 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quiz</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('resources')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'resources'
                  ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Resources</span>
            </button>

            <button
              onClick={() => setActiveTab('discussion')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'discussion'
                  ? 'bg-purple-500/20 border border-purple-400/50 text-purple-200 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>Class</span>
            </button>
          </div>

          {/* TAB 1: ASK JARVIS (Bounded AI In-Class Tutor) */}
          {activeTab === 'ask_jarvis' && (
            <div className="p-4 rounded-2xl border border-cyan-500/20 bg-slate-900/70 backdrop-blur-md shadow-xl space-y-4 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                    Classroom AI Tutor
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400/70">Bounded to Page {selectedPageIndex + 1}</span>
              </div>

              {/* Suggested Quick Prompts */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400">Suggested Inquiries:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'What did the teacher explain here?',
                    'Explain this equation',
                    'Give me a simple example',
                    'Summarize today\'s class'
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskJarvis(p)}
                      disabled={isAskingJarvis}
                      className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-cyan-200 text-slate-300 text-[11px] font-mono transition-colors cursor-pointer text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat History */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {jarvisHistory.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-800/80 text-cyan-200 font-mono text-[11px]">
                      <strong>You:</strong> {item.query}
                    </div>
                    <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 text-slate-200 font-sans leading-relaxed text-xs space-y-2">
                      <div className="whitespace-pre-line">{item.response.answer}</div>
                      {item.response.citedFormulas && item.response.citedFormulas.length > 0 && (
                        <div className="text-[10px] font-mono text-cyan-300 pt-1 border-t border-cyan-500/15 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-cyan-400" />
                          <span>Grounded in Board Formulas: {item.response.citedFormulas.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {jarvisHistory.length === 0 && !isAskingJarvis && (
                  <div className="text-center py-6 text-xs text-slate-400 font-mono space-y-1">
                    <HelpCircle className="w-6 h-6 text-slate-600 mx-auto" />
                    <div>Ask any question about today's whiteboard derivation.</div>
                  </div>
                )}

                {isAskingJarvis && (
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>J.A.R.V.I.S. is synthesizing pedagogical explanation...</span>
                  </div>
                )}
              </div>

              {/* Query Input */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={jarvisQuery}
                  onChange={(e) => setJarvisQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskJarvis()}
                  placeholder="Ask about formulas, steps, or derivations..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-black text-slate-200 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                />
                <button
                  onClick={() => handleAskJarvis()}
                  disabled={isAskingJarvis || !jarvisQuery.trim()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE QUIZ / PRACTICE */}
          {activeTab === 'quiz' && (
            <div className="p-4 rounded-2xl border border-indigo-500/20 bg-slate-900/70 backdrop-blur-md shadow-xl space-y-4 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                    In-Class Checkpoint
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300">Live Formative Poll</span>
              </div>

              {classroomState?.activeQuiz?.currentQuestion ? (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-3.5 rounded-xl border border-slate-700 bg-black/60 text-slate-100 font-sans text-sm leading-relaxed">
                    <strong>Question:</strong> {classroomState.activeQuiz.currentQuestion.questionText}
                  </div>

                  <div className="space-y-2">
                    {classroomState.activeQuiz.currentQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => !quizSubmitted && setSelectedOption(idx)}
                        disabled={quizSubmitted}
                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedOption === idx
                            ? 'border-indigo-400 bg-indigo-950/40 text-indigo-100 font-bold'
                            : 'border-slate-800 bg-slate-800/60 hover:border-slate-700 text-slate-300'
                        } ${quizSubmitted && idx === 1 ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200' : ''}`}
                      >
                        <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                        {selectedOption === idx && <Check className="w-4 h-4 text-indigo-400" />}
                      </button>
                    ))}
                  </div>

                  {!quizSubmitted ? (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={selectedOption === null || isSubmittingQuiz}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-indigo-600/20"
                    >
                      {isSubmittingQuiz ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 text-xs font-mono space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Response Submitted (+{quizFeedback?.points || 10} pts)</span>
                      </div>
                      <div className="text-slate-300 font-sans text-[11px]">
                        Correct answer: [a, a†] = 1. The commutator generates the ladder operator step.
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-400 font-mono space-y-2">
                  <Clock className="w-6 h-6 text-slate-600 mx-auto" />
                  <div>No live checkpoint currently active.</div>
                  <div className="text-[11px] text-slate-500">The teacher will dispatch questions during lecture.</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRIVATE STUDENT NOTES */}
          {activeTab === 'notes' && (
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-slate-900/70 backdrop-blur-md shadow-xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                    My Private In-Class Notes
                  </span>
                </div>
                <div className="text-[10px] font-mono text-emerald-400/80">
                  {isSavingNotes ? 'Saving...' : notesSavedNotice || 'Linked to Board Page ' + (selectedPageIndex + 1)}
                </div>
              </div>

              <textarea
                value={notesContent}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Write your private notes, questions, and observations here... (Auto-saves to My Workspace)"
                rows={10}
                className="w-full p-3 rounded-xl border border-slate-700 bg-black/60 text-slate-200 text-xs font-mono focus:border-emerald-400 focus:outline-none leading-relaxed resize-none"
              />

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Preserves links: Board Page {selectedPageIndex + 1} · PHYS-301</span>
                <span>Private to Cadet Alex Chen</span>
              </div>
            </div>
          )}

          {/* TAB 4: RELEASED RESOURCES */}
          {activeTab === 'resources' && (
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-slate-900/70 backdrop-blur-md shadow-xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                    Released Lesson Resources
                  </span>
                </div>
                <span className="text-[10px] font-mono text-amber-400/80">Authorized Access</span>
              </div>

              <div className="space-y-2">
                {(classroomState?.releasedResources || []).map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-800/50 hover:border-slate-700 transition-all flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-slate-200 truncate">{res.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{res.preview}</div>
                    </div>
                    <button
                      onClick={() => showNotice(`Opened resource: "${res.title}"`)}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0 cursor-pointer"
                      title="View Resource"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CLASS DISCUSSION */}
          {activeTab === 'discussion' && (
            <div className="p-4 rounded-2xl border border-purple-500/20 bg-slate-900/70 backdrop-blur-md shadow-xl space-y-3 font-sans">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
                    Classroom Comm Link
                  </span>
                </div>
                <span className="text-[10px] font-mono text-purple-300">#live-discussion</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {discussionMessages.map((msg) => (
                  <div key={msg.id} className="p-2.5 rounded-lg bg-slate-800/60 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-purple-300">{msg.authorName}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="text-slate-200 font-sans">{msg.content}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={discussionInput}
                  onChange={(e) => setDiscussionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendDiscussion()}
                  placeholder="Post a question or comment to the class..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-black text-slate-200 text-xs font-mono focus:border-purple-400 focus:outline-none"
                />
                <button
                  onClick={handleSendDiscussion}
                  disabled={!discussionInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-400/40 hover:bg-purple-500/30 text-purple-200 text-xs font-mono font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
