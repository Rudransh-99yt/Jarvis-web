import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EducationRole, EducationClass } from '../../../types/education.ts';
import type {
  ClassroomSession,
  ClassroomParticipant,
  SmartBoardStateType,
  RemoteDeviceType
} from '../../../types/classroom.ts';
import type { Quiz, QuizQuestion, QuestionAggregate, QuizResults } from '../../../types/quiz.ts';
import { SmartQuizTeacherPanel } from '../components/SmartQuizTeacherPanel.tsx';
import { SmartQuizSmartBoardView } from '../components/SmartQuizSmartBoardView.tsx';
import { SmartQuizStudentRemote } from '../components/SmartQuizStudentRemote.tsx';
import {
  Radio,
  Play,
  Pause,
  Square,
  Users,
  Tv,
  Maximize2,
  Minimize2,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  Smartphone,
  Tablet,
  Send,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface SmartClassroomViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
}

export const SmartClassroomView: React.FC<SmartClassroomViewProps> = ({ classes, currentRole }) => {
  // Course selection
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes.length > 0 ? classes[0].id : 'class-phys-301'
  );
  const selectedClass = classes.find((c) => c.id === selectedClassId) || {
    id: 'class-phys-301',
    name: 'Advanced Quantum Mechanics',
    code: 'PHYS-301',
    room: 'Hall C-104',
    schedule: 'Mon/Wed 10:00 - 11:30 AM',
    instructorName: 'Dr. Sarah',
    instructorId: 'teacher-1'
  };

  // Session & Board State
  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Student specific state
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [studentDevice, setStudentDevice] = useState<RemoteDeviceType>('software_remote');

  // Smart Board Mode (large-display friendly layout)
  const [isSmartBoardMode, setIsSmartBoardMode] = useState<boolean>(false);

  // Teacher Board Editor state
  const [newTopic, setNewTopic] = useState<string>('');
  const [newMessage, setNewMessage] = useState<string>('');
  const [selectedStateType, setSelectedStateType] = useState<SmartBoardStateType>('lesson');

  // Milestone 13: Smart Quiz State
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuizQuestion, setActiveQuizQuestion] = useState<QuizQuestion | null>(null);
  const [activeQuizAggregate, setActiveQuizAggregate] = useState<QuestionAggregate | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);

  // EventSource stream ref
  const eventSourceRef = useRef<EventSource | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser = {
    id: currentRole === 'student' ? 'student-1' : 'teacher-1',
    displayName: currentRole === 'student' ? 'Alex Chen' : 'Dr. Sarah',
    role: currentRole
  };

  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 4000);
  }, []);

  const handleQuizChange = useCallback((quiz: Quiz | null) => {
    setActiveQuiz(quiz);
  }, []);

  // 1. Fetch Active Session for selected class
  const fetchSessionData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/classroom/sessions/active?classId=${selectedClassId}&workspaceId=ws-stark-core`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
          setNewTopic(data.session.boardState?.currentTopic || '');
          setNewMessage(data.session.boardState?.message || '');
          setSelectedStateType(data.session.boardState?.state || 'lesson');

          // Fetch participants
          fetchParticipants(data.session.id);

          // Fetch active quiz for session
          try {
            const qRes = await fetch(`/api/classroom/quizzes?sessionId=${data.session.id}&classId=${selectedClassId}&workspaceId=ws-stark-core`, {
              headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
            });
            if (qRes.ok) {
              const qData = await qRes.json();
              const liveOrLatest = (qData.quizzes || []).find((q: Quiz) => q.status === 'live' || q.status === 'paused')
                || (qData.quizzes || [])[0] || null;
              setActiveQuiz(liveOrLatest);
              if (liveOrLatest) {
                const stateRes = await fetch(`/api/classroom/quizzes/${liveOrLatest.id}/active-question?workspaceId=ws-stark-core`, {
                  headers: { 'x-user-id': currentUser.id, 'x-user-role': currentUser.role }
                });
                if (stateRes.ok) {
                  const stateData = await stateRes.json();
                  setActiveQuizQuestion(stateData.currentQuestion);
                  setActiveQuizAggregate(stateData.aggregate);
                }
              }
            }
          } catch (qErr) {
            console.warn('Quiz discovery error:', qErr);
          }
        } else {
          setSession(null);
          setParticipants([]);
          setIsJoined(false);
          setActiveQuiz(null);
          setActiveQuizQuestion(null);
          setActiveQuizAggregate(null);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to query active session');
      }
    } catch (err: any) {
      console.warn('Classroom query error:', err);
      setErrorMessage(err.message || 'Network error querying classroom');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, currentRole]);

  // Fetch participant list
  const fetchParticipants = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/classroom/sessions/${sessionId}/presence?workspaceId=ws-stark-core`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        }
      });
      if (res.ok) {
        const data = await res.json();
        setParticipants(data.participants || []);
        if (currentRole === 'student') {
          const myself = (data.participants || []).find(
            (p: ClassroomParticipant) => p.studentId === currentUser.id && p.connectionStatus === 'connected'
          );
          setIsJoined(Boolean(myself));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch participants:', err);
    }
  };

  // Re-fetch when class changes
  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // 2. Setup Real-time SSE Stream & Heartbeat when session is active and (teacher OR joined student)
  useEffect(() => {
    if (!session || session.status === 'ended') {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      return;
    }

    const sessionId = session.id;

    // Connect SSE stream
    const sseUrl = `/api/classroom/sessions/${sessionId}/stream?workspaceId=ws-stark-core&userId=${currentUser.id}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.boardState) {
          setSession((prev) => (prev ? { ...prev, boardState: data.boardState, status: data.sessionStatus } : prev));
        }
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    });

    es.addEventListener('classroom.session.started', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSession(data);
        showNotice(`Classroom session is now LIVE!`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('classroom.session.paused', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSession(data);
        showNotice(`Classroom session has been paused by the instructor.`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('classroom.session.resumed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSession(data);
        showNotice(`Classroom session resumed.`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('classroom.session.ended', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setSession(data);
        setIsJoined(false);
        showNotice(`Classroom session has concluded.`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('classroom.student.joined', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const { participant, activeStudentCount } = payload;
        setParticipants((prev) => {
          const filtered = prev.filter((p) => p.studentId !== participant.studentId);
          return [...filtered, participant];
        });
        setSession((prev) => (prev ? { ...prev, activeStudentCount } : prev));
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('classroom.student.left', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const { participant, activeStudentCount } = payload;
        setParticipants((prev) =>
          prev.map((p) => (p.studentId === participant.studentId ? { ...p, connectionStatus: 'disconnected' } : p))
        );
        setSession((prev) => (prev ? { ...prev, activeStudentCount } : prev));
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('classroom.board.state.changed', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const { boardState } = payload;
        setSession((prev) => (prev ? { ...prev, boardState } : prev));
      } catch (err) {
        console.warn(err);
      }
    });

    // Milestone 13: Quiz Realtime SSE Listeners
    es.addEventListener('quiz.created', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        // Only set activeQuiz if there is currently NO active quiz or if the new quiz is live
        setActiveQuiz((prev) => {
          if (!prev) return payload.quiz;
          if (payload.quiz?.status === 'live') return payload.quiz;
          return prev;
        });
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.updated', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuiz((prev) => (prev && prev.id === payload.quiz.id ? payload.quiz : prev));
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.started', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuiz(payload.quiz);
        if (payload.activeQuestion) {
          setActiveQuizQuestion(payload.activeQuestion);
        }
        showNotice(`Smart Quiz "${payload.quiz.title}" is now LIVE!`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.question.started', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuizQuestion(payload.question);
        setActiveQuizAggregate(payload.aggregate);
        setActiveQuiz((prev) =>
          prev && prev.id === payload.quizId
            ? { ...prev, currentQuestionIndex: payload.currentQuestionIndex }
            : prev
        );
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.question.updated', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuizQuestion(payload.question);
        if (payload.aggregate) {
          setActiveQuizAggregate(payload.aggregate);
        }
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.response.accepted', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuizAggregate(payload.aggregate);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.question.locked', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuizAggregate(payload.aggregate);
        setActiveQuizQuestion((prev) =>
          prev ? { ...prev, status: 'locked', correctOption: payload.correctOption } : prev
        );
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.results.updated', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setQuizResults(payload.results);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.paused', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuiz((prev) => (prev && prev.id === payload.quiz.id ? payload.quiz : prev));
        showNotice(`Quiz "${payload.quiz.title}" is paused.`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.resumed', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuiz((prev) => (prev && prev.id === payload.quiz.id ? payload.quiz : prev));
        showNotice(`Quiz "${payload.quiz.title}" resumed!`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.completed', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuiz((prev) => (prev && prev.id === payload.quiz.id ? payload.quiz : prev));
        setQuizResults(payload.results);
        showNotice(`Quiz completed! Final class scores calculated.`);
      } catch (err) {
        console.warn(err);
      }
    });

    es.addEventListener('quiz.cancelled', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setActiveQuiz((prev) => (prev && prev.id === payload.quiz.id ? payload.quiz : prev));
        setActiveQuizQuestion(null);
        setActiveQuizAggregate(null);
        showNotice(`Quiz was cancelled.`);
      } catch (err) {
        console.warn(err);
      }
    });

    // Student Presence Heartbeat
    if (currentRole === 'student' && isJoined) {
      presenceIntervalRef.current = setInterval(async () => {
        try {
          await fetch(`/api/classroom/sessions/${sessionId}/presence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.id,
              'x-user-role': currentUser.role
            },
            body: JSON.stringify({ workspaceId: 'ws-stark-core' })
          });
        } catch (err) {
          console.warn('Presence heartbeat ping failed:', err);
        }
      }, 15000);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
    };
  }, [session?.id, session?.status, isJoined, currentRole]);

  // 3. Teacher Actions
  const handleCreateOrStartSession = async () => {
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      if (!session) {
        // Create live session
        const res = await fetch('/api/classroom/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
            'x-user-role': currentUser.role
          },
          body: JSON.stringify({
            classId: selectedClassId,
            workspaceId: 'ws-stark-core',
            title: `${selectedClass.code} Live Lecture: ${selectedClass.name}`,
            status: 'live',
            boardTopic: `${selectedClass.name} — Interactive Lecture`
          })
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          showNotice(`Smart Classroom session started for ${selectedClass.code}!`);
          fetchParticipants(data.session.id);
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorMessage(err.error?.message || 'Failed to initialize session');
        }
      } else {
        // Start or resume existing
        const endpoint = session.status === 'paused' ? 'resume' : 'start';
        const res = await fetch(`/api/classroom/sessions/${session.id}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser.id,
            'x-user-role': currentUser.role
          },
          body: JSON.stringify({ workspaceId: 'ws-stark-core' })
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          showNotice(`Session is now LIVE.`);
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorMessage(err.error?.message || 'Failed to start session');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Action failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePauseSession = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/sessions/${session.id}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        showNotice(`Session paused.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to pause session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    if (!confirm('Are you sure you want to conclude and end this Smart Classroom session?')) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/sessions/${session.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        showNotice(`Classroom session ended.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to end session');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateBoardState = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/sessions/${session.id}/state`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          state: selectedStateType,
          currentTopic: newTopic,
          message: newMessage,
          workspaceId: 'ws-stark-core'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSession((prev) => (prev ? { ...prev, boardState: data.boardState } : prev));
        showNotice(`Smart Board display updated!`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update board state');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 4. Student Actions
  const handleStudentJoin = async () => {
    if (!session) return;
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/classroom/sessions/${session.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({
          workspaceId: 'ws-stark-core',
          deviceType: studentDevice
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setIsJoined(true);
        showNotice(`Successfully connected to Smart Classroom!`);
        fetchParticipants(session.id);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error?.message || 'Failed to join session');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Join failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStudentLeave = async () => {
    if (!session) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/classroom/sessions/${session.id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
          'x-user-role': currentUser.role
        },
        body: JSON.stringify({ workspaceId: 'ws-stark-core' })
      });
      if (res.ok) {
        setIsJoined(false);
        showNotice(`Disconnected from classroom.`);
        fetchParticipants(session.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Leave failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // =========================================================================
  // VIEW: Smart Board Full Display Mode (Large-display / projector friendly)
  // =========================================================================
  if (isSmartBoardMode) {
    const isLive = session?.status === 'live';
    const boardState = session?.boardState || {
      state: 'waiting',
      currentTopic: selectedClass.name,
      message: 'Awaiting instructor live initiation.'
    };

    return (
      <div className="min-h-[82vh] rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 sm:p-10 flex flex-col justify-between shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden font-mono animate-fade-in">
        {/* Ambient Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-cyan-500/20 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-sm font-bold tracking-widest">
                {selectedClass.code}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
                {selectedClass.name}
              </h1>
            </div>
            <p className="text-xs text-cyan-400/70 tracking-wider">
              INSTRUCTOR: <strong className="text-cyan-200">{selectedClass.instructorName}</strong> • {selectedClass.room}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Indicator */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-black/60 border border-cyan-500/30">
              <span
                className={`h-3 w-3 rounded-full ${
                  isLive ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-amber-400'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
                {session?.status || 'OFFLINE'}
              </span>
            </div>

            {/* Cadet Roster Count */}
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg bg-cyan-950/40 border border-cyan-500/40">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-cyan-200">
                {participants.filter((p) => p.connectionStatus === 'connected').length} CADETS CONNECTED
              </span>
            </div>

            {/* Exit Smart Board Mode */}
            <button
              onClick={() => setIsSmartBoardMode(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 bg-black/60 hover:bg-cyan-500/10 text-xs text-cyan-300 transition-all"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Exit Board Mode</span>
            </button>
          </div>
        </div>

        {/* Center Stage Presentation Area */}
        {activeQuiz && (activeQuiz.status === 'live' || activeQuiz.status === 'paused' || activeQuiz.status === 'completed') ? (
          <div className="relative z-10 py-6 my-auto flex flex-col items-center w-full">
            <SmartQuizSmartBoardView
              quiz={activeQuiz}
              activeQuestion={activeQuizQuestion}
              aggregate={activeQuizAggregate}
              results={quizResults}
              activeStudentCount={participants.filter((p) => p.connectionStatus === 'connected').length}
            />
          </div>
        ) : (
          <div className="relative z-10 py-10 my-auto flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
            {/* State Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/50 bg-cyan-500/10 text-cyan-300 text-xs uppercase tracking-widest font-semibold shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>STATE: {boardState.state}</span>
            </div>

            {/* Current Topic */}
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-cyan-300 to-blue-200 leading-tight">
              {boardState.currentTopic || 'Session in Progress'}
            </h2>

            {/* Instructor Message / Slide Subtitle */}
            <p className="text-base sm:text-lg text-cyan-200/80 max-w-2xl font-sans leading-relaxed">
              {boardState.message || 'Please connect your software remote to participate in live classroom telemetry.'}
            </p>

            {/* Waiting or interactive indicator */}
            {boardState.state === 'waiting' && (
              <div className="flex items-center gap-3 pt-4 text-xs text-cyan-400/70 font-mono">
                <Clock className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Awaiting instructor to advance lesson protocol...</span>
              </div>
            )}

            {boardState.state === 'question' && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/20 text-amber-200 text-sm max-w-xl">
                <span className="font-bold">LIVE POLL / QUESTION DISPATCHED:</span> Remote keypads active.
              </div>
            )}
          </div>
        )}

        {/* Bottom Connected Cadets Ticker / Grid */}
        <div className="relative z-10 border-t border-cyan-500/20 pt-6">
          <div className="flex items-center justify-between mb-3 text-xs text-cyan-400/80 font-mono">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              REAL-TIME PARTICIPANT ROSTER
            </span>
            <span className="text-[10px] text-cyan-500/60">Auto-synced via Stark EventBus</span>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-4 text-xs text-cyan-400/50">
              No students currently connected to this session. Cadets can join using their software remote.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    p.connectionStatus === 'connected'
                      ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-200'
                      : 'border-white/10 bg-black/40 text-slate-500'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                  <span className="font-medium">{p.displayName}</span>
                  <span className="text-[10px] text-cyan-400/50 uppercase">[{p.deviceType}]</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: Standard Dashboard View (Teacher / Student Tabs)
  // =========================================================================
  const isLive = session?.status === 'live';
  const isPaused = session?.status === 'paused';
  const connectedCount = participants.filter((p) => p.connectionStatus === 'connected').length;

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner: Class Selector & Session Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-cyan-500/30 bg-black/60 p-4 rounded-xl backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
            <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              SMART CLASSROOM ENGINE
            </h1>
            <p className="text-xs text-cyan-400/70">
              Real-time teacher orchestration, smart board synchronization, and multi-student presence
            </p>
          </div>
        </div>

        {/* Class Selection Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-cyan-400/70">COURSE:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={isJoined || (currentRole === 'teacher' && isLive)}
            className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-slate-950 text-cyan-200 text-xs focus:border-cyan-400 focus:outline-none"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchSessionData}
            disabled={isLoading}
            title="Refresh session data"
            className="p-1.5 rounded-lg border border-cyan-500/20 bg-black/40 hover:bg-cyan-500/10 text-cyan-400"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/60 text-rose-200 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION A: TEACHER VIEW                                             */}
      {/* =================================================================== */}
      {currentRole === 'teacher' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Session Orchestrator & Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Session Status & Control Card */}
            <div className="rounded-xl border border-cyan-500/25 bg-slate-950/70 p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white tracking-wider">SESSION CONTROLS</h2>
                </div>

                {/* Session Status Pill */}
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isLive
                        ? 'bg-emerald-400 animate-pulse'
                        : isPaused
                        ? 'bg-amber-400'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-xs font-bold uppercase text-cyan-300">
                    STATUS: {session ? session.status : 'NO SESSION'}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-lg bg-black/50 border border-cyan-500/20 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cyan-400/60">ACTIVE COURSE:</span>
                  <span className="text-cyan-200 font-semibold">{selectedClass.code}: {selectedClass.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cyan-400/60">INSTRUCTOR:</span>
                  <span className="text-cyan-200 font-semibold">{selectedClass.instructorName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-cyan-400/60">CONNECTED CADETS:</span>
                  <span className="text-cyan-300 font-bold">{connectedCount} Active</span>
                </div>
                {session?.startedAt && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-cyan-400/60">STARTED AT:</span>
                    <span className="text-cyan-400/80">{new Date(session.startedAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {!isLive && !isPaused && (
                  <button
                    onClick={handleCreateOrStartSession}
                    disabled={isActionLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>START CLASSROOM</span>
                  </button>
                )}

                {isLive && (
                  <button
                    onClick={handlePauseSession}
                    disabled={isActionLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/50 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>PAUSE SESSION</span>
                  </button>
                )}

                {isPaused && (
                  <button
                    onClick={handleCreateOrStartSession}
                    disabled={isActionLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>RESUME SESSION</span>
                  </button>
                )}

                {(isLive || isPaused) && (
                  <button
                    onClick={handleEndSession}
                    disabled={isActionLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-400/50 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>END SESSION</span>
                  </button>
                )}

                <button
                  onClick={() => setIsSmartBoardMode(true)}
                  disabled={!session}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-500/20 text-cyan-200 text-xs font-bold transition-all ml-auto"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SMART BOARD MODE</span>
                </button>
              </div>
            </div>

            {/* Smart Board State Dispatcher */}
            <div className="rounded-xl border border-cyan-500/25 bg-slate-950/70 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white tracking-wider">SMART BOARD STATE BROADCASTER</h2>
                </div>
                <span className="text-[10px] text-cyan-400/60">Pushes instantly to connected displays</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-cyan-400/80 mb-1 block">TARGET STATE:</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {(['lesson', 'waiting', 'question', 'results', 'paused', 'ended'] as SmartBoardStateType[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setSelectedStateType(st)}
                          className={`py-1.5 px-2 rounded text-[11px] font-bold uppercase transition-all ${
                            selectedStateType === st
                              ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                              : 'bg-black/40 border border-cyan-500/20 text-cyan-400/60 hover:text-cyan-300'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-cyan-400/80 mb-1 block">BOARD TOPIC / HEADLINE:</label>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g. Unit 4: Schrödinger Wave Equation"
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-slate-900 text-cyan-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-cyan-400/80 mb-1 block">INSTRUCTOR MESSAGE / SUBTITLE:</label>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="e.g. Reviewing boundary condition proofs. Ready software remotes."
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-slate-900 text-cyan-100 text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleUpdateBoardState}
                  disabled={!session || isActionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition-all w-full justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>BROADCAST STATE TO SMART BOARD</span>
                </button>
              </div>
            </div>

            {/* Milestone 13: Smart Quiz Management Panel */}
            {session && (
              <SmartQuizTeacherPanel
                sessionId={session.id}
                classId={selectedClassId}
                userId={currentUser.id}
                activeStudentCount={participants.filter((p) => p.connectionStatus === 'connected').length}
                activeQuiz={activeQuiz}
                onQuizChange={handleQuizChange}
                showNotice={showNotice}
              />
            )}
          </div>

          {/* Right Column (5 cols): Connected Student Roster */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border border-cyan-500/25 bg-slate-950/70 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white tracking-wider">STUDENT ROSTER</h2>
                </div>
                <span className="text-xs font-bold text-cyan-300">
                  {connectedCount} Connected
                </span>
              </div>

              {participants.length === 0 ? (
                <div className="text-center py-8 text-xs text-cyan-400/50 space-y-2">
                  <Laptop className="w-8 h-8 mx-auto text-cyan-500/30" />
                  <p>No students have joined this session yet.</p>
                  <p className="text-[10px] text-cyan-500/40">
                    Switch role to Alex Chen [Student] to simulate student participation.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {participants.map((p) => {
                    const isConn = p.connectionStatus === 'connected';
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                          isConn
                            ? 'border-cyan-500/30 bg-black/40 text-cyan-200'
                            : 'border-white/10 bg-black/20 text-slate-500'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isConn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                              }`}
                            />
                            <span className="text-xs font-semibold text-white">{p.displayName}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                              {p.deviceType}
                            </span>
                          </div>
                          <p className="text-[10px] text-cyan-400/60 font-mono">
                            Joined: {new Date(p.joinedAt).toLocaleTimeString()}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            isConn
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.connectionStatus}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION B: STUDENT VIEW (SOFTWARE REMOTE)                            */}
      {/* =================================================================== */}
      {currentRole === 'student' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Student Status Card */}
          <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-cyan-300">
                  <Smartphone className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    CADET SOFTWARE REMOTE
                  </h2>
                  <p className="text-xs text-cyan-400/70">
                    Live classroom participation keypad & telemetry receiver
                  </p>
                </div>
              </div>

              {/* Student Identity Badge */}
              <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-cyan-500/30 text-right">
                <p className="text-[10px] text-cyan-400/60">IDENTITY:</p>
                <p className="text-xs font-bold text-cyan-200">{currentUser.displayName}</p>
              </div>
            </div>

            {/* Session Discovery Banner */}
            {!session || session.status === 'ended' ? (
              <div className="text-center py-10 space-y-3">
                <Clock className="w-10 h-10 mx-auto text-cyan-500/30" />
                <h3 className="text-sm font-bold text-cyan-300">NO ACTIVE CLASSROOM DETECTED</h3>
                <p className="text-xs text-cyan-400/60 max-w-sm mx-auto">
                  {selectedClass.instructorName} has not launched a live session for {selectedClass.code} yet.
                  The remote will automatically discover the session when it starts.
                </p>
                <button
                  onClick={fetchSessionData}
                  className="px-4 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-500/20 text-xs text-cyan-300"
                >
                  Check Again
                </button>
              </div>
            ) : !isJoined ? (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400/70">LIVE CLASSROOM:</span>
                    <span className="text-cyan-200 font-bold">{session.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400/70">INSTRUCTOR:</span>
                    <span className="text-cyan-200">{selectedClass.instructorName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400/70">STATUS:</span>
                    <span className="text-emerald-400 font-bold uppercase">{session.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400/70">PARTICIPANTS:</span>
                    <span className="text-cyan-300">{session.activeStudentCount} Connected</span>
                  </div>
                </div>

                {/* Device Type Selector */}
                <div>
                  <label className="text-xs text-cyan-400/80 mb-1.5 block">SELECT REMOTE TYPE:</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'software_remote' as const, label: 'Software Remote', icon: Smartphone },
                      { id: 'web' as const, label: 'Web Browser', icon: Laptop },
                      { id: 'tablet' as const, label: 'Tablet Handset', icon: Tablet }
                    ].map((dev) => {
                      const Icon = dev.icon;
                      const isSelected = studentDevice === dev.id;
                      return (
                        <button
                          key={dev.id}
                          type="button"
                          onClick={() => setStudentDevice(dev.id)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                              : 'border-cyan-500/20 bg-black/40 text-cyan-400/60 hover:text-cyan-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[11px] font-medium">{dev.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleStudentJoin}
                  disabled={isActionLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>JOIN LIVE CLASSROOM</span>
                </button>
              </div>
            ) : (
              // Connected Software Remote Handset Interface
              <div className="space-y-6">
                {/* Live Uplink Status Indicator */}
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <div>
                      <p className="text-xs font-bold text-emerald-200">UPLINK ACTIVE & SYNCHRONIZED</p>
                      <p className="text-[10px] text-emerald-400/70">
                        Device: {studentDevice.toUpperCase()} • Heartbeat: 15s
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleStudentLeave}
                    disabled={isActionLoading}
                    className="px-3 py-1 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-500/20 text-xs text-rose-300"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Smart Board Synchronized State View */}
                <div className="p-5 rounded-xl border border-cyan-500/30 bg-black/60 space-y-3">
                  <div className="flex justify-between items-center text-xs border-b border-cyan-500/20 pb-2">
                    <span className="text-cyan-400/60">SMART BOARD SYNC:</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold uppercase text-[10px]">
                      {session.boardState?.state || 'LESSON'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {session.boardState?.currentTopic || selectedClass.name}
                  </h3>

                  <p className="text-xs text-cyan-200/80 leading-relaxed font-sans">
                    {session.boardState?.message || 'Instructor lecture in progress.'}
                  </p>
                </div>

                {/* Milestone 13: Interactive Quiz Remote or Keypad Placeholder */}
                {activeQuiz && (activeQuiz.status === 'live' || activeQuiz.status === 'paused' || activeQuiz.status === 'completed') ? (
                  <SmartQuizStudentRemote
                    quiz={activeQuiz}
                    userId={currentUser.id}
                    showNotice={showNotice}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-cyan-400/70">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        REMOTE RESPONSE KEYPAD
                      </span>
                      <span className="text-[10px] text-cyan-500/50">M13 Poll & Quiz Ready</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['A', 'B', 'C', 'D'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled
                          className="py-4 rounded-xl border border-cyan-500/20 bg-slate-900/60 opacity-60 text-cyan-200 font-bold text-lg cursor-not-allowed flex flex-col items-center justify-center gap-1"
                        >
                          <span>{opt}</span>
                          <span className="text-[9px] text-cyan-400/50 uppercase font-mono">Response</span>
                        </button>
                      ))}
                    </div>

                    <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-center text-xs text-cyan-400/70">
                      Keypad ready. Awaiting instructor to start a Smart Quiz question.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
