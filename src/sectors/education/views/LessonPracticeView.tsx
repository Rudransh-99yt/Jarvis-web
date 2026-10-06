import React, { useState } from 'react';
import type { CourseLesson, CourseUnit, EducationClass } from '../../../types/education.ts';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Award
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
  // Fallback realistic practice questions if lesson does not define them
  const questions = (lesson.practiceQuestions && lesson.practiceQuestions.length > 0)
    ? lesson.practiceQuestions
    : [
        {
          id: 'q1',
          question: 'What is the physical interpretation of the square of the wave function |Ψ(x,t)|²?',
          options: [
            'Total relativistic kinetic energy of the particle',
            'Probability density of locating the particle at position x at time t',
            'Exact deterministic trajectory in phase space',
            'Phase velocity of the electromagnetic vector potential'
          ],
          correctIndex: 1,
          explanation: "According to the Born interpretation, |Ψ(x,t)|² dV represents the probability of locating the particle within volume element dV."
        },
        {
          id: 'q2',
          question: 'In the time-independent Schrödinger equation ĤΨ = EΨ, what mathematical entity is Ĥ?',
          options: [
            'Hermitian differential operator representing total energy (Hamiltonian)',
            'Scalar potential barrier coefficient',
            'Annihilation creation operator product without ground state offset',
            'Relativistic covariant 4-vector'
          ],
          correctIndex: 0,
          explanation: 'Ĥ is the Hamiltonian operator (kinetic + potential energy), which is Hermitian to guarantee real observable energy eigenvalues.'
        },
        {
          id: 'q3',
          question: 'What normalization condition must any physically admissible bound state wave function satisfy?',
          options: [
            '∫ |Ψ(x)|² dx = 0',
            '∫ |Ψ(x)|² dx = 1 across all space',
            'Ψ(x) → ∞ as x → ±∞',
            'dΨ/dx = 0 everywhere'
          ],
          correctIndex: 1,
          explanation: 'The particle must exist somewhere in the universe with 100% certainty, requiring the spatial integral of probability density to equal 1.'
        }
      ];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pointsReward, setPointsReward] = useState<number | null>(null);

  const currentQ = questions[currentQuestionIndex];
  const selectedOption = selectedAnswers[currentQuestionIndex];

  const handleSelectOption = (optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmitEvaluation = async () => {
    setIsSubmitted(true);
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount += 1;
      }
    });

    onCompletePractice?.(correctCount, questions.length);

    // Call server engagement API for verified +10 engagement points
    try {
      const res = await fetch('/api/education/engagement/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'practice_completed',
          title: `Practice Checkpoint: ${lesson.title}`,
          description: `Scored ${correctCount}/${questions.length} on lesson practice questions.`,
          sourceEntityType: 'practice',
          sourceEntityId: `${lesson.id}-practice`,
          classId: course.id,
          courseCode: course.code,
          metadata: {
            unitId: unit.id,
            lessonId: lesson.id,
            score: correctCount,
            total: questions.length
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
    setIsSubmitted(false);
    setCurrentQuestionIndex(0);
    setPointsReward(null);
  };

  const correctAnswersCount = questions.reduce((acc, q, idx) => {
    return acc + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);

  const scorePercentage = Math.round((correctAnswersCount / questions.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* 2. Practice Hero & Progress Header */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diagnostic Learning Checkpoint</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Practice: {lesson.title}
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Apply core derivations and verify conceptual understanding.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-right shrink-0">
            <span className="px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold">
              +10 Engagement Pts
            </span>
          </div>
        </div>

        {/* Question Stepper Indicator */}
        <div className="flex items-center justify-between gap-2 pt-1 font-mono text-xs">
          <span className="text-slate-400">
            Question <span className="text-white font-bold">{currentQuestionIndex + 1}</span> of {questions.length}
          </span>
          <div className="flex items-center gap-1.5">
            {questions.map((_, idx) => {
              const isAnswered = selectedAnswers[idx] !== undefined;
              const isCurrent = idx === currentQuestionIndex;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-200'
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
      </div>

      {/* 3. Primary Question Body */}
      {!isSubmitted ? (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider">
              Concept Problem {currentQuestionIndex + 1}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed font-sans">
              {currentQ.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQ.options.map((option, optIdx) => {
              const isSelected = selectedOption === optIdx;
              return (
                <button
                  type="button"
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400/80 bg-cyan-500/15 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
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

          {/* Navigation & Submission Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 min-h-[38px] rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
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
                onClick={handleSubmitEvaluation}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="flex items-center gap-1.5 px-5 py-2.5 min-h-[40px] rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Submit & View Results</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 4. Results & Conceptual Explanations */
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
                You scored <span className="text-emerald-400 font-bold">{correctAnswersCount}</span> / {questions.length} ({scorePercentage}%)
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
              Detailed Conceptual Review & Explanations
            </h3>

            <div className="space-y-3">
              {questions.map((q, idx) => {
                const userChoice = selectedAnswers[idx];
                const isCorrect = userChoice === q.correctIndex;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-slate-400">Question {idx + 1}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                        isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}>
                        {isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-white font-sans">{q.question}</p>

                    <div className="text-xs font-mono space-y-1">
                      <div className="text-slate-400">
                        Your answer: <span className={isCorrect ? 'text-emerald-300 font-bold' : 'text-red-300 font-bold'}>
                          {userChoice !== undefined ? q.options[userChoice] : 'Not answered'}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="text-emerald-300">
                          Correct answer: <span className="font-bold">{q.options[q.correctIndex]}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-300 space-y-1 font-sans">
                      <div className="text-[10px] font-mono font-bold uppercase text-cyan-400 tracking-wider">
                        Explanation
                      </div>
                      <p className="leading-relaxed">{q.explanation}</p>
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
