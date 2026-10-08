import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  HelpCircle,
  BookOpen,
  Zap,
  Download,
  Eye,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronRight,
  X,
  Play,
  RotateCcw,
  Sliders,
  ExternalLink
} from 'lucide-react';
import type { KnowledgeAsset, KnowledgeAssetType } from '../../../types/knowledgeAsset.ts';
import { knowledgeAssetClient, type GenerateOrReuseResult } from '../../../services/knowledgeAssetClient.ts';

interface KnowledgeAssetsViewProps {
  onBackToHome?: () => void;
  onOpenPracticeWithAsset?: (asset: KnowledgeAsset, questionCount?: number) => void;
  initialFilterType?: KnowledgeAssetType;
}

export const KnowledgeAssetsView: React.FC<KnowledgeAssetsViewProps> = ({
  onBackToHome,
  onOpenPracticeWithAsset,
  initialFilterType
}) => {
  // Data state
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<KnowledgeAssetType | 'ALL'>(initialFilterType || 'ALL');

  // Asset Inspection Modal state
  const [inspectingAsset, setInspectingAsset] = useState<KnowledgeAsset | null>(null);

  // Quick Reuse / Generator Request state
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [genSubject, setGenSubject] = useState<string>('Mathematics');
  const [genTopic, setGenTopic] = useState<string>('Quadratic Equations');
  const [genLevel, setGenLevel] = useState<string>('Class 10');
  const [genCount, setGenCount] = useState<number>(20);
  const [genWithPdf, setGenWithPdf] = useState<boolean>(true);

  // Jarvis Reuse Status Sequence state (Task 3)
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [reuseStatusStep, setReuseStatusStep] = useState<
    'idle' | 'searching' | 'found' | 'reusing' | 'adapting' | 'generating' | 'completed'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<{ title: string; subtitle: string }>({
    title: '',
    subtitle: ''
  });
  const [generationResult, setGenerationResult] = useState<GenerateOrReuseResult | null>(null);

  // Flashcard flip tracking in modal
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // Load knowledge assets
  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const criteria: any = {};
      if (selectedType !== 'ALL') {
        criteria.assetType = selectedType;
      }
      const data = await knowledgeAssetClient.searchAssets(criteria);
      setAssets(data);
    } catch (err) {
      console.error('Failed to load knowledge assets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [selectedType]);

  // Client search filtering
  const filteredAssets = assets.filter((asset) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      asset.title.toLowerCase().includes(q) ||
      asset.topic.toLowerCase().includes(q) ||
      asset.subject.toLowerCase().includes(q) ||
      asset.concepts?.some((c) => c.toLowerCase().includes(q)) ||
      asset.educationLevel.toLowerCase().includes(q)
    );
  });

  // Handle PDF Download
  const handleDownloadPdf = async (asset: KnowledgeAsset) => {
    try {
      const filename = `${asset.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await knowledgeAssetClient.downloadPdfBlob(asset.id, filename);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      // Fallback: open stream URL directly
      window.open(knowledgeAssetClient.getPdfUrl(asset.id, true), '_blank');
    }
  };

  // Run the Real Jarvis Reuse & Generation flow (Task 3 & Task 4)
  const handleExecuteReuseOrGenerate = async () => {
    setIsEvaluating(true);
    setGenerationResult(null);

    try {
      // Step 1: Searching
      setReuseStatusStep('searching');
      setStatusMessage({
        title: 'SEARCHING KNOWLEDGE ASSETS',
        subtitle: `Analyzing verified repository for ${genLevel} ${genTopic}...`
      });
      await new Promise((r) => setTimeout(r, 600));

      // Step 2: Evaluation with backend
      const evalDecision = await knowledgeAssetClient.evaluateReuse({
        subject: genSubject,
        topic: genTopic,
        educationLevel: genLevel,
        difficulty: 'intermediate',
        questionCount: genCount
      });

      if (evalDecision && evalDecision.decision === 'REUSE' && evalDecision.asset) {
        setReuseStatusStep('found');
        setStatusMessage({
          title: 'FOUND EXISTING KNOWLEDGE',
          subtitle: `"${evalDecision.asset.title}"`
        });
        await new Promise((r) => setTimeout(r, 700));

        setReuseStatusStep('reusing');
        setStatusMessage({
          title: 'REUSING VERIFIED QUESTIONS',
          subtitle: `Reusing ${evalDecision.matchedQuestions?.length || genCount} verified questions without AI regeneration`
        });
        await new Promise((r) => setTimeout(r, 700));
      } else if (evalDecision && evalDecision.decision === 'ADAPT' && evalDecision.asset) {
        setReuseStatusStep('adapting');
        const reused = evalDecision.matchedQuestions?.length || 0;
        const missing = evalDecision.missingQuestionCount || (genCount - reused);
        setStatusMessage({
          title: 'ADAPTING EXISTING ASSET',
          subtitle: `${reused} verified questions reused · ${missing} newly generated`
        });
        await new Promise((r) => setTimeout(r, 800));
      } else {
        setReuseStatusStep('generating');
        setStatusMessage({
          title: 'CREATING NEW QUESTION SET',
          subtitle: 'No suitable verified asset found. Synthesizing new curriculum-aligned set...'
        });
        await new Promise((r) => setTimeout(r, 800));
      }

      // Step 3: Real generate or reuse execution
      const result = await knowledgeAssetClient.generateOrReuse({
        subject: genSubject,
        topic: genTopic,
        educationLevel: genLevel,
        difficulty: 'intermediate',
        questionCount: genCount,
        generatePdf: genWithPdf,
        sharedWithInstitution: true
      });

      setGenerationResult(result);
      setReuseStatusStep('completed');
      setStatusMessage({
        title: 'COMPLETED',
        subtitle: genWithPdf ? 'Your verified question set & PDF document are ready.' : 'Your verified question set is ready.'
      });

      // Refresh list to include newly registered artifact
      await fetchAssets();
    } catch (err: any) {
      console.error('Reuse/generate error:', err);
      setStatusMessage({
        title: 'PROCESS ERROR',
        subtitle: err?.message || 'Failed to complete knowledge asset operation.'
      });
      setReuseStatusStep('idle');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Helper: icon per asset type
  const getAssetTypeIcon = (type: KnowledgeAssetType) => {
    switch (type) {
      case 'QUESTION_SET':
        return <HelpCircle className="w-4 h-4 text-cyan-400" />;
      case 'PDF':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'NOTES':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'FLASHCARD_SET':
        return <Zap className="w-4 h-4 text-amber-400" />;
    }
  };

  // Helper: human readable type
  const getAssetTypeLabel = (type: KnowledgeAssetType) => {
    switch (type) {
      case 'QUESTION_SET':
        return 'Question Set';
      case 'PDF':
        return 'PDF Document';
      case 'NOTES':
        return 'Formula Notes';
      case 'FLASHCARD_SET':
        return 'Flashcard Deck';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* 1. Header: Liquid Glass Atmospheric Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>JARVIS KNOWLEDGE INTELLIGENCE · PERSISTENT MEMORY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Knowledge Assets & Reuse
          </h1>
          <p className="text-xs text-neutral-400 max-w-2xl">
            Verified curriculum artifacts, past diagnostics, and reusable study materials. Jarvis deterministically reuses validated work before generating new content.
          </p>
        </div>

        {/* Action Button: Quick Reuse & Generator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setIsGeneratorOpen(!isGeneratorOpen);
              setGenerationResult(null);
              setReuseStatusStep('idle');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium text-xs font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.12)] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{isGeneratorOpen ? 'Close Generator' : 'Request or Reuse'}</span>
          </button>

          <button
            onClick={fetchAssets}
            disabled={isLoading}
            title="Refresh Knowledge Assets"
            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Interactive Request / Reuse Sheet (Task 3 & Task 4 Experience) */}
      {isGeneratorOpen && (
        <div className="p-5 sm:p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 via-black/60 to-black/80 backdrop-blur-xl space-y-5 transition-all animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Deterministic Knowledge Reuse & Generation Engine
                </h3>
                <p className="text-xs text-neutral-400">
                  Request any question count. Jarvis searches existing verified assets, reuses matching items, and only generates what is missing.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsGeneratorOpen(false)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Buttons for Quick Testing (e.g. Student A / Student B) */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="text-neutral-500 self-center">Presets:</span>
            <button
              onClick={() => {
                setGenSubject('Mathematics');
                setGenTopic('Quadratic Equations');
                setGenLevel('Class 10');
                setGenCount(20);
                setGenWithPdf(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300 border border-white/10 transition-colors"
            >
              Student B: 20 Questions (Reuse 20 from 30)
            </button>
            <button
              onClick={() => {
                setGenSubject('Mathematics');
                setGenTopic('Quadratic Equations');
                setGenLevel('Class 10');
                setGenCount(40);
                setGenWithPdf(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 border border-white/10 transition-colors"
            >
              Adapt: 40 Questions (Reuse 30 + Generate 10)
            </button>
            <button
              onClick={() => {
                setGenSubject('Physics');
                setGenTopic('Electromagnetic Induction');
                setGenLevel('Class 12');
                setGenCount(15);
                setGenWithPdf(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border border-white/10 transition-colors"
            >
              New Topic: Physics EMI (Fresh Generation)
            </button>
          </div>

          {/* Input Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-mono uppercase text-neutral-400 font-semibold mb-1 block">
                Subject
              </label>
              <input
                type="text"
                value={genSubject}
                onChange={(e) => setGenSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-neutral-400 font-semibold mb-1 block">
                Topic
              </label>
              <input
                type="text"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-neutral-400 font-semibold mb-1 block">
                Education Level
              </label>
              <input
                type="text"
                value={genLevel}
                onChange={(e) => setGenLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-cyan-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-neutral-400 font-semibold mb-1 block">
                Question Count
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={genCount}
                onChange={(e) => setGenCount(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white font-mono focus:border-cyan-400 outline-none"
              />
            </div>
            <div className="flex flex-col justify-end">
              <button
                onClick={handleExecuteReuseOrGenerate}
                disabled={isEvaluating}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)]"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Engine</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Task 3: Lightweight Jarvis Status Progression */}
          {reuseStatusStep !== 'idle' && (
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-black/60 backdrop-blur-md space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider">
                {reuseStatusStep === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                )}
                <span className="text-cyan-300">{statusMessage.title}</span>
              </div>
              <p className="text-xs text-neutral-300 font-mono pl-4 leading-relaxed">
                {statusMessage.subtitle}
              </p>
            </div>
          )}

          {/* Task 4: Polished PDF & Question Result Card */}
          {generationResult && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-md space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {generationResult.decision === 'REUSE'
                        ? 'REUSED'
                        : generationResult.decision === 'ADAPT'
                        ? 'ADAPTED'
                        : 'GENERATED'}
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {generationResult.asset?.title || `${genLevel} ${genTopic} Diagnostic`}
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-200/80 font-mono">
                    {generationResult.decision === 'REUSE' &&
                      `Built from your verified knowledge (${generationResult.reusedCount} reused · 0 regenerated)`}
                    {generationResult.decision === 'ADAPT' &&
                      `${generationResult.reusedCount} reused · ${generationResult.generatedCount} newly generated`}
                    {generationResult.decision === 'GENERATE' &&
                      `Synthesized ${generationResult.generatedCount} questions with curriculum alignment`}
                  </p>
                </div>

                {/* PDF Actions */}
                <div className="flex items-center gap-2">
                  {generationResult.asset && (
                    <>
                      <button
                        onClick={() => handleDownloadPdf(generationResult.asset!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                      <button
                        onClick={() => setInspectingAsset(generationResult.asset!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Items</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Decision Explanation Reasons */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-neutral-400 font-semibold">
                  Verification & Reuse Rationales:
                </span>
                <ul className="text-xs text-neutral-300 font-mono space-y-1 list-disc list-inside">
                  {generationResult.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Controls Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'All Knowledge' },
              { id: 'QUESTION_SET', label: 'Question Sets' },
              { id: 'PDF', label: 'PDF Documents' },
              { id: 'NOTES', label: 'Formula Notes' },
              { id: 'FLASHCARD_SET', label: 'Flashcards' }
            ] as const
          ).map((tab) => {
            const isActive = selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search topic, subject, concept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder-neutral-500 font-mono focus:border-cyan-400 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Assets Grid / Cards (Task 1 & Task 2) */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-neutral-400">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <p className="text-xs font-mono">Loading verified knowledge assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 space-y-3">
          <Layers className="w-8 h-8 text-neutral-500 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-200 font-mono">No Knowledge Assets Found</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery
              ? `No assets matching "${searchQuery}". Try clearing search filter.`
              : 'No assets currently indexed for this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => {
            const isValidated = asset.validation.status === 'VALIDATED';
            const isReusable = asset.reusable;
            const hasPdf = asset.assetType === 'PDF' || Boolean(asset.items && asset.items.length > 0);

            return (
              <div
                key={asset.id}
                className="group relative p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all duration-200 backdrop-blur-md flex flex-col justify-between space-y-4"
              >
                {/* Header: Type, Subject/Topic & Validation Badge */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-black/40 border border-white/10 shrink-0">
                        {getAssetTypeIcon(asset.assetType)}
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                        {getAssetTypeLabel(asset.assetType)}
                      </span>
                      <span className="text-neutral-600">·</span>
                      <span className="text-[11px] font-mono text-cyan-300">
                        {asset.educationLevel}
                      </span>
                    </div>

                    {/* Validation & Reusability Badges */}
                    <div className="flex items-center gap-1.5">
                      {isValidated ? (
                        <span
                          title={`Validated (${Math.round((asset.validation.validationScore || 0.95) * 100)}% score)`}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Validated</span>
                        </span>
                      ) : (
                        <span
                          title="Awaiting verification"
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Unvalidated</span>
                        </span>
                      )}

                      {isReusable && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          Reusable
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors line-clamp-2">
                      {asset.title}
                    </h3>
                    {asset.description && (
                      <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                        {asset.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata Pill Row */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-400">
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-neutral-300">
                    {asset.subject} · {asset.topic}
                  </span>

                  {asset.questionCount !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-cyan-300">
                      {asset.questionCount} {asset.questionCount === 1 ? 'question' : 'questions'}
                    </span>
                  )}

                  {asset.difficulty && (
                    <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] capitalize">
                      {asset.difficulty}
                    </span>
                  )}
                </div>

                {/* Provenance Footer & Supported Real Actions (Task 2) */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="text-[10px] font-mono text-neutral-500 truncate max-w-[200px]" title={asset.provenance.sourceName || asset.provenance.attribution || asset.provenance.type}>
                    {asset.provenance.attribution || asset.provenance.sourceName || asset.provenance.type}
                  </div>

                  {/* Real Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 1. Open / Inspect action */}
                    <button
                      onClick={() => {
                        setInspectingAsset(asset);
                        setActiveFlashcardIndex(0);
                        setIsCardFlipped(false);
                      }}
                      title="Inspect asset details"
                      className="px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-neutral-400" />
                      <span>Open</span>
                    </button>

                    {/* 2. Download PDF action (supported for PDF or question sets) */}
                    {hasPdf && (
                      <button
                        onClick={() => handleDownloadPdf(asset)}
                        title="Download verified PDF document"
                        className="px-2.5 py-1 rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-900/40 text-xs font-mono text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Download className="w-3 h-3 text-cyan-400" />
                        <span>PDF</span>
                      </button>
                    )}

                    {/* 3. Reuse / Practice action */}
                    {isReusable && (
                      <button
                        onClick={() => {
                          if (onOpenPracticeWithAsset) {
                            onOpenPracticeWithAsset(asset, asset.questionCount || 20);
                          } else {
                            // Trigger generator with this topic prefilled
                            setGenSubject(asset.subject);
                            setGenTopic(asset.topic);
                            setGenLevel(asset.educationLevel);
                            setGenCount(asset.questionCount ? Math.min(asset.questionCount, 20) : 20);
                            setIsGeneratorOpen(true);
                          }
                        }}
                        title="Reuse verified questions"
                        className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Reuse</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Asset Detail & Content Inspection Modal */}
      {inspectingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-white/20 bg-neutral-950 p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                    {getAssetTypeLabel(inspectingAsset.assetType)}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {inspectingAsset.subject} · {inspectingAsset.topic} ({inspectingAsset.educationLevel})
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {inspectingAsset.title}
                </h2>
              </div>

              <button
                onClick={() => setInspectingAsset(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Content based on Asset Type */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Provenance & Validation Details */}
              <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-mono space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-neutral-500 block uppercase">Provenance</span>
                    <span className="text-neutral-200">{inspectingAsset.provenance.type}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase">Validator</span>
                    <span className="text-neutral-200">{inspectingAsset.validation.validator || 'Automated'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase">Score</span>
                    <span className="text-emerald-400 font-bold">
                      {Math.round((inspectingAsset.validation.validationScore || 0.95) * 100)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block uppercase">Reusable</span>
                    <span className={inspectingAsset.reusable ? 'text-cyan-400' : 'text-neutral-400'}>
                      {inspectingAsset.reusable ? 'Yes (Verified)' : 'Restricted'}
                    </span>
                  </div>
                </div>

                {inspectingAsset.validation.checksPassed && (
                  <div className="text-[10px] text-neutral-400 pt-1 border-t border-white/[0.06] flex items-center gap-1.5 flex-wrap">
                    <span className="text-neutral-500">Passed checks:</span>
                    {inspectingAsset.validation.checksPassed.map((check, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {check}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Items View: Question Sets */}
              {inspectingAsset.assetType === 'QUESTION_SET' && Array.isArray(inspectingAsset.items) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span>Questions ({inspectingAsset.items.length} items)</span>
                    <span className="text-[10px] text-neutral-500">Deterministic Verified Key</span>
                  </div>

                  <div className="space-y-3">
                    {inspectingAsset.items.map((item: any, idx: number) => (
                      <div
                        key={item.id || idx}
                        className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-cyan-300 font-bold">Q{idx + 1}.</span>
                          <span className="text-[10px] font-mono text-neutral-500 uppercase">
                            {item.difficulty || 'intermediate'} · {item.concept || inspectingAsset.topic}
                          </span>
                        </div>
                        <p className="text-neutral-200 leading-relaxed font-sans font-medium">
                          {item.stem || item.question || item.title}
                        </p>

                        {/* Options */}
                        {Array.isArray(item.options) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {item.options.map((opt: any, oIdx: number) => {
                              const isCorrect = item.correctAnswer === oIdx || item.correctAnswer === opt;
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2 rounded-lg text-xs font-mono border ${
                                    isCorrect
                                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                                      : 'border-white/5 bg-black/40 text-neutral-300'
                                  }`}
                                >
                                  <span className="font-bold mr-1.5 text-neutral-400">
                                    {String.fromCharCode(65 + oIdx)}.
                                  </span>
                                  {typeof opt === 'string' ? opt : opt.text}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {item.explanation && (
                          <div className="text-[11px] text-cyan-200/80 font-mono bg-cyan-950/20 p-2 rounded-lg border border-cyan-500/20">
                            <strong>Solution:</strong> {item.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items View: Formula Notes */}
              {inspectingAsset.assetType === 'NOTES' && (
                <div className="p-4 rounded-xl border border-white/10 bg-black/60 font-mono text-xs leading-relaxed text-neutral-200 whitespace-pre-wrap">
                  {inspectingAsset.metadata?.content || inspectingAsset.description}
                </div>
              )}

              {/* Items View: Flashcard Deck */}
              {inspectingAsset.assetType === 'FLASHCARD_SET' && Array.isArray(inspectingAsset.items) && inspectingAsset.items.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span>Card {activeFlashcardIndex + 1} of {inspectingAsset.items.length}</span>
                    <span>Click card to reveal answer</span>
                  </div>

                  {/* Flashcard container */}
                  <div
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                    className="p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-black/80 text-center min-h-[160px] flex flex-col justify-center items-center cursor-pointer hover:border-amber-400/50 transition-all select-none"
                  >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80 mb-2 font-bold">
                      {isCardFlipped ? 'ANSWER / CONCEPT' : 'PROMPT / FORMULA'}
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-white">
                      {isCardFlipped
                        ? (inspectingAsset.items[activeFlashcardIndex] as any)?.back
                        : (inspectingAsset.items[activeFlashcardIndex] as any)?.front}
                    </p>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <button
                      disabled={activeFlashcardIndex === 0}
                      onClick={() => {
                        setActiveFlashcardIndex((prev) => Math.max(0, prev - 1));
                        setIsCardFlipped(false);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-neutral-300 disabled:opacity-40 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Previous Card
                    </button>
                    <button
                      disabled={Boolean(inspectingAsset.items && activeFlashcardIndex >= inspectingAsset.items.length - 1)}
                      onClick={() => {
                        if (inspectingAsset.items) {
                          setActiveFlashcardIndex((prev) => Math.min(inspectingAsset.items!.length - 1, prev + 1));
                          setIsCardFlipped(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-mono text-neutral-300 disabled:opacity-40 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Next Card
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={() => setInspectingAsset(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-mono text-neutral-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(inspectingAsset)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {inspectingAsset.reusable && (
                  <button
                    onClick={() => {
                      const asset = inspectingAsset;
                      setInspectingAsset(null);
                      if (onOpenPracticeWithAsset) {
                        onOpenPracticeWithAsset(asset, asset.questionCount || 20);
                      } else {
                        setGenSubject(asset.subject);
                        setGenTopic(asset.topic);
                        setGenLevel(asset.educationLevel);
                        setGenCount(asset.questionCount ? Math.min(asset.questionCount, 20) : 20);
                        setIsGeneratorOpen(true);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reuse in Practice</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
