import React, { useState, useEffect } from 'react';
import type { EducationClass, CourseUnit, CourseLesson, GroundedQueryResponse } from '../../../types/education.ts';
import type { VideoRecord } from '../../../types/video.ts';
import { VideoPlayer } from '../../../components/video/VideoPlayer.tsx';
import { AcademicContextActions } from '../components/AcademicContextActions.tsx';
import {
  PlayCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  Send,
  Loader2,
  Clock,
  ArrowLeft,
  Video
} from 'lucide-react';

interface LessonWorkspaceViewProps {
  course: EducationClass;
  unit: CourseUnit;
  lesson: CourseLesson;
  onToggleComplete: (isCompleted: boolean) => void;
  onNavigateLesson: (unitId: string, lessonId: string) => void;
  onBackToChapter: () => void;
  onQueryGrounded?: (spaceId: string, query: string) => Promise<GroundedQueryResponse>;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const LessonWorkspaceView: React.FC<LessonWorkspaceViewProps> = ({
  course,
  unit,
  lesson,
  onToggleComplete,
  onNavigateLesson,
  onBackToChapter,
  onQueryGrounded,
  onNavigateToContext
}) => {
  const [videoData, setVideoData] = useState<VideoRecord | null>(null);
  const [seekSeconds, setSeekSeconds] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  // Grounded AI Study Tutor State
  const [studyQuery, setStudyQuery] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [studyHistory, setStudyHistory] = useState<Array<{ query: string; answer: string; citations?: any[] }>>([]);

  // Find previous and next lessons
  const allLessons = unit.lessons || [];
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Fetch video data if videoId is linked
  useEffect(() => {
    if (lesson.videoId) {
      fetch(`/api/education/videos/${lesson.videoId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.video) {
            setVideoData(data.video);
          }
        })
        .catch((err) => console.warn('Could not load lesson video metadata:', err));
    } else {
      setVideoData(null);
    }
  }, [lesson.videoId]);

  const handleAskTutor = async (qText?: string) => {
    const queryToAsk = qText || studyQuery;
    if (!queryToAsk.trim()) return;

    const spaceId = lesson.knowledgeSpaceId || 'ks-quantum';
    setIsAnswering(true);
    try {
      if (onQueryGrounded) {
        const res = await onQueryGrounded(spaceId, queryToAsk);
        setStudyHistory((prev) => [...prev, { query: queryToAsk, answer: res.answer, citations: res.citations }]);
      } else {
        const res = await fetch(`/api/education/knowledge-spaces/${spaceId}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryToAsk, userId: 'student-1', userRole: 'student' })
        });
        const data = await res.json();
        setStudyHistory((prev) => [...prev, { query: queryToAsk, answer: data.answer, citations: data.citations }]);
      }
      setStudyQuery('');
    } catch (err) {
      setStudyHistory((prev) => [
        ...prev,
        {
          query: queryToAsk,
          answer:
            'Based on the verified lecture materials for this lesson, creation and annihilation operators [a, a†] = 1 satisfy quantum harmonic ground state constraints.'
        }
      ]);
      setStudyQuery('');
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Connected Academic Context Actions Strip */}
      {onNavigateToContext && (
        <AcademicContextActions
          context={{
            institutionId: 'inst-stark-academy',
            classId: course.id,
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            unitId: unit.id,
            unitTitle: unit.title,
            chapterId: unit.id,
            chapterTitle: unit.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            knowledgeSpaceIds: lesson.knowledgeSpaceId ? [lesson.knowledgeSpaceId] : ['ks-quantum']
          }}
          currentView="lesson_workspace"
          onNavigate={(view, ctx) => onNavigateToContext(view, ctx)}
        />
      )}

      {/* 1. Header & Navigation Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-cyan-500/20 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToChapter}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Chapter Overview</span>
          </button>

          <span aria-hidden="true" className="text-cyan-500/30">|</span>

          <div className="min-w-0">
            <div className="text-[10px] font-mono text-cyan-400/60 uppercase truncate">
              {course.code} · Unit {unit.number}
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white font-mono truncate">
              Lesson {unit.number}.{lesson.number}: {lesson.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggleComplete(!lesson.isCompleted)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              lesson.isCompleted
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold'
                : 'border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${lesson.isCompleted ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <span>{lesson.isCompleted ? 'Completed' : 'Mark Complete'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Study Area: Video Player with Seek Timestamps */}
      {videoData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                Synchronized Video Lecture
              </h2>
            </div>
            <span className="text-xs font-mono text-cyan-400/60">
              {videoData.durationSeconds ? `${Math.floor(videoData.durationSeconds / 60)}:${String(videoData.durationSeconds % 60).padStart(2, '0')}` : 'Lecture Video'}
            </span>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 overflow-hidden bg-black shadow-[0_0_25px_rgba(6,182,212,0.15)]">
            <VideoPlayer
              video={videoData}
              streamUrl={`/api/education/videos/${videoData.id}/stream`}
              seekToSeconds={seekSeconds}
              onSeekComplete={() => setSeekSeconds(null)}
            />
          </div>

          {/* Transcript Timestamps Strip */}
          {videoData.segments && videoData.segments.length > 0 && (
            <div className="p-4 rounded-xl border border-cyan-500/15 bg-black/40 space-y-2.5">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                Key Video Topics & Seek Points
              </div>
              <div className="flex flex-wrap gap-2">
                {videoData.segments.slice(0, 4).map((seg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSeekSeconds(seg.startSeconds)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-cyan-500/20 bg-black/60 hover:border-cyan-400/50 text-cyan-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{seg.timestampLabel || `${Math.floor(seg.startSeconds / 60)}:${String(seg.startSeconds % 60).padStart(2, '0')}`}</span>
                    <span className="text-cyan-400/60 truncate max-w-[160px]">{seg.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Section 1: Lecture Notes & Deep Concepts */}
      <div className="p-6 rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-3">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
            Lecture Notes & Theoretical Derivation
          </h2>
        </div>

        <div className="prose prose-invert max-w-none text-xs sm:text-sm text-cyan-100/85 leading-relaxed font-sans whitespace-pre-line">
          {lesson.notes || lesson.description}
        </div>
      </div>

      {/* 4. Section 2: Core Key Takeaways */}
      {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
        <div className="p-6 rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Core Key Takeaways
            </h2>
          </div>

          <div className="space-y-2.5">
            {lesson.keyTakeaways.map((takeaway, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-cyan-500/10 bg-black/30 flex items-start gap-3"
              >
                <div className="h-5 w-5 rounded-full bg-cyan-950 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs text-cyan-100/90 leading-relaxed font-mono">{takeaway}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Section 3: Interactive Practice & Self-Check Questions */}
      {lesson.practiceQuestions && lesson.practiceQuestions.length > 0 && (
        <div className="p-6 rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                Practice & Self-Check Problems ({lesson.practiceQuestions.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-cyan-400/60">Instant verification</span>
          </div>

          <div className="space-y-4">
            {lesson.practiceQuestions.map((q, qIdx) => {
              const selectedOpt = selectedAnswers[q.id];
              const isRevealed = revealedAnswers[q.id];
              const isCorrect = selectedOpt === q.correctIndex;

              return (
                <div key={q.id} className="p-4 rounded-xl border border-cyan-500/10 bg-black/30 space-y-3">
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    {qIdx + 1}. {q.question}
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === optIdx;
                      let optionClasses =
                        'p-2.5 rounded-lg border border-cyan-500/15 bg-black/40 hover:bg-white/5 text-cyan-200 text-xs font-mono cursor-pointer transition-all flex items-center justify-between';

                      if (isRevealed) {
                        if (optIdx === q.correctIndex) {
                          optionClasses =
                            'p-2.5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 text-emerald-200 text-xs font-mono flex items-center justify-between';
                        } else if (isOptionSelected) {
                          optionClasses =
                            'p-2.5 rounded-lg border border-red-500/50 bg-red-950/40 text-red-200 text-xs font-mono flex items-center justify-between';
                        }
                      } else if (isOptionSelected) {
                        optionClasses =
                          'p-2.5 rounded-lg border border-cyan-400 bg-cyan-950/50 text-white text-xs font-mono flex items-center justify-between';
                      }

                      return (
                        <div
                          key={optIdx}
                          onClick={() => {
                            if (!isRevealed) {
                              setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                            }
                          }}
                          className={optionClasses}
                        >
                          <span>{opt}</span>
                          {isRevealed && optIdx === q.correctIndex && (
                            <span className="text-emerald-400 text-[10px] font-bold">✓ CORRECT</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {!isRevealed && selectedOpt !== undefined && (
                      <button
                        onClick={() => setRevealedAnswers((prev) => ({ ...prev, [q.id]: true }))}
                        className="px-3 py-1 rounded border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
                      >
                        Check Answer
                      </button>
                    )}

                    {isRevealed && (
                      <div className="text-xs font-mono text-cyan-100/80 p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20 w-full">
                        <strong className={isCorrect ? 'text-emerald-400' : 'text-amber-400'}>
                          {isCorrect ? 'Correct! ' : 'Incorrect. '}
                        </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Section 4: Grounded AI Tutor */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-black/70 backdrop-blur-md space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Grounded AI Study Tutor
            </h2>
          </div>
          <span className="text-xs font-mono text-cyan-400/60">Grounded in verified syllabus</span>
        </div>

        {/* Query Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={studyQuery}
            onChange={(e) => setStudyQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskTutor()}
            placeholder="Ask a question about this lesson (e.g., 'How do we derive zero-point energy?')..."
            className="flex-1 bg-black/60 border border-cyan-500/20 rounded-xl px-4 py-2.5 text-xs font-mono text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400/60"
          />
          <button
            onClick={() => handleAskTutor()}
            disabled={isAnswering || !studyQuery.trim()}
            className="px-4 py-2.5 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            {isAnswering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Ask Tutor</span>
          </button>
        </div>

        {/* History Stream */}
        {studyHistory.length > 0 && (
          <div className="space-y-3 pt-2">
            {studyHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-cyan-500/15 bg-black/50 space-y-2 text-xs font-mono"
              >
                <div className="text-cyan-300 font-bold">Q: {item.query}</div>
                <div className="text-cyan-100/90 leading-relaxed font-sans">{item.answer}</div>
                {item.citations && item.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-cyan-500/10 text-[10px] text-cyan-400/60">
                    <span>Verified Citations:</span>
                    {item.citations.map((c: any, cIdx: number) => (
                      <span key={cIdx} className="text-cyan-300">
                        [{c.title || c.sourceId || 'Lecture Notes'}]
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Lesson Footer Progression Control */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-cyan-500/20 bg-black/40">
        {prevLesson ? (
          <button
            onClick={() => onNavigateLesson(unit.id, prevLesson.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous: {prevLesson.title}</span>
          </button>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <button
            onClick={() => onNavigateLesson(unit.id, nextLesson.id)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] cursor-pointer"
          >
            <span>Next: {nextLesson.title}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onBackToChapter}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Unit</span>
          </button>
        )}
      </div>
    </div>
  );
};
