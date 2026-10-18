import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { JarvisCore } from '../../components/brand/JarvisCore.tsx';
import { authClient } from '../../services/authClient.ts';
import { useRouter } from '../../services/router.ts';
import type {
  PersonalJarvisIdentity,
  UserContext,
  PersonalMemoryItem,
  PersonalKnowledgeState,
  NextBestAction
} from '../../types/personalIdentity.ts';
import {
  Shield,
  Compass,
  Brain,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Target,
  Clock,
  Plus,
  RefreshCw,
  FileText,
  Upload,
  SlidersHorizontal,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  Send,
  BookOpen
} from 'lucide-react';

interface ActionResultState {
  type: string;
  message: string;
  provenance: {
    provenanceType: string;
    sourceEntityType: string;
    timestamp: string;
  };
  details?: any;
}

export const PersonalWorkspaceSector: React.FC = () => {
  const { navigate } = useRouter();
  const [currentUser, setCurrentUser] = useState(() => authClient.getCurrentUser());
  const [activeWorkspace, setActiveWorkspace] = useState(() => authClient.getActiveWorkspace());

  // Domain Telemetry
  const [identity, setIdentity] = useState<PersonalJarvisIdentity | null>(null);
  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [activeContext, setActiveContext] = useState<UserContext | null>(null);
  const [memories, setMemories] = useState<PersonalMemoryItem[]>([]);
  const [knowledge, setKnowledge] = useState<PersonalKnowledgeState | null>(null);
  const [nextAction, setNextAction] = useState<NextBestAction | null>(null);
  const [greeting, setGreeting] = useState<string>('Welcome to your Personal Sanctuary');
  const [isFirstUse, setIsFirstUse] = useState<boolean>(true);

  // Interaction & UI State
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSwitchingContext, setIsSwitchingContext] = useState(false);
  const [selectedAction, setSelectedAction] = useState<NextBestAction | null>(null);

  // Action Execution State
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResultState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals & Panels
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<'academic' | 'career' | 'personal' | 'mastery'>('academic');

  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [selectedExplanationStyle, setSelectedExplanationStyle] = useState<'first_principles' | 'concise_tactical' | 'socratic' | 'intuitive_visual'>('first_principles');

  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Record<string, boolean>>({});
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, string>>({});
  const [evaluatedResults, setEvaluatedResults] = useState<Record<string, { isCorrect: boolean; feedback: string; score: number }>>({});

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileContent, setUploadFileContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');

  const [quickQuestion, setQuickQuestion] = useState('');
  const [isAskingJarvis, setIsAskingJarvis] = useState(false);
  const [jarvisReply, setJarvisReply] = useState<string | null>(null);

  const fetchPersonalData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const headers = authClient.getAuthHeaders();

      // 1. Fetch Identity & Home
      const homeRes = await fetch('/api/personal/home', { headers });
      if (homeRes.ok) {
        const homeData = await homeRes.json();
        if (homeData.home) {
          setGreeting(homeData.home.greeting || 'Welcome');
          setActiveContext(homeData.home.activeContext || null);
          setContexts(homeData.home.contexts || []);
          setNextAction(homeData.home.nextBestAction || null);
          setSelectedAction(homeData.home.nextBestAction || null);
          setIsFirstUse(Boolean(homeData.home.isFirstUse));
          if (homeData.home.preferences?.explanationStyle) {
            setSelectedExplanationStyle(homeData.home.preferences.explanationStyle);
          }
        }
      } else if (homeRes.status === 401) {
        navigate('/login?redirect=%2Fapp%2Fpersonal');
        return;
      }

      // 2. Fetch full Identity
      const idRes = await fetch('/api/personal/identity', { headers });
      if (idRes.ok) {
        const idData = await idRes.json();
        if (idData.identity) {
          setIdentity(idData.identity);
          if (idData.identity.preferences?.explanationStyle) {
            setSelectedExplanationStyle(idData.identity.preferences.explanationStyle);
          }
          if (!activeContext && idData.identity.contexts) {
            setContexts(idData.identity.contexts);
            const act = idData.identity.contexts.find((c: any) => c.id === idData.identity.activeContextId);
            setActiveContext(act || idData.identity.contexts[0] || null);
          }
        }
      }

      // 3. Fetch Memories
      const memRes = await fetch('/api/personal/memories', { headers });
      if (memRes.ok) {
        const memData = await memRes.json();
        if (memData.memories) {
          setMemories(memData.memories);
        }
      }

      // 4. Fetch Knowledge
      const knowRes = await fetch('/api/personal/knowledge', { headers });
      if (knowRes.ok) {
        const knowData = await knowRes.json();
        if (knowData.knowledge) {
          setKnowledge(knowData.knowledge);
        }
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to connect to Jarvis Neural Services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalData();
    const unsub = authClient.subscribe(() => {
      setCurrentUser(authClient.getCurrentUser());
      setActiveWorkspace(authClient.getActiveWorkspace());
      fetchPersonalData();
    });
    return unsub;
  }, []);

  const handleSwitchContext = async (contextId: string) => {
    setIsSwitchingContext(true);
    try {
      const res = await fetch('/api/personal/contexts/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({ contextId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activeContext) {
          setActiveContext(data.activeContext);
          setContexts((prev) =>
            prev.map((c) => ({ ...c, isActive: c.id === data.activeContext.id }))
          );
          // Refresh next best action for newly active context
          await fetchPersonalData();
        }
      }
    } catch (err) {
      console.error('[PersonalWorkspace] Failed to switch context:', err);
    } finally {
      setIsSwitchingContext(false);
    }
  };

  // EXECUTE REAL TASK
  const handleExecuteAction = async (targetAction: NextBestAction) => {
    setIsExecutingAction(true);
    setActionError(null);
    setActionResult(null);

    try {
      // If action is goal definition, open goal creation modal
      if (targetAction.type === 'goal_definition' || targetAction.actionTarget?.toolId === 'goal_definition') {
        setShowAddGoalModal(true);
        setIsExecutingAction(false);
        return;
      }

      // If action is ask_jarvis, trigger contextual question prompt
      if (targetAction.actionTarget?.toolId === 'ask_jarvis') {
        setQuickQuestion(targetAction.actionTarget.toolArgs?.prompt || `How can I begin mastering ${targetAction.title}?`);
        setIsExecutingAction(false);
        return;
      }

      const res = await fetch('/api/personal/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          actionId: targetAction.id,
          actionType: targetAction.type,
          payload: {
            conceptName: targetAction.actionTarget?.concept || targetAction.title.replace(/—.*/, '').trim(),
            title: targetAction.title.replace(/—.*/, '').trim(),
            subject: activeContext?.title || 'Personal Workspace',
            itemCount: 3
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || data.error || 'Failed to complete task');
      }

      setCompletedCheckpoints({});
      setRevealedHints({});
      setCheckpointAnswers({});
      setEvaluatedResults({});

      setActionResult({
        type: data.actionType,
        message: data.result?.message || 'Task successfully executed and recorded.',
        provenance: data.provenance,
        details: data.result
      });

      if (data.isFirstUse !== undefined) {
        setIsFirstUse(Boolean(data.isFirstUse));
      }

      if (data.nextBestAction) {
        setNextAction(data.nextBestAction);
        setSelectedAction(data.nextBestAction);
      }

      // Re-fetch domain state to reflect updated knowledge, memories, and streak
      await fetchPersonalData();
    } catch (err: any) {
      setActionError(err?.message || 'Action execution encountered a service disruption.');
    } finally {
      setIsExecutingAction(false);
    }
  };

  // VERIFY / EVALUATE DIAGNOSTIC CHECKPOINT
  const handleVerifyCheckpoint = async (qId: string, conceptName: string) => {
    const answer = checkpointAnswers[qId] || '';
    try {
      const res = await fetch('/api/personal/diagnostic/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          questionId: qId,
          conceptName,
          learnerAnswer: answer,
          sessionId: actionResult?.details?.sessionId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEvaluatedResults((prev) => ({
          ...prev,
          [qId]: {
            isCorrect: Boolean(data.isCorrect),
            feedback: data.feedback || (data.isCorrect ? 'Verified reasoning.' : 'Learning gap detected.'),
            score: data.score || 0.5
          }
        }));
        setCompletedCheckpoints((prev) => {
          const updated = { ...prev, [qId]: true };
          if (actionResult?.details?.questions && Object.keys(updated).length >= actionResult.details.questions.length) {
            setActionResult((current: any) => current ? {
              ...current,
              message: `Practice diagnostic completed for "${conceptName}". All checkpoints evaluated.`,
              details: {
                ...current.details,
                completed: true,
                status: 'completed'
              }
            } : current);
          }
          return updated;
        });
        await fetchPersonalData();
      }
    } catch (err) {
      console.error('[PersonalWorkspace] Failed to evaluate checkpoint:', err);
    }
  };

  // ADD GOAL
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      const res = await fetch('/api/personal/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          category: newGoalCategory
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddGoalModal(false);
        setNewGoalTitle('');
        if (data.nextBestAction) {
          setNextAction(data.nextBestAction);
          setSelectedAction(data.nextBestAction);
        }
        await fetchPersonalData();
      }
    } catch (err) {
      console.error('[PersonalWorkspace] Failed to create goal:', err);
    }
  };

  // UPDATE PREFERENCES
  const handleSavePreferences = async () => {
    try {
      const res = await fetch('/api/personal/identity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          preferences: {
            ...(identity?.preferences || {}),
            explanationStyle: selectedExplanationStyle
          }
        })
      });
      if (res.ok) {
        setShowPreferencesModal(false);
        await fetchPersonalData();
      }
    } catch (err) {
      console.error('[PersonalWorkspace] Failed to update preferences:', err);
    }
  };

  // ASK JARVIS QUICK QUESTION
  const handleAskJarvis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickQuestion.trim()) return;

    setIsAskingJarvis(true);
    setJarvisReply(null);
    try {
      const res = await fetch('/api/personal/conversation/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          sessionId: `sess-ask-${Date.now()}`,
          message: quickQuestion.trim(),
          contextId: activeContext?.id
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setJarvisReply(data.reply);
      } else {
        setJarvisReply('I received your prompt, Cadet. Your personal context and memory vault have been updated.');
      }
      await fetchPersonalData();
    } catch (err: any) {
      setJarvisReply(`Assistance error: ${err?.message || 'Neural link unavailable'}`);
    } finally {
      setIsAskingJarvis(false);
    }
  };

  // UPLOAD REFERENCE MATERIAL
  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName.trim() || !uploadFileContent.trim()) return;

    setIsUploading(true);
    try {
      // 1. Create file record via storage API
      const base64Data = btoa(unescape(encodeURIComponent(uploadFileContent)));
      await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          originalName: uploadFileName.endsWith('.md') || uploadFileName.endsWith('.txt') ? uploadFileName : `${uploadFileName}.txt`,
          mimeType: 'text/plain',
          base64Data,
          description: `Reference notes for ${activeContext?.title || 'Personal'}`
        })
      });

      // 2. Index into private notes store
      await fetch('/api/personal/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          title: uploadFileName.replace(/\.[^/.]+$/, ''),
          content: uploadFileContent,
          subject: activeContext?.title || 'General Notes',
          tags: ['upload', 'reference_material']
        })
      });

      setShowUploadModal(false);
      setUploadFileName('');
      setUploadFileContent('');
      await fetchPersonalData();
    } catch (err) {
      console.error('[PersonalWorkspace] Failed to upload material:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // ADD MEMORY
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryKey.trim() || !newMemoryValue.trim()) return;

    try {
      const res = await fetch('/api/personal/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders()
        },
        body: JSON.stringify({
          category: 'UserPreference',
          key: newMemoryKey.trim(),
          value: newMemoryValue.trim(),
          source: 'USER_STATED',
          visibility: 'PRIVATE_PERSONAL',
          confidence: 1.0
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.memory) {
          setMemories((prev) => [data.memory, ...prev]);
          setNewMemoryKey('');
          setNewMemoryValue('');
          setShowAddMemory(false);
        }
      }
    } catch (err) {
      console.error('[PersonalWorkspace] Failed to add memory:', err);
    }
  };

  const isPersonalWorkspace = !activeWorkspace?.institutionId;
  const preferredName = identity?.profile.preferredName || currentUser?.displayName?.split(' ')[0] || 'Cadet';
  const primaryGoal = identity?.goals && identity.goals.length > 0 ? identity.goals[0] : null;
  const conceptsList = knowledge ? Object.values(knowledge.concepts) : [];

  // --------------------------------------------------------------------------
  // RENDER: Loading Skeleton State
  // --------------------------------------------------------------------------
  if (isLoading && !identity) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-pulse select-none">
        <div className="h-32 rounded-3xl bg-white/[0.03] border border-white/[0.08]" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
          <div className="lg:col-span-2 h-80 rounded-2xl bg-white/[0.03] border border-white/[0.06]" />
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Error / Offline Recovery State
  // --------------------------------------------------------------------------
  if (loadError && !identity) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Sovereign Connection Interrupted</h2>
        <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
          {loadError}. Please ensure the Jarvis API gateway is running or verify your session.
        </p>
        <Button size="sm" variant="primary" onClick={fetchPersonalData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Handshake
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4 animate-reveal-soft">
      {/* =====================================================================
          PART 2.A: WELCOME & IDENTITY RECOGNITION BAR
         ===================================================================== */}
      <GlassCard level="elevated" className="p-6 sm:p-7 relative overflow-hidden border-t border-t-cyan-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <JarvisCore size="md" state={isExecutingAction ? 'thinking' : 'idle'} label="Personal Intelligence Core" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30">
                  {isFirstUse ? 'Sovereign OS · Ready for Action' : 'Sovereign Personal OS'}
                </span>
                <span className="text-xs text-neutral-500">·</span>
                <span className="text-xs font-mono text-neutral-300 truncate">
                  {identity?.profile.displayName || currentUser?.displayName || 'Autonomous User'}
                </span>
                <span className="text-xs text-neutral-500">·</span>
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  Context: <strong className="text-cyan-300">{activeContext?.title || 'Personal'}</strong>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {greeting}
              </h1>

              <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
                {isFirstUse ? (
                  primaryGoal ? (
                    <>Calibrated to your primary focus <span className="text-cyan-300 font-medium">"{primaryGoal.title}"</span>. Below is your single recommended starting action to establish your initial mastery baseline and calibrate Jarvis.</>
                  ) : (
                    <>Welcome to your sovereign personal operating environment. Set your primary focus or execute your calibrated starting task below.</>
                  )
                ) : (
                  primaryGoal ? (
                    <>Focused on <span className="text-cyan-300 font-medium">"{primaryGoal.title}"</span>. Private memories and mastery are cryptographically isolated from external institutional telemetry.</>
                  ) : (
                    <>Your independent intelligence environment. Real mastery and private notes are stored in your sovereign vault.</>
                  )
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics: Honest metrics with zero fake statistics */}
          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center min-w-[85px]">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">
                {(identity?.stats.totalStudyMinutes || 0) > 0 ? 'Study Streak' : 'Active Day'}
              </div>
              <div className="text-base font-bold font-mono text-cyan-300">
                {(identity?.stats.totalStudyMinutes || 0) > 0 ? `${identity?.stats.activeStreakDays || 1}d` : 'Day 1'}
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center min-w-[80px]">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">{isFirstUse ? 'Baseline' : 'Study Time'}</div>
              <div className="text-base font-bold font-mono text-white">
                {isFirstUse ? (conceptsList.length > 0 ? 'Active' : 'Ready') : `${identity?.stats.totalStudyMinutes || 0}m`}
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center min-w-[80px]">
              <div className="text-[10px] font-mono text-neutral-400 uppercase">Mastery</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {conceptsList.filter((c) => c.status === 'mastered').length}
              </div>
            </div>
          </div>
        </div>

        {/* Isolation & Action Controls Bar */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-cyan-200">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-medium text-neutral-300">Active Workspace:</span>
            <span className="font-mono text-white font-semibold">
              {activeWorkspace?.name || 'Personal Sovereign Workspace'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/50 border border-cyan-500/40 text-cyan-300">
              {isPersonalWorkspace ? 'Sovereign Individual' : 'Institution Linked'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="glass"
              onClick={() => setShowPreferencesModal(true)}
              icon={<SlidersHorizontal className="w-3.5 h-3.5 text-neutral-300" />}
              className="text-xs"
            >
              Preferences
            </Button>
            <Button
              size="sm"
              variant="glass"
              onClick={() => setShowUploadModal(true)}
              icon={<Upload className="w-3.5 h-3.5 text-cyan-300" />}
              className="text-xs"
            >
              Upload Material
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* =====================================================================
          PART 2.B & PART 3: FOCUSED STARTING WORKSPACE & RECOMMENDED REAL TASK
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Context Switcher & Goals */}
        <div className="space-y-6">
          {/* Context Switcher */}
          <GlassCard level="2" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Operating Contexts
                </h2>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {contexts.length} active
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Switch contexts to adapt Jarvis's memory scope and focus while preserving your sovereign core.
            </p>

            <div className="space-y-2 pt-1">
              {contexts.map((ctx) => {
                const isActive = activeContext?.id === ctx.id;
                return (
                  <button
                    key={ctx.id}
                    onClick={() => handleSwitchContext(ctx.id)}
                    disabled={isSwitchingContext}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white truncate max-w-[200px]">
                        {ctx.title}
                      </span>
                      <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-cyan-400/20 text-cyan-300 font-bold'
                          : 'bg-white/[0.05] text-neutral-400'
                      }`}>
                        {ctx.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {ctx.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Active Goals (Real Data with Goal Addition) */}
          <GlassCard level="2" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Active Goals
                </h2>
              </div>
              <Button
                size="sm"
                variant="glass"
                onClick={() => setShowAddGoalModal(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Add Goal
              </Button>
            </div>

            {identity?.goals && identity.goals.length > 0 ? (
              <div className="space-y-3">
                {identity.goals.map((g) => (
                  <div key={g.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white leading-tight">
                        {g.title}
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-300 shrink-0">
                        {g.progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${g.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.1] text-center space-y-2">
                <p className="text-xs text-neutral-400">
                  No learning goals configured yet. Stating a goal tailors your diagnostic practice and memory vault.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowAddGoalModal(true)}
                  className="text-xs"
                >
                  Define First Goal
                </Button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Center & Right Columns: Primary Recommended Action + Execution Card + Vault */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PRIMARY RECOMMENDED ACTION HERO CARD */}
          {selectedAction && (
            <GlassCard
              level="elevated"
              className="p-6 space-y-5 border-l-4 border-l-cyan-400 relative overflow-hidden bg-gradient-to-br from-cyan-950/20 to-transparent"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>{isFirstUse ? 'Your First Useful Action' : 'Primary Recommended Action'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase">
                    Priority: <strong className="text-white">{selectedAction.priority.toUpperCase()}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Est. {selectedAction.estimatedMinutes} minutes</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {selectedAction.title}
                </h2>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
                  {selectedAction.rationale}
                </p>
              </div>

              {/* Action Error Banner */}
              {actionError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Real Task Execution Trigger */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => handleExecuteAction(selectedAction)}
                  disabled={isExecutingAction}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                  className="font-semibold text-xs px-5 shadow-lg shadow-cyan-500/10"
                >
                  {isExecutingAction
                    ? 'Executing Calibrated Task...'
                    : (isFirstUse ? 'Begin Baseline Diagnostic' : 'Execute Recommended Task')}
                </Button>

                {selectedAction.actionTarget?.concept && (
                  <span className="text-[11px] font-mono text-neutral-400">
                    Target concept: <span className="text-cyan-300">{selectedAction.actionTarget.concept}</span>
                  </span>
                )}
              </div>

              {/* Alternative Actions: 2-3 concise alternatives */}
              {selectedAction.alternativeActions && selectedAction.alternativeActions.length > 0 && (
                <div className="pt-4 border-t border-white/[0.06] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Alternative Actions:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedAction.alternativeActions.map((alt) => (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => {
                          const converted: NextBestAction = {
                            id: alt.id,
                            title: alt.title,
                            type: alt.type as any,
                            estimatedMinutes: alt.estimatedMinutes,
                            priority: 'medium',
                            targetContext: selectedAction.targetContext,
                            rationale: alt.rationale,
                            actionTarget: alt.actionTarget
                          };
                          setSelectedAction(converted);
                        }}
                        className="p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/30 text-left transition-all cursor-pointer flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-white">
                          <span className="truncate">{alt.title}</span>
                          <span className="text-[10px] font-mono text-neutral-400 shrink-0">{alt.estimatedMinutes}m</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 line-clamp-1">{alt.rationale}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {/* RETURNING USER: DEMONSTRATED CONCEPT MASTERY BREAKDOWN */}
          {!isFirstUse && conceptsList.length > 0 && (
            <GlassCard level="2" className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Demonstrated Concept Mastery
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  {conceptsList.length} verified concepts
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {conceptsList.map((concept) => {
                  const isMastered = concept.status === 'mastered';
                  const isReview = concept.status === 'review_needed';

                  return (
                    <div
                      key={concept.conceptId}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isReview
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : isMastered
                          ? 'bg-emerald-950/15 border-emerald-500/30'
                          : 'bg-white/[0.02] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[180px]">
                          {concept.conceptName}
                        </span>
                        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          isReview
                            ? 'bg-amber-500/20 text-amber-300 font-semibold'
                            : isMastered
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {Math.round(concept.masteryLevel * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-1 rounded-full ${
                            isReview
                              ? 'bg-amber-400'
                              : isMastered
                              ? 'bg-emerald-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.round(concept.masteryLevel * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                        <span>{concept.evidenceCount} checkpoints</span>
                        <span className="capitalize">{concept.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* REAL TASK EXECUTION RESULT CARD */}
          {actionResult && (
            <GlassCard
              level="elevated"
              className={`p-6 space-y-4 border-l-4 ${
                actionResult.details?.completed
                  ? 'border-l-emerald-400 bg-emerald-950/15'
                  : 'border-l-cyan-400 bg-cyan-950/15'
              } animate-reveal-soft`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg ${
                      actionResult.details?.completed
                        ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                        : 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300'
                    } flex items-center justify-center`}
                  >
                    {actionResult.details?.completed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {actionResult.details?.completed
                        ? 'Task Completed Successfully'
                        : (actionResult.details?.status === 'started' || actionResult.details?.status === 'in_progress'
                            ? 'Practice Session In Progress'
                            : 'Task Execution Initiated')}
                    </h3>
                    <span
                      className={`text-[10px] font-mono ${
                        actionResult.details?.completed ? 'text-emerald-300' : 'text-cyan-300'
                      } uppercase`}
                    >
                      Provenance: {actionResult.provenance.provenanceType} · Lifecycle: {actionResult.details?.status || (actionResult.details?.completed ? 'completed' : 'started')}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  {new Date(actionResult.provenance.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-xs text-neutral-200 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/[0.06]">
                {actionResult.message}
              </p>

              {/* If practice questions generated */}
              {actionResult.details?.questions && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-neutral-300 uppercase font-semibold">
                      Diagnostic Curriculum Checkpoints ({Object.keys(completedCheckpoints).length}/{actionResult.details.questions.length} Completed):
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 font-semibold">
                      Baseline Mastery: {Math.round((actionResult.details.masteryLevel || 0.65) * 100)}%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {actionResult.details.questions.map((q: any, idx: number) => {
                      const qId = q.id || `q-${idx}`;
                      const isComplete = Boolean(completedCheckpoints[qId]);
                      const showHint = Boolean(revealedHints[qId]);

                      return (
                        <div
                          key={qId}
                          className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                            isComplete
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-white/[0.02] border-white/[0.08]'
                          }`}
                        >
                          <div className="font-semibold text-white flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              {isComplete && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              <span>Checkpoint {idx + 1}: {q.concept}</span>
                            </span>
                            <span className="text-[10px] font-mono text-cyan-300 uppercase px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20">
                              {q.difficulty}
                            </span>
                          </div>

                          <p className="text-neutral-200 text-xs leading-relaxed">{q.prompt}</p>

                          {q.hints && q.hints.length > 0 && (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => setRevealedHints((prev) => ({ ...prev, [qId]: !prev[qId] }))}
                                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1"
                              >
                                <HelpCircle className="w-3 h-3" />
                                <span>{showHint ? 'Hide Guidance Hint' : 'Reveal Guidance Hint'}</span>
                              </button>
                              {showHint && (
                                <p className="p-2 rounded-lg bg-black/40 border border-cyan-500/20 text-[11px] text-cyan-200 font-mono">
                                  💡 {q.hints[0]}
                                </p>
                              )}
                            </div>
                          )}

                          {evaluatedResults[qId] && (
                            <div className={`p-2 rounded-lg border text-[11px] font-mono flex items-center justify-between ${
                              evaluatedResults[qId].isCorrect
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                            }`}>
                              <span>{evaluatedResults[qId].feedback}</span>
                              <span className="font-bold">{evaluatedResults[qId].isCorrect ? '✔ Verified' : '⚠ Gap'}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <input
                              type="text"
                              value={checkpointAnswers[qId] || ''}
                              onChange={(e) => setCheckpointAnswers((prev) => ({ ...prev, [qId]: e.target.value }))}
                              placeholder="Record your reasoning or key derivation..."
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.1] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/50"
                            />
                            <Button
                              size="sm"
                              variant={isComplete ? 'glass' : 'primary'}
                              onClick={() => handleVerifyCheckpoint(qId, q.concept || actionResult.details?.concept || 'Physics')}
                              icon={isComplete ? <Check className="w-3 h-3 text-emerald-400" /> : undefined}
                              className="text-xs shrink-0"
                            >
                              {isComplete ? 'Evaluated' : 'Submit & Verify'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => setActionResult(null)}
                  className="text-xs"
                >
                  Dismiss Result
                </Button>
              </div>
            </GlassCard>
          )}

          {/* QUICK "ASK JARVIS" CONTEXTUAL QUERY BOX */}
          <GlassCard level="2" className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Ask Jarvis (Grounded in Personal Context)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                Context: {activeContext?.title || 'Personal'}
              </span>
            </div>

            <form onSubmit={handleAskJarvis} className="flex gap-2">
              <input
                type="text"
                value={quickQuestion}
                onChange={(e) => setQuickQuestion(e.target.value)}
                placeholder="Ask for a first-principles breakdown, plan, or question..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
              />
              <Button
                size="md"
                variant="primary"
                type="submit"
                disabled={isAskingJarvis || !quickQuestion.trim()}
                icon={<Send className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                {isAskingJarvis ? 'Thinking...' : 'Ask'}
              </Button>
            </form>

            {/* Suggested Prompts grounded in user goals */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                primaryGoal ? `Explain ${primaryGoal.title} from first principles` : 'What can you help me learn or accomplish?',
                'How is my data kept sovereign and isolated?',
                'Draft a 3-step study outline for this week'
              ].map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuickQuestion(promptText)}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-cyan-500/10 hover:border-cyan-500/30 text-[11px] text-neutral-300 hover:text-white transition-all text-left cursor-pointer"
                >
                  💡 {promptText}
                </button>
              ))}
            </div>

            {jarvisReply && (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-neutral-200 leading-relaxed space-y-2 animate-reveal-soft">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold font-mono text-[10px] uppercase">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Jarvis Assistant Response</span>
                </div>
                <div className="whitespace-pre-wrap">{jarvisReply}</div>
              </div>
            )}
          </GlassCard>

          {/* PRIVATE MEMORY VAULT WITH PROVENANCE TRANSPARENCY */}
          <GlassCard level="2" className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Private Memory Vault
                </h3>
              </div>
              <Button
                size="sm"
                variant="glass"
                onClick={() => setShowAddMemory(!showAddMemory)}
                icon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Add Memory Fact
              </Button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Facts and preferences stored here are strictly private to you. They are never shared with campus administrators, faculty review dashboards, or institutional systems.
            </p>

            {showAddMemory && (
              <form onSubmit={handleAddMemory} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.12] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newMemoryKey}
                    onChange={(e) => setNewMemoryKey(e.target.value)}
                    placeholder="Fact or preference key (e.g. StudySchedule)"
                    className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60"
                  />
                  <input
                    type="text"
                    value={newMemoryValue}
                    onChange={(e) => setNewMemoryValue(e.target.value)}
                    placeholder="Value (e.g. Prefers studying at night with worked derivations)"
                    className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowAddMemory(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" type="submit" className="text-xs">
                    Save to Private Vault
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {memories.length === 0 ? (
                <div className="p-6 text-center text-xs text-neutral-500 rounded-xl bg-white/[0.01] border border-dashed border-white/[0.08]">
                  No private memories recorded yet. Your confirmed interactions and goal statements will securely calibrate this vault.
                </div>
              ) : (
                memories.slice(0, 6).map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-300 font-medium">
                          {mem.key}:
                        </span>
                        <span className="text-white truncate">
                          {typeof mem.value === 'string' ? mem.value : JSON.stringify(mem.value)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                        <span className="text-neutral-300">Source: {mem.source}</span>
                        <span>·</span>
                        <span className="text-emerald-400">PRIVATE_PERSONAL</span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                      {Math.round((mem.confidence || 1) * 100)}% conf
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* =====================================================================
          MODAL: DEFINE / ADD GOAL
         ===================================================================== */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-reveal-soft">
          <div className="relative w-full max-w-md rounded-2xl glass-level-3 border border-white/[0.14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Define Primary Focus Goal</h3>
              </div>
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block">
                  Goal Title or Focus Domain *
                </label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g. Quantum Computing, Lagrangian Mechanics, Python Algorithms"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['academic', 'mastery', 'career', 'personal'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewGoalCategory(cat)}
                      className={`p-2 rounded-lg border capitalize transition-all cursor-pointer text-left text-xs ${
                        newGoalCategory === cat
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-white font-semibold'
                          : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <Button size="sm" variant="ghost" onClick={() => setShowAddGoalModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Activate Goal & Update Recommendations
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: PREFERENCES (Explanation Style & Cadence)
         ===================================================================== */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-reveal-soft">
          <div className="relative w-full max-w-md rounded-2xl glass-level-3 border border-white/[0.14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Pedagogical Preferences</h3>
              </div>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-neutral-300 block">
                Explanation Style
              </label>
              {[
                { id: 'first_principles', label: 'First Principles', desc: 'Derives concepts from foundational axioms without shortcuts' },
                { id: 'concise_tactical', label: 'Concise Tactical', desc: 'Direct, formula-focused, minimal conversational preamble' },
                { id: 'socratic', label: 'Socratic Dialogue', desc: 'Guides understanding through targeted inquiry questions' },
                { id: 'intuitive_visual', label: 'Intuitive Visual', desc: 'Emphasizes physical analogies and visual intuition' }
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setSelectedExplanationStyle(style.id as any)}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                    selectedExplanationStyle === style.id
                      ? 'bg-cyan-500/15 border-cyan-400/60 text-white'
                      : 'bg-white/[0.02] border-white/[0.08] text-neutral-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{style.label}</span>
                    {selectedExplanationStyle === style.id && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                  </div>
                  <span className="text-[10px] text-neutral-400">{style.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <Button size="sm" variant="ghost" onClick={() => setShowPreferencesModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: UPLOAD REFERENCE MATERIAL
         ===================================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-reveal-soft">
          <div className="relative w-full max-w-lg rounded-2xl glass-level-3 border border-white/[0.14] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Upload Reference Notes or Document</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="e.g. Chapter 4 Newton Laws Notes"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block">
                  Paste Content or Notes *
                </label>
                <textarea
                  rows={6}
                  value={uploadFileContent}
                  onChange={(e) => setUploadFileContent(e.target.value)}
                  placeholder="Paste reference text, lecture transcript, formulas, or derivations to index into your personal workspace..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <Button size="sm" variant="ghost" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={isUploading}>
                  {isUploading ? 'Indexing Document...' : 'Index Into Personal Vault'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
