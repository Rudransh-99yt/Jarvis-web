import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Brain,
  HelpCircle,
  CheckCircle,
  FileText,
  Zap,
  BookOpen,
  Layers,
  Download,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { EducationRole } from '../../../types/education.ts';
import { knowledgeAssetClient } from '../../../services/knowledgeAssetClient.ts';
import { actionExperienceClient } from '../../../services/actionExperienceClient.ts';
import { ActionPreviewCard } from '../../../components/actionExperience/ActionPreviewCard.tsx';
import { ActionActivityTimeline } from '../../../components/actionExperience/ActionActivityTimeline.tsx';
import type {
  ActionPreviewData,
  ActionResultData,
  ActionExecutionState
} from '../../../types/actionExperience.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionPreview?: ActionPreviewData;
  actionExecutionState?: ActionExecutionState;
  actionResult?: ActionResultData;
  executionStep?: string;
}

interface StudyAssistantViewProps {
  currentRole: EducationRole;
  onSendMessage: (message: string) => Promise<string>;
  onNavigateToKnowledgeAssets?: () => void;
  onStartPractice?: () => void;
}

export const StudyAssistantView: React.FC<StudyAssistantViewProps> = ({
  currentRole,
  onSendMessage,
  onNavigateToKnowledgeAssets,
  onStartPractice
}) => {
  const [activeMode, setActiveMode] = useState<'explain' | 'quiz' | 'summarize' | 'flashcards' | 'reuse'>('explain');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);

  const [conversation, setConversation] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      role: 'assistant',
      content: `Greetings. I am your Jarvis Study Companion. I can provide grounded explanations, interactive problem quizzes, concise summaries, formula flashcards, or immediately reuse verified question sets from your persistent knowledge repository. What shall we analyze?`
    }
  ]);

  const modePresets = [
    {
      id: 'explain' as const,
      name: '1. Concept Explainer',
      icon: Brain,
      placeholder: 'e.g. Explain quantum ladder operators and how they derive energy eigenstates...',
      sample: 'Explain the physical intuition behind Green\'s Theorem and why it equates circulation to curl.'
    },
    {
      id: 'quiz' as const,
      name: '2. Practice Quiz',
      icon: HelpCircle,
      placeholder: 'e.g. Quiz me with 3 conceptual questions on wave-particle duality...',
      sample: 'Generate a 3-question practice quiz on Quantum Harmonic Oscillators with step-by-step solutions.'
    },
    {
      id: 'summarize' as const,
      name: '3. Document Summarizer',
      icon: FileText,
      placeholder: 'e.g. Summarize the key theorems of multivariable vector calculus...',
      sample: 'Summarize the four Maxwell equations and their physical interpretations in differential form.'
    },
    {
      id: 'flashcards' as const,
      name: '4. Formula Flashcards',
      icon: Zap,
      placeholder: 'e.g. Create rapid-recall flashcards for Schrödinger equation operators...',
      sample: 'Create 4 flashcards for Stokes theorem and Divergence theorem parameterizations.'
    },
    {
      id: 'reuse' as const,
      name: '5. Reuse Knowledge',
      icon: Layers,
      placeholder: 'e.g. Give me 20 questions on Class 10 quadratic equations...',
      sample: 'Create 20 questions on quadratic equations from my verified knowledge.'
    }
  ];

  const handleDownloadPdf = async (assetId: string, title: string) => {
    try {
      const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await knowledgeAssetClient.downloadPdfBlob(assetId, filename);
      // Record in activity timeline
      await actionExperienceClient.recordActivity({
        title: `Downloaded practice PDF: ${title}`,
        category: 'practice',
        assetId,
        sourceTitle: title,
        canUndo: false
      });
      setTimelineRefreshKey((k) => k + 1);
    } catch {
      window.open(knowledgeAssetClient.getPdfUrl(assetId, true), '_blank');
    }
  };

  /**
   * Executes the action corresponding to an action preview
   */
  const handleExecuteAction = async (messageId: string, preview: ActionPreviewData) => {
    // 1. Transition to EXECUTING state
    setConversation((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              actionExecutionState: 'EXECUTING',
              executionStep: 'Checking your existing knowledge…'
            }
          : msg
      )
    );

    try {
      // Subtle step progression
      await new Promise((r) => setTimeout(r, 450));
      setConversation((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                executionStep:
                  preview.plan.reusedItems > 0
                    ? `Reusing ${preview.plan.reusedItems} verified questions…`
                    : 'Synthesizing practice items…'
              }
            : msg
        )
      );

      // Perform real generation or reuse with exposure and novelty awareness
      let genResult: any;
      if (preview.payload?.noveltyMode) {
        try {
          const novelRes = await actionExperienceClient.requestNovelPracticeSet({
            subject: preview.payload.subject || 'Mathematics',
            topic: preview.payload.topic || 'Quadratic Equations',
            educationLevel: preview.payload.educationLevel || 'Class 10',
            difficulty: preview.payload.difficulty || 'intermediate',
            questionCount: preview.plan.totalItems || 20,
            noveltyMode: preview.payload.noveltyMode,
            generatePdf: true,
            sharedWithInstitution: true
          });
          genResult = {
            totalCount: novelRes.questions?.length || preview.plan.totalItems,
            reusedCount: novelRes.noveltyResult?.reusedCount || 0,
            generatedCount: novelRes.noveltyResult?.generatedCount || 0,
            asset: novelRes.registeredAsset,
            pdfStorageKey: novelRes.pdfStorageKey
          };
        } catch {
          genResult = await knowledgeAssetClient.generateOrReuse({
            subject: preview.payload.subject || 'Mathematics',
            topic: preview.payload.topic || 'Quadratic Equations',
            educationLevel: preview.payload.educationLevel || 'Class 10',
            difficulty: preview.payload.difficulty || 'intermediate',
            questionCount: preview.plan.totalItems || 20,
            generatePdf: true,
            sharedWithInstitution: true
          });
        }
      } else {
        genResult = await knowledgeAssetClient.generateOrReuse({
          subject: preview.payload.subject || 'Mathematics',
          topic: preview.payload.topic || 'Quadratic Equations',
          educationLevel: preview.payload.educationLevel || 'Class 10',
          difficulty: preview.payload.difficulty || 'intermediate',
          questionCount: preview.plan.totalItems || 20,
          generatePdf: true,
          sharedWithInstitution: true
        });
      }


      await new Promise((r) => setTimeout(r, 400));

      const finalAsset = genResult.asset || {
        id: preview.source.assetId || 'ka-math-quad-10',
        title: preview.source.title,
        topic: preview.payload.topic || 'Quadratic Equations'
      };

      const nba = actionExperienceClient.computeDeterministicNextBestAction(
        'practice_set_create',
        {
          totalCount: genResult.totalCount,
          assetTitle: finalAsset.title
        }
      );

      const actionResult: ActionResultData = {
        title: 'Practice Set Ready',
        subtitle: `Your ${genResult.totalCount}-question practice set has been prepared.`,
        status: 'success',
        totalCount: genResult.totalCount,
        reusedCount: genResult.reusedCount,
        generatedCount: genResult.generatedCount,
        assetId: finalAsset.id,
        assetTitle: finalAsset.title,
        nextBestAction: {
          id: nba.id,
          title: nba.title,
          rationale: nba.rationale,
          actionType: 'start_practice',
          targetId: finalAsset.id
        },
        canUndo: true,
        undoLabel: 'Undo creation'
      };

      // Record activity in timeline
      const recordedActivity = await actionExperienceClient.recordActivity({
        title: `Created ${preview.payload.topic || 'Quadratic Equations'} practice set`,
        category: 'practice',
        assetId: finalAsset.id,
        sourceTitle: finalAsset.title,
        totalCount: genResult.totalCount,
        reusedCount: genResult.reusedCount,
        generatedCount: genResult.generatedCount,
        canUndo: true,
        reversibleAction: {
          type: 'practice_draft',
          targetId: finalAsset.id
        }
      });

      actionResult.undoToken = recordedActivity.id;

      // 2. Transition to COMPLETED
      setConversation((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: `Done. Your ${genResult.totalCount}-question practice set is ready.`,
                actionExecutionState: 'COMPLETED',
                actionResult
              }
            : msg
        )
      );

      setTimelineRefreshKey((k) => k + 1);
    } catch (err: any) {
      setConversation((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                actionExecutionState: 'FAILED',
                actionResult: {
                  title: 'Execution Interrupted',
                  status: 'failed',
                  errorMessage: err?.message || 'Jarvis encountered an error preparing this practice set.'
                }
              }
            : msg
        )
      );
    }
  };

  /**
   * Handles user confirming an action requiring confirmation
   */
  const handleConfirmAction = async (messageId: string, pendingActionId?: string) => {
    if (pendingActionId) {
      try {
        await actionExperienceClient.confirmPendingAction(pendingActionId);
      } catch (err) {
        console.warn('Pending action confirmation:', err);
      }
    }
    const targetMsg = conversation.find((m) => m.id === messageId);
    if (targetMsg?.actionPreview) {
      await handleExecuteAction(messageId, targetMsg.actionPreview);
    }
  };

  /**
   * Handles user cancelling an action
   */
  const handleCancelAction = async (messageId: string, pendingActionId?: string) => {
    if (pendingActionId) {
      try {
        await actionExperienceClient.cancelPendingAction(pendingActionId);
      } catch (err) {
        console.warn('Pending action cancel error:', err);
      }
    }
    setConversation((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: 'Action cancelled. No modifications were performed.',
              actionExecutionState: 'CANCELLED'
            }
          : msg
      )
    );
  };

  /**
   * Handles user undoing a reversible action
   */
  const handleUndoAction = async (messageId: string, undoToken?: string) => {
    if (undoToken) {
      await actionExperienceClient.undoActivity(undoToken);
      setTimelineRefreshKey((k) => k + 1);
    }
    setConversation((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              actionResult: msg.actionResult ? { ...msg.actionResult, isUndone: true } : undefined
            }
          : msg
      )
    );
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const prompt = text.trim();
    setInputQuery('');
    const userMsgId = `msg-u-${Date.now()}`;
    setConversation((prev) => [...prev, { id: userMsgId, role: 'user', content: prompt }]);
    setIsLoading(true);

    try {
      const lower = prompt.toLowerCase();
      const isKnowledgeRequest =
        activeMode === 'reuse' ||
        lower.includes('quadratic') ||
        lower.includes('knowledge asset') ||
        lower.includes('reused') ||
        lower.includes('reuse') ||
        (lower.includes('question') && (lower.includes('pdf') || lower.includes('20') || lower.includes('30') || lower.includes('create') || lower.includes('make')));

      if (isKnowledgeRequest) {
        // Parse requested count or default to 20
        const countMatch = prompt.match(/\b(\d+)\s*(questions?|items?)\b/i);
        const requestedCount = countMatch ? parseInt(countMatch[1], 10) : 20;

        // Deterministically evaluate reuse decision engine
        const evalDecision = await knowledgeAssetClient.evaluateReuse({
          subject: 'Mathematics',
          topic: 'Quadratic Equations',
          educationLevel: 'Class 10',
          difficulty: 'intermediate',
          questionCount: requestedCount
        });

        const asset = evalDecision?.asset;
        const availableCount = asset?.questionCount || 30;

        const isMore = lower.includes('more');
        const isReview = lower.includes('review') || lower.includes('missed') || lower.includes('retention');
        const isWeak = lower.includes('weak') || lower.includes('struggle') || lower.includes('mistake');
        const isMixed = lower.includes('mixed');

        const noveltyMode: string = isReview
          ? 'REVIEW'
          : isWeak
          ? 'WEAKNESS_PRACTICE'
          : isMixed
          ? 'MIXED'
          : isMore
          ? 'MORE'
          : 'NEW';

        let exposureSummary: any = null;
        try {
          exposureSummary = await actionExperienceClient.getExposureSummary('Quadratic Equations');
        } catch {}

        const seenCount = exposureSummary?.totalSeen || 0;
        const unseenInAsset = Math.max(0, availableCount - seenCount);

        let willReuse = 0;
        let willGenerate = 0;
        let reviewCount = 0;

        if (noveltyMode === 'REVIEW') {
          reviewCount = Math.min(requestedCount, seenCount || requestedCount);
          willReuse = reviewCount;
          willGenerate = Math.max(0, requestedCount - reviewCount);
        } else if (noveltyMode === 'NEW' || noveltyMode === 'MORE') {
          willReuse = Math.min(requestedCount, unseenInAsset);
          willGenerate = Math.max(0, requestedCount - willReuse);
        } else {
          willReuse = Math.min(requestedCount, availableCount);
          willGenerate = Math.max(0, requestedCount - willReuse);
        }

        let planSummary = '';
        if (noveltyMode === 'REVIEW') {
          planSummary = `Reviewing ${reviewCount} previously missed questions${willGenerate > 0 ? `, practicing ${willGenerate} new questions` : ''}`;
        } else if (willReuse > 0 && willGenerate > 0) {
          planSummary = `Reusing ${willReuse} unseen verified questions · Adapting ${willGenerate} questions${seenCount > 0 ? ` (${seenCount} seen previously)` : ''}`;
        } else if (willReuse > 0) {
          planSummary = `Reusing ${willReuse} unseen verified questions (out of ${availableCount} available)`;
        } else {
          planSummary = `No suitable unseen knowledge found · Generate ${requestedCount} new questions`;
        }

        const previewData: ActionPreviewData = {
          id: `prev-${Date.now()}`,
          actionType: 'practice_set_create',
          title: `Create ${requestedCount} practice questions`,
          rationale: `Curated from existing curriculum knowledge for Quadratic Equations with ${noveltyMode} mode.`,
          source: {
            type: asset ? (willGenerate === 0 ? 'EXISTING_VERIFIED' : 'ADAPTED') : 'NEWLY_GENERATED',
            title: asset ? asset.title : 'Curriculum Question Generator',
            assetId: asset?.id,
            details: asset ? `Validated Class 10 resource · ${availableCount} verified items available` : undefined,
            verified: asset?.validation?.status === 'VALIDATED'
          },
          plan: {
            totalItems: requestedCount,
            reusedItems: willReuse,
            generatedItems: willGenerate,
            unseenAvailable: unseenInAsset,
            previouslySeen: seenCount,
            reviewItems: reviewCount,
            novelItems: willReuse,
            noveltyMode,
            summary: planSummary
          },
          riskLevel: 'LOW_RISK_WRITE',
          requiresConfirmation: false,
          canUndo: true,
          undoLabel: 'Undo creation',
          payload: {
            subject: 'Mathematics',
            topic: 'Quadratic Equations',
            educationLevel: 'Class 10',
            difficulty: 'intermediate',
            questionCount: requestedCount,
            noveltyMode
          }
        };


        const assistantMsgId = `msg-a-${Date.now()}`;
        const conversationalIntro = asset
          ? 'Found a verified question set from your existing knowledge.'
          : 'I have analyzed your curriculum track and can synthesize a calibrated practice set.';

        setConversation((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: conversationalIntro,
            actionPreview: previewData,
            actionExecutionState: 'PREVIEW'
          }
        ]);

        setIsLoading(false);
        return;
      }

      // Check for High-Risk action intent (e.g. deletion)
      if (lower.includes('delete note') || lower.includes('purge notes') || lower.includes('delete all notes')) {
        const previewData: ActionPreviewData = {
          id: `prev-del-${Date.now()}`,
          actionType: 'notes_delete',
          title: 'Delete Personal Study Notes',
          rationale: 'Purge selected notes from persistent personal storage.',
          source: {
            type: 'EXISTING_VERIFIED',
            title: 'Personal Notes Repository'
          },
          plan: {
            totalItems: 1,
            reusedItems: 0,
            generatedItems: 0,
            summary: 'Permanently remove target notes from local storage'
          },
          riskLevel: 'HIGH_RISK_WRITE',
          requiresConfirmation: true,
          canUndo: false, // Irreversible deletion cannot be undone!
          payload: { deleteAll: lower.includes('all') }
        };

        const assistantMsgId = `msg-a-${Date.now()}`;
        setConversation((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: '⚠️ This action requires explicit confirmation before execution.',
            actionPreview: previewData,
            actionExecutionState: 'CONFIRMATION_REQUIRED'
          }
        ]);

        setIsLoading(false);
        return;
      }

      // Standard chat fallback
      const response = await onSendMessage(prompt);
      setConversation((prev) => [
        ...prev,
        {
          id: `msg-a-${Date.now()}`,
          role: 'assistant',
          content: response
        }
      ]);
    } catch (err: any) {
      setConversation((prev) => [
        ...prev,
        {
          id: `msg-a-${Date.now()}`,
          role: 'assistant',
          content: 'Apologies, I encountered an issue retrieving that study synthesis. Please retry.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentPreset = modePresets.find((m) => m.id === activeMode) || modePresets[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-cyan-500/20 bg-black/40 p-4 rounded-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            Jarvis Academic // Action Experience & Reusable Memory
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            AI Study Partner & Curriculum Tutor
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Activity Timeline Toggle Button */}
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              showTimeline
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-black/40 border-cyan-500/30 text-cyan-400/80 hover:text-cyan-200 hover:border-cyan-400/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Activity History</span>
            {showTimeline ? (
              <ChevronUp className="w-3 h-3 text-cyan-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-cyan-400" />
            )}
          </button>

          <div className="text-xs font-mono text-cyan-400/70">
            Role: <strong className="text-cyan-300 uppercase">{currentRole} Mode</strong>
          </div>
        </div>
      </div>

      {/* Collapsible Activity Timeline Drawer */}
      {showTimeline && (
        <div className="transition-all">
          <ActionActivityTimeline
            contextType="EDUCATION"
            onRefreshTrigger={timelineRefreshKey}
          />
        </div>
      )}

      {/* Mode Selector Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {modePresets.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === activeMode;

          return (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setInputQuery(mode.sample);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/60 to-black/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'border-cyan-500/15 bg-black/30 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-cyan-400/70'}`} />
                <span className={`text-[11px] font-bold font-mono truncate ${isActive ? 'text-white' : 'text-cyan-200'}`}>
                  {mode.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Conversation Container */}
      <div className="rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm overflow-hidden flex flex-col h-[540px]">
        {/* Chat History Messages */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              )}

              <div
                className={`p-4 rounded-xl text-xs font-mono leading-relaxed whitespace-pre-line max-w-[90%] md:max-w-[85%] space-y-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-400/40 text-white self-end'
                    : 'bg-black/60 border border-cyan-500/20 text-cyan-100/90'
                }`}
              >
                <div>{msg.content}</div>

                {/* Reusable Action Preview Experience Component */}
                {msg.actionPreview && (
                  <div className="mt-2 not-italic">
                    <ActionPreviewCard
                      preview={msg.actionPreview}
                      executionState={msg.actionExecutionState || 'PREVIEW'}
                      result={msg.actionResult}
                      currentExecutionStep={msg.executionStep}
                      onProceed={() => handleExecuteAction(msg.id, msg.actionPreview!)}
                      onConfirm={(pendingActionId) => handleConfirmAction(msg.id, pendingActionId)}
                      onCancel={() => handleCancelAction(msg.id, msg.actionPreview?.pendingActionId)}
                      onRetry={() => handleExecuteAction(msg.id, msg.actionPreview!)}
                      onUndo={() => handleUndoAction(msg.id, msg.actionResult?.undoToken)}
                      onStartPractice={() => {
                        if (onStartPractice) {
                          onStartPractice();
                        } else if (onNavigateToKnowledgeAssets) {
                          onNavigateToKnowledgeAssets();
                        }
                      }}
                      onDownloadPdf={() => {
                        if (msg.actionResult?.assetId) {
                          handleDownloadPdf(msg.actionResult.assetId, msg.actionResult.assetTitle || 'Practice Set');
                        }
                      }}
                      onViewKnowledge={onNavigateToKnowledgeAssets}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              </div>
              <div className="p-3.5 rounded-xl bg-black/60 border border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                Jarvis is evaluating curriculum knowledge repository...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-cyan-500/20 bg-black/80">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputQuery);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={currentPreset.placeholder}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 rounded-lg border border-cyan-500/30 bg-black/60 px-4 py-2.5 text-xs text-white placeholder-cyan-400/40 outline-none focus:border-cyan-400 font-mono"
            />

            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs font-mono tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              ASK JARVIS
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
