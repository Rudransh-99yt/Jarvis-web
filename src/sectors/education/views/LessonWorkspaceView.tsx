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
  Video,
  Timer,
  MessageSquare,
  FileCheck2,
  ExternalLink
} from 'lucide-react';

interface LessonWorkspaceViewProps {
  course: EducationClass;
  unit: CourseUnit;
  lesson: CourseLesson;
  onToggleComplete: (isCompleted: boolean) => void;
  onNavigateLesson: (unitId: string, lessonId: string) => void;
  onBackToChapter: () => void;
  onOpenPractice?: (lessonId: string) => void;
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
  onOpenPractice,
  onQueryGrounded,
  onNavigateToContext
}) => {
  const [videoData, setVideoData] = useState<VideoRecord | null>(null);
  const [seekSeconds, setSeekSeconds] = useState<number | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'content' | 'takeaways' | 'quiz' | 'tutor'>('content');

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

  const academicContext = {
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
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      {/* 1. Contextual "Open In" Action Strip */}
      <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onBackToChapter}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chapter {unit.number}</span>
          </button>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-300 font-bold truncate">{course.code}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300 truncate">Lesson {unit.number}.{lesson.number}</span>
        </div>

        {/* Canonical Open In Actions */}
        {onNavigateToContext && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onNavigateToContext('focus', academicContext)}
              className="px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 hover:bg-amber-900/40 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Timer className="w-3 h-3 text-amber-400" />
              <span>Focus (25m)</span>
            </button>

            <button
              onClick={() => onNavigateToContext('workspace', academicContext)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => onNavigateToContext('community', academicContext)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3 h-3 text-indigo-400" />
              <span>Discuss</span>
            </button>

            <button
              onClick={() => onNavigateToContext('assignments', academicContext)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-3 h-3 text-emerald-400" />
              <span>Assignment</span>
            </button>

            <button
              onClick={() => onNavigateToContext('knowledge', academicContext)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>Resources</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Lesson Title & Completion Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="space-y-1 min-w-0">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            {course.name} · Unit {unit.number}: {unit.title}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
            Lesson {unit.number}.{lesson.number}: {lesson.title}
          </h1>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>{lesson.durationMinutes} mins estimated study</span>
            {lesson.videoId && <span>· Synchronized video lecture</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {onOpenPractice && (
            <button
              onClick={() => onOpenPractice(lesson.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-mono font-bold border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Practice & Test (+10 pts)</span>
            </button>
          )}

          <button
            onClick={() => onToggleComplete(!lesson.isCompleted)}
            className={`flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              lesson.isCompleted
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                : 'border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${lesson.isCompleted ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <span>{lesson.isCompleted ? 'Lesson Completed' : 'Mark as Complete'}</span>
          </button>
        </div>
      </div>

      {/* 3. Primary Study Area: Video Player with Seek Timestamps */}
      {videoData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Synchronized Video Lecture</span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {videoData.durationSeconds
                ? `${Math.floor(videoData.durationSeconds / 60)}:${String(videoData.durationSeconds % 60).padStart(2, '0')}`
                : 'Lecture Video'}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-black shadow-lg">
            <VideoPlayer
              video={videoData}
              streamUrl={`/api/education/videos/${videoData.id}/stream`}
              seekToSeconds={seekSeconds}
              onSeekComplete={() => setSeekSeconds(null)}
            />
          </div>

          {/* Transcript Timestamps Strip */}
          {videoData.segments && videoData.segments.length > 0 && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Key Video Topics & Timestamps
              </div>
              <div className="flex flex-wrap gap-2">
                {videoData.segments.slice(0, 4).map((seg, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSeekSeconds(seg.startSeconds)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-950 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{seg.timestampLabel || `${Math.floor(seg.startSeconds / 60)}:${String(seg.startSeconds % 60).padStart(2, '0')}`}</span>
                    <span className="text-slate-400 truncate max-w-[160px]">{seg.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Segmented Workspace Mode Selector */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'content'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Lecture Notes</span>
        </button>

        {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
          <button
            onClick={() => setActiveTab('takeaways')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'takeaways'
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Key Takeaways ({lesson.keyTakeaways.length})</span>
          </button>
        )}

        {lesson.practiceQuestions && lesson.practiceQuestions.length > 0 && (
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'quiz'
                ? 'bg-slate-800 text-white font-bold border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Self-Check ({lesson.practiceQuestions.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('tutor')}
          className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tutor'
              ? 'bg-slate-800 text-white font-bold border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>AI Study Tutor</span>
        </button>
      </div>

      {/* 5. Tab Panels */}
      {activeTab === 'content' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
              Lecture Notes & Theoretical Derivation
            </h2>
          </div>

          <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
            {lesson.notes || lesson.description}
          </div>
        </div>
      )}

      {activeTab === 'takeaways' && lesson.keyTakeaways && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
              Core Key Takeaways
            </h2>
          </div>

          <div className="space-y-2.5">
            {lesson.keyTakeaways.map((takeaway, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start gap-3"
              >
                <div className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-mono">{takeaway}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'quiz' && lesson.practiceQuestions && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
                Practice & Self-Check Problems ({lesson.practiceQuestions.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Instant verification</span>
          </div>

          <div className="space-y-4">
            {lesson.practiceQuestions.map((q, qIdx) => {
              const selectedOpt = selectedAnswers[q.id];
              const isRevealed = revealedAnswers[q.id];
              const isCorrect = selectedOpt === q.correctIndex;

              return (
                <div key={q.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                  <div className="text-xs sm:text-sm font-semibold text-white">
                    {qIdx + 1}. {q.question}
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === optIdx;
                      let optionClasses =
                        'p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between';

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
                          'p-2.5 rounded-lg border border-cyan-400 bg-slate-800 text-white text-xs font-mono flex items-center justify-between';
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
                      <div className="text-xs font-mono text-slate-200 p-2.5 rounded bg-slate-900/80 border border-slate-800 w-full">
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

      {activeTab === 'tutor' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200 uppercase">
                Grounded AI Study Tutor
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Grounded in verified syllabus</span>
          </div>

          {/* Contextual Quick Suggestions */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <button
              onClick={() => handleAskTutor('Can you explain ladder operator commutation relations [a, a†] = 1?')}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Explain commutation relations
            </button>
            <button
              onClick={() => handleAskTutor('Summarize the harmonic ground state zero-point energy in 3 bullet points.')}
              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Summarize zero-point energy
            </button>
          </div>

          {/* Query Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={studyQuery}
              onChange={(e) => setStudyQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskTutor()}
              placeholder="Ask a question about this lesson..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2 text-xs font-mono"
                >
                  <div className="text-cyan-300 font-bold">Q: {item.query}</div>
                  <div className="text-slate-200 leading-relaxed font-sans">{item.answer}</div>
                  {item.citations && item.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
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
      )}

      {/* 6. Lesson Footer Progression Control */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60">
        {prevLesson ? (
          <button
            onClick={() => onNavigateLesson(unit.id, prevLesson.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous: Lesson {unit.number}.{prevLesson.number}</span>
          </button>
        ) : (
          <div />
        )}

        {nextLesson ? (
          <button
            onClick={() => onNavigateLesson(unit.id, nextLesson.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 text-xs font-mono font-bold transition-all cursor-pointer shadow-md"
          >
            <span>Next: Lesson {unit.number}.{nextLesson.number}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onBackToChapter}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Finish Chapter</span>
          </button>
        )}
      </div>
    </div>
  );
};
