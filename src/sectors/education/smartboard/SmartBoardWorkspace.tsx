import React, { useState, useEffect, useCallback } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import type { ClassSession } from '../../../types/classSession.ts';
import type { SmartBoardDevice, BoardDocument, SmartBoardSurfaceTab } from '../../../types/smartboard.ts';
import { SmartBoardCanvas } from './SmartBoardCanvas.tsx';
import { SmartQuizSmartBoardView } from '../components/SmartQuizSmartBoardView.tsx';
import type { Quiz, QuizQuestion, QuestionAggregate, QuizResults } from '../../../types/quiz.ts';
import {
  Tv,
  Presentation,
  PenTool,
  HelpCircle,
  Video,
  BookOpen,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  CheckCircle2,
  Radio,
  Clock,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Share2,
  FileCheck2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface SmartBoardWorkspaceProps {
  boardId?: string;
  sessionId?: string;
  currentRole: EducationRole;
  onBack: () => void;
  onCompleteClass?: () => void;
}

export const SmartBoardWorkspace: React.FC<SmartBoardWorkspaceProps> = ({
  boardId = 'board-phys-01',
  sessionId = 'session-phys-101',
  currentRole,
  onBack,
  onCompleteClass
}) => {
  const [activeTab, setActiveTab] = useState<SmartBoardSurfaceTab>('board');
  const [boardDevice, setBoardDevice] = useState<SmartBoardDevice | null>(null);
  const [session, setSession] = useState<ClassSession | null>(null);
  const [boardDocument, setBoardDocument] = useState<BoardDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isReleased, setIsReleased] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState<QuizQuestion | null>(null);
  const [quizAggregate, setQuizAggregate] = useState<QuestionAggregate | null>(null);

  // AI Copilot state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Hydrate Board, Session, and Document
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetch(`/api/education/smartboard/devices/${boardId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/education/sessions/${sessionId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/education/smartboard/sessions/${sessionId}/document`).then((r) => (r.ok ? r.json() : null))
    ])
      .then(([boardData, sessionData, docData]) => {
        if (!isMounted) return;
        if (boardData?.device) setBoardDevice(boardData.device);
        if (sessionData?.session) setSession(sessionData.session);
        if (docData?.document) {
          setBoardDocument(docData.document);
          setIsReleased(docData.document.isReleasedToStudents);
        }
      })
      .catch((err) => console.warn('Could not hydrate SmartBoard workspace:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [boardId, sessionId]);

  // Session clock timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Autosave handler
  const handleAutosave = async (updatedDoc: BoardDocument) => {
    try {
      const res = await fetch(`/api/education/smartboard/documents/${updatedDoc.id}/autosave`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: updatedDoc.pages,
          activePageIndex: updatedDoc.activePageIndex,
          title: updatedDoc.title,
          expectedVersion: updatedDoc.version
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.document) {
          setBoardDocument(data.document);
        }
      }
    } catch (err) {
      console.warn('Autosave sync failed:', err);
    }
  };

  // Release to Students toggle
  const handleToggleRelease = async () => {
    if (!boardDocument) return;
    const targetState = !isReleased;

    try {
      const res = await fetch(`/api/education/smartboard/documents/${boardDocument.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReleased: targetState })
      });
      if (res.ok) {
        setIsReleased(targetState);
        showNotice(targetState ? 'Board notes released to enrolled cadets.' : 'Board notes unreleased (private).');
      }
    } catch {
      showNotice('Failed to update release state.');
    }
  };

  // Complete class session
  const handleCompleteClass = async () => {
    try {
      await fetch(`/api/education/smartboard/devices/${boardId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      showNotice('Class session completed. Board Document archived into Board History.');
      if (onCompleteClass) {
        onCompleteClass();
      } else {
        onBack();
      }
    } catch {
      showNotice('Failed to complete session.');
    }
  };

  // Trigger Jarvis AI Copilot
  const handleAskJarvis = async (customPrompt?: string) => {
    const p = customPrompt || aiPrompt;
    if (!p.trim()) return;
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: p }],
          context: {
            activeSector: 'education',
            topic: session?.topic,
            courseCode: session?.courseCode,
            lesson: session?.lessonTitle
          }
        })
      });

      const data = await res.json();
      setAiOutput(data.reply || 'Directive acknowledged, sir.');
    } catch {
      setAiOutput('Grounded pedagogical assistance unavailable in offline mode.');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] text-cyan-400 font-mono text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span>Initializing SmartBoard OS physical surface...</span>
      </div>
    );
  }

  const isTeacher = currentRole === 'teacher';

  return (
    <div className="flex flex-col h-full w-full bg-black text-slate-100 overflow-hidden select-none">
      {/* 1. Universal Top Teaching HUD */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-b border-cyan-500/30 z-30 shrink-0">
        {/* Left: Device & Session Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
            title="Return to Education OS"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-500/40">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>LIVE</span>
            </span>
            <span className="font-bold text-white text-sm">
              {session?.courseCode || 'PHYS-301'}: {session?.topic || 'Electrostatics'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 pl-2 border-l border-slate-800">
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span>{boardDevice?.displayName || 'SmartBoard 01'}</span>
            <span className="text-slate-600">·</span>
            <span>{boardDevice?.classroomName || 'Physics Lab'}</span>
          </div>
        </div>

        {/* Center: Surface Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs font-mono">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'board'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setActiveTab('session')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'session'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Session</span>
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'quiz'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Quiz</span>
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'video'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Sources</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Jarvis AI</span>
          </button>
        </div>

        {/* Right: Timer, Release Controls, and Complete */}
        <div className="flex items-center gap-2">
          {/* Active Lecture Timer */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white">{formatTimer(timerSeconds)}</span>
            <button
              onClick={() => setIsTimerRunning((r) => !r)}
              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
            >
              {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>

          {/* Release to Students Toggle (Teachers only) */}
          {isTeacher && (
            <button
              onClick={handleToggleRelease}
              className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition-all cursor-pointer ${
                isReleased
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Toggle whether board history is published to enrolled students"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{isReleased ? 'Released' : 'Private'}</span>
            </button>
          )}

          {/* Complete Class (Teachers only) */}
          {isTeacher && (
            <button
              onClick={handleCompleteClass}
              className="px-3.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              End Class
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
            title="Toggle Fullscreen SmartBoard"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {notice && (
        <div className="bg-cyan-500/90 text-black font-mono text-xs px-4 py-1 text-center font-bold animate-pulse z-40">
          {notice}
        </div>
      )}

      {/* 2. Main Content Surface Area */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'board' && (
          <div className="w-full h-full">
            {boardDocument ? (
              <SmartBoardCanvas
                document={boardDocument}
                onAutosave={handleAutosave}
                isReadOnly={!isTeacher}
              />
            ) : (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                Initializing structured board canvas...
              </div>
            )}
          </div>
        )}

        {activeTab === 'session' && (
          <div className="w-full h-full overflow-y-auto p-6 sm:p-10 max-w-5xl mx-auto space-y-6">
            {/* Session Objectives Banner */}
            <div className="p-6 rounded-3xl bg-slate-950/80 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  Instructional Roadmap · {session?.durationMinutes || 45} Minutes
                </span>
                <span className="text-xs font-mono text-slate-400">Instructor: {session?.teacherName || 'Dr. Helen Cho'}</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">{session?.lessonPlan?.title || session?.topic}</h2>

              {/* Objectives list */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-mono uppercase text-slate-400">Core Learning Objectives</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {session?.lessonPlan?.learningObjectives.map((obj, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                      <span className="text-xs font-mono font-bold text-cyan-400">0{i + 1}.</span>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed">{obj}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Opening Warmup & Spark */}
            {session?.lessonPlan?.openingWarmup && (
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span>5-MINUTE WARMUP & CLASS SPARK</span>
                </div>
                <p className="text-sm text-white font-medium">{session.lessonPlan.openingWarmup.prompt}</p>
                <p className="text-xs text-amber-200/80 font-sans">{session.lessonPlan.openingWarmup.instructions}</p>
              </div>
            )}

            {/* Teaching Sequence Stages */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Teaching Sequence</h3>
              <div className="space-y-3">
                {session?.lessonPlan?.teachingSequence.map((stage, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">{stage.durationMinutes}m</span>
                        <span className="font-bold text-white text-sm">{stage.stage}</span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans">{stage.teacherActivity}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 sm:max-w-xs text-xs space-y-0.5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Check for Understanding:</span>
                      <p className="text-slate-200">{stage.checkPoint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exit Ticket */}
            {session?.lessonPlan?.exitTicket && (
              <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
                  <FileCheck2 className="w-4 h-4" />
                  <span>SESSION EXIT TICKET</span>
                </div>
                <p className="text-sm text-white font-medium">{session.lessonPlan.exitTicket.prompt}</p>
                <p className="text-xs text-cyan-200/80 font-mono">Criteria: {session.lessonPlan.exitTicket.expectedCriteria}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="w-full h-full overflow-y-auto p-6 flex flex-col items-center justify-center">
            {session?.quiz ? (
              <div className="w-full max-w-4xl space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white">{session.quiz.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">{session.quiz.questions.length} Formative Check Questions</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                    Live Response Ready
                  </span>
                </div>

                {/* Formative Question Cards */}
                <div className="space-y-4">
                  {session.quiz.questions.map((q, idx) => (
                    <div key={q.id || idx} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-cyan-400 font-bold">Question {idx + 1} of {session.quiz?.questions.length}</span>
                        <span className="text-slate-400 uppercase">{q.type} · {q.difficulty}</span>
                      </div>
                      <p className="text-base font-medium text-white">{q.question}</p>

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs font-mono text-slate-500">
                No active formative quiz attached to this session.
              </div>
            )}
          </div>
        )}

        {activeTab === 'video' && (
          <div className="w-full h-full p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-3xl rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Lecture Media & Simulation Feed</h3>
              <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
                Curriculum video player linked to Faraday's Law and Gauss Surface Flux demonstrations.
              </p>
              <div className="p-4 rounded-2xl bg-black/60 border border-slate-800 text-xs font-mono text-slate-400">
                NCERT 3D Electric Dipole Vector Simulation · 1080p 60fps
              </div>
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="w-full h-full overflow-y-auto p-6 sm:p-10 max-w-4xl mx-auto space-y-4">
            <h3 className="text-sm font-mono text-cyan-400 uppercase tracking-wider">Verified Source Materials</h3>
            <div className="space-y-3">
              {session?.sourceMaterials.map((src) => (
                <div key={src.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">{src.title}</span>
                    <span className="text-slate-500">{src.fileSize || '3.2 MB'}</span>
                  </div>
                  {src.extractedTextSnippet && (
                    <p className="text-xs text-slate-300 font-sans bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      "{src.extractedTextSnippet}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="w-full h-full overflow-y-auto p-6 sm:p-10 max-w-3xl mx-auto space-y-5">
            <div className="p-6 rounded-3xl bg-slate-950 border border-cyan-500/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-300 font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Jarvis SmartBoard Pedagogical Assistant</span>
              </div>
              <p className="text-xs text-slate-300 font-sans">
                Grounded in the approved lesson plan for <span className="font-mono text-cyan-300">{session?.topic}</span>. Ask for step-by-step mathematical derivations, misconception explanations, or diagnostic variations.
              </p>

              {/* Quick Prompt Suggestions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleAskJarvis("Derive the electric field of an infinite cylindrical wire using Gauss's Law with full steps.")}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 text-xs font-mono cursor-pointer"
                >
                  ⚡ Derive Infinite Line Charge
                </button>
                <button
                  onClick={() => handleAskJarvis("Explain the common student misconception that electric field lines can intersect.")}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs font-mono cursor-pointer"
                >
                  ⚠️ Explain Intersection Misconception
                </button>
                <button
                  onClick={() => handleAskJarvis("Provide a 1-minute quick numerical check on Gaussian flux.")}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-purple-300 text-xs font-mono cursor-pointer"
                >
                  🔢 Quick Numerical Check
                </button>
              </div>

              {/* Input box */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Ask Jarvis pedagogical copilot..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskJarvis()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => handleAskJarvis()}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs cursor-pointer disabled:opacity-40"
                >
                  {isAiLoading ? 'Analyzing...' : 'Ask'}
                </button>
              </div>

              {/* Output Display */}
              {aiOutput && (
                <div className="p-4 rounded-2xl bg-black/80 border border-cyan-500/30 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
                  {aiOutput}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
