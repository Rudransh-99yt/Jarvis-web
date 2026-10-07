import React, { useState, useEffect } from 'react';
import type { CourseLesson, CourseUnit, EducationClass } from '../../../types/education.ts';
import type {
  PracticeSet,
  SelectedQuestionItem,
  QuestionSourceMode,
  MasteryEvidence
} from '../../../types/questionIntelligence.ts';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  Globe,
  Cpu,
  HelpCircle,
  Compass,
  TrendingUp,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';

interface LessonPracticeViewProps {
  course: EducationClass;
  unit: CourseUnit;
  lesson: CourseLesson;
  onBackToLesson: () => void;
  onCompletePractice?: (score: number, total: number) => void;
}

export const LessonPracticeView: React.FC<LessonPracticeViewProps> = ({
  course,
  unit,
  lesson,
  onBackToLesson,
  onCompletePractice
}) => {
  const [sourceMode, setSourceMode] = useState<QuestionSourceMode>('FULL_ADAPTIVE');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Per-question answering state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, any>>({});
  const [selectedConfidence, setSelectedConfidence] = useState<Record<number, number>>({});
  const [evaluatedEvidence, setEvaluatedEvidence] = useState<Record<number, MasteryEvidence>>({});
  const [evaluatingIndex, setEvaluatingIndex] = useState<number | null>(null);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pointsReward, setPointsReward] = useState<number | null>(null);
  const [conceptMasteryScore, setConceptMasteryScore] = useState<number>(0.65);

  // Fetch adaptive practice set whenever lesson or sourceMode changes
  useEffect(() => {
    let isMounted = true;
    async function loadPracticeSet() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/education/question-intelligence/practice-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: course.department || course.name || 'Physics',
            targetConcept: lesson.title || "Newton's Laws",
            overallMastery: 0.65,
            conceptMastery: { [lesson.title]: conceptMasteryScore },
            prerequisiteMastery: {
              'Mass and Inertia': 0.8,
              'Vector Decomposition': 0.55
            },
            recentAccuracy: 0.72,
            confidence: 0.75,
            sourceMode,
            targetCount: 8
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.practiceSet) {
            setPracticeSet(data.practiceSet);
            setSelectedAnswers({});
            setSelectedConfidence({});
            setEvaluatedEvidence({});
            setCurrentQuestionIndex(0);
            setIsSubmitted(false);
          }
        }
      } catch (err) {
        console.error('Failed to load practice set:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPracticeSet();
    return () => {
      isMounted = false;
    };
  }, [lesson.id, lesson.title, course.department, course.name, sourceMode]);

  // Fallback questions if offline or initial load
  const currentItems: SelectedQuestionItem[] = practiceSet?.questions || [];
  const currentItem = currentItems[currentQuestionIndex];
  const currentQ = currentItem?.question;

  const currentAnswer = selectedAnswers[currentQuestionIndex];
  const currentConfidenceLevel = selectedConfidence[currentQuestionIndex] ?? 0.7;
  const currentEvidence = evaluatedEvidence[currentQuestionIndex];

  // Evaluate current question answer on-the-fly to provide immediate mastery evidence
  const handleCheckAnswer = async () => {
    if (!currentQ || currentAnswer === undefined || currentEvidence) return;
    setEvaluatingIndex(currentQuestionIndex);

    try {
      const res = await fetch('/api/education/question-intelligence/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          learnerAnswer: currentAnswer,
          timeSpentSeconds: 45,
          learnerConfidence: currentConfidenceLevel,
          currentConceptMastery: conceptMasteryScore
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.evidence) {
          setEvaluatedEvidence((prev) => ({
            ...prev,
            [currentQuestionIndex]: data.evidence
          }));
          if (typeof data.evidence.updatedConceptMastery === 'number') {
            setConceptMasteryScore(data.evidence.updatedConceptMastery);
          }
        }
      }
    } catch (err) {
      console.error('Error evaluating answer:', err);
    } finally {
      setEvaluatingIndex(null);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < currentItems.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleFinishPractice = async () => {
    setIsSubmitted(true);
    let correctCount = 0;
    currentItems.forEach((_, idx) => {
      if (evaluatedEvidence[idx]?.isCorrect) {
        correctCount += 1;
      }
    });

    onCompletePractice?.(correctCount, currentItems.length);

    // Call server engagement API for verified +10 engagement points
    try {
      const res = await fetch('/api/education/engagement/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'practice_completed',
          title: `Jarvis Adaptive Practice: ${lesson.title}`,
          description: `Scored ${correctCount}/${currentItems.length} on adaptive practice (${sourceMode} mode).`,
          sourceEntityType: 'practice',
          sourceEntityId: `${lesson.id}-practice`,
          classId: course.id,
          courseCode: course.code,
          metadata: {
            unitId: unit.id,
            lessonId: lesson.id,
            score: correctCount,
            total: currentItems.length,
            sourceMode,
            finalConceptMastery: conceptMasteryScore
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPointsReward(data.pointsAwarded);
      }
    } catch (_err) {
      // Non-blocking
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setSelectedConfidence({});
    setEvaluatedEvidence({});
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setPointsReward(null);
  };

  const totalAnswered = Object.keys(evaluatedEvidence).length;
  const correctCount = Object.values(evaluatedEvidence).filter((e) => e.isCorrect).length;
  const scorePercentage = currentItems.length > 0 ? Math.round((correctCount / currentItems.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* 1. Header & Source Mode Controls */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider uppercase">J.A.R.V.I.S. Adaptive Practice</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Based on your current understanding of {lesson.title}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Calibrated practice set targeting source derivations, prerequisite gaps, and conceptual mastery.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-right shrink-0">
            <span className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold">
              +10 Engagement Pts
            </span>
          </div>
        </div>

        {/* Source Mode Selector (Book-Only vs Adaptive) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
            <span className="px-2 text-slate-400 text-[11px] font-semibold uppercase">Source Mode:</span>
            <button
              type="button"
              onClick={() => setSourceMode('SOURCE_ONLY')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sourceMode === 'SOURCE_ONLY'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Book-Only
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('SOURCE_PLUS_JARVIS')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sourceMode === 'SOURCE_PLUS_JARVIS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Source + Jarvis
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('SOURCE_PLUS_WEB')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sourceMode === 'SOURCE_PLUS_WEB'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Source + Web
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('FULL_ADAPTIVE')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                sourceMode === 'FULL_ADAPTIVE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Adaptive
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Concept Mastery:</span>
            <span className="text-cyan-400 font-bold">{Math.round(conceptMasteryScore * 100)}%</span>
          </div>
        </div>

        {/* Explainable Selection Rationale Banner */}
        {practiceSet && (
          <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-xs space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-mono font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Jarvis Selection Rationale</span>
            </div>
            <p className="text-slate-300 font-sans leading-relaxed">
              {practiceSet.selectionRationale}
            </p>

            {/* Breakdown Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                {practiceSet.totalQuestions} questions total
              </span>
              {practiceSet.breakdown.sourceGroundedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {practiceSet.breakdown.sourceGroundedCount} from your material
                </span>
              )}
              {practiceSet.breakdown.prerequisiteCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {practiceSet.breakdown.prerequisiteCount} prerequisite diagnosis
                </span>
              )}
              {practiceSet.breakdown.applicationCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-950/50 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {practiceSet.breakdown.applicationCount} application
                </span>
              )}
              {practiceSet.breakdown.challengeCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {practiceSet.breakdown.challengeCount} challenge
                </span>
              )}
            </div>
          </div>
        )}

        {/* Question Stepper */}
        {currentItems.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-2 font-mono text-xs">
            <span className="text-slate-400">
              Question <span className="text-white font-bold">{currentQuestionIndex + 1}</span> of {currentItems.length}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentItems.map((item, idx) => {
                const evidence = evaluatedEvidence[idx];
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = selectedAnswers[idx] !== undefined;

                return (
                  <button
                    type="button"
                    key={item.question.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : evidence
                        ? evidence.isCorrect
                          ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                          : 'border border-red-500/50 bg-red-500/20 text-red-300'
                        : isAnswered
                        ? 'border border-slate-700 bg-slate-800 text-white'
                        : 'border border-slate-800 bg-slate-950/60 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Loading State */}
      {isLoading && (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-xs">
          <Sparkles className="w-5 h-5 mx-auto mb-2 text-cyan-400 animate-pulse" />
          <span>Jarvis Question Engine calibrating adaptive practice set...</span>
        </div>
      )}

      {/* 3. Primary Question Body */}
      {!isLoading && !isSubmitted && currentQ && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-6">
          {/* Question Metadata & Attribution Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              {/* Origin Badge */}
              {currentQ.source === 'SOURCE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono">
                  <BookOpen className="w-3 h-3 text-cyan-400" />
                  <span>
                    Source Document {currentQ.sourceReference?.pageNumber ? `• Page ${currentQ.sourceReference.pageNumber}` : ''}
                  </span>
                </span>
              )}
              {currentQ.source === 'JARVIS_GENERATED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>Jarvis Generated</span>
                </span>
              )}
              {currentQ.source === 'WEB_RETRIEVED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-mono">
                  <Globe className="w-3 h-3 text-indigo-400" />
                  <span>Web Context</span>
                </span>
              )}

              {/* Type Badge */}
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                {currentQ.questionType.replace('_', ' ')}
              </span>

              {/* Difficulty Badge */}
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                currentQ.difficulty === 'challenge'
                  ? 'bg-red-950/40 border border-red-500/30 text-red-300'
                  : currentQ.difficulty === 'advanced'
                  ? 'bg-purple-950/40 border border-purple-500/30 text-purple-300'
                  : currentQ.difficulty === 'intermediate'
                  ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-300'
                  : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
              }`}>
                {currentQ.difficulty}
              </span>
            </div>

            {/* Why Jarvis Selected This Question */}
            {currentItem?.selectionReason && (
              <span className="text-[11px] font-mono text-slate-400 italic">
                {currentItem.selectionReason}
              </span>
            )}
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed font-sans">
              {currentQ.prompt}
            </h2>
            {currentQ.sourceReference?.snippet && (
              <p className="text-xs font-mono text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-cyan-400 font-semibold">Excerpts from source:</span> &ldquo;{currentQ.sourceReference.snippet}&rdquo;
              </p>
            )}
          </div>

          {/* Answer Controls: Multiple Choice or Numerical */}
          {currentQ.options && currentQ.options.length > 0 ? (
            <div className="space-y-2.5">
              {currentQ.options.map((option, optIdx) => {
                const isSelected = currentAnswer === option || currentAnswer === optIdx;
                const isLocked = Boolean(currentEvidence);

                return (
                  <button
                    type="button"
                    key={optIdx}
                    disabled={isLocked}
                    onClick={() => {
                      if (!isLocked) {
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [currentQuestionIndex]: option
                        }));
                      }
                    }}
                    className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-400/80 bg-cyan-500/15 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                    } ${isLocked ? 'cursor-default' : ''}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full border text-xs font-mono flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-400 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="text-sm font-sans leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            // Numerical / Short Answer Input
            <div className="space-y-3">
              <label className="block text-xs font-mono text-slate-400 uppercase">
                Enter numerical or symbolic answer:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  disabled={Boolean(currentEvidence)}
                  value={currentAnswer ?? ''}
                  onChange={(e) => {
                    setSelectedAnswers((prev) => ({
                      ...prev,
                      [currentQuestionIndex]: e.target.value
                    }));
                  }}
                  placeholder="e.g. 2.5 or F_net/m"
                  className="flex-1 p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Metacognitive Confidence Selector */}
          {!currentEvidence && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>Metacognitive Confidence:</span>
              </span>
              <div className="flex items-center gap-2">
                {[
                  { label: 'Low', val: 0.35 },
                  { label: 'Medium', val: 0.70 },
                  { label: 'High', val: 0.95 }
                ].map(({ label, val }) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => {
                      setSelectedConfidence((prev) => ({
                        ...prev,
                        [currentQuestionIndex]: val
                      }));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      currentConfidenceLevel === val
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation Action Button */}
          {!currentEvidence && currentAnswer !== undefined && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCheckAnswer}
                disabled={evaluatingIndex === currentQuestionIndex}
                className="w-full py-3 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verify Answer & Generate Mastery Evidence</span>
              </button>
            </div>
          )}

          {/* Instant Mastery Evidence Feedback Card */}
          {currentEvidence && (
            <div className={`p-4 rounded-xl border text-xs space-y-3 font-sans animate-fade-in ${
              currentEvidence.isCorrect
                ? 'border-emerald-500/40 bg-emerald-950/20'
                : 'border-amber-500/40 bg-amber-950/20'
            }`}>
              <div className="flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  {currentEvidence.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className={`font-bold ${currentEvidence.isCorrect ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {currentEvidence.feedback.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    Mastery: {currentEvidence.masteryDelta >= 0 ? `+${currentEvidence.masteryDelta}` : currentEvidence.masteryDelta}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                    {currentEvidence.confidenceAlignment.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Misconception Analysis (if diagnosed) */}
              {currentEvidence.feedback.misconceptionAnalysis && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs">
                  <div className="font-mono font-bold text-[11px] text-amber-400 uppercase tracking-wider mb-0.5">
                    Diagnosed Misconception:
                  </div>
                  <p>{currentEvidence.feedback.misconceptionAnalysis}</p>
                </div>
              )}

              {/* Explanation */}
              <div className="text-slate-300 space-y-1">
                <div className="font-mono font-semibold text-[11px] text-cyan-400 uppercase tracking-wider">
                  Pedagogical Derivation
                </div>
                <p className="leading-relaxed">{currentEvidence.feedback.explanation}</p>
              </div>

              {/* Next Recommended Action */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-300 font-bold">
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>Next Recommended Action: {currentEvidence.feedback.nextRecommendedAction.action.replace('_', ' ')}</span>
                </div>
                <p className="text-slate-400">
                  {currentEvidence.feedback.nextRecommendedAction.reason}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 min-h-[38px] rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>

            {currentQuestionIndex < currentItems.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-xl border border-cyan-500/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishPractice}
                disabled={totalAnswered === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 min-h-[40px] rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Complete Practice Set</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Results & Mastery Evidence Summary */}
      {!isLoading && isSubmitted && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-300">
              <Award className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Practice Completed!
              </h2>
              <p className="text-sm font-mono text-slate-300">
                You verified <span className="text-emerald-400 font-bold">{correctCount}</span> / {currentItems.length} concepts ({scorePercentage}%)
              </p>
              <p className="text-xs font-mono text-cyan-400">
                Updated Concept Mastery: {Math.round(conceptMasteryScore * 100)}%
              </p>
            </div>

            {pointsReward !== null && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-purple-500/40 bg-purple-950/40 text-purple-300 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  {pointsReward > 0 ? `+${pointsReward} Engagement Points Awarded to Leaderboard` : 'Verified (Already Rewarded)'}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-mono hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Practice</span>
              </button>

              <button
                type="button"
                onClick={onBackToLesson}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Return to Study Room</span>
              </button>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
              Detailed Conceptual Review & Provenance
            </h3>

            <div className="space-y-3">
              {currentItems.map((item, idx) => {
                const q = item.question;
                const evidence = evaluatedEvidence[idx];
                const isCorrect = evidence?.isCorrect ?? false;

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400">Question {idx + 1}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-cyan-400">{q.source}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                        isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-white font-sans">{q.prompt}</p>

                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-300 space-y-1 font-sans">
                      <div className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-wider">
                        Explanation
                      </div>
                      <p className="leading-relaxed">{q.explanation}</p>
                      {q.citation && (
                        <div className="text-[11px] font-mono text-slate-400 pt-1">
                          Citation: {q.citation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
