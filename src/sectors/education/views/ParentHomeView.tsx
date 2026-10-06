import React, { useState, useEffect } from 'react';
import type { ChildSummary, FamilyHomeIntelligence } from '../../../types/family.ts';
import { authClient } from '../../../services/authClient.ts';

import {
  Heart,
  Clock,
  BookOpen,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Flame,
  FileSpreadsheet,
  Award,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Users
} from 'lucide-react';

interface ParentHomeViewProps {
  onNavigateTab: (tab: any) => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const ParentHomeView: React.FC<ParentHomeViewProps> = ({
  onNavigateTab,
  onNavigateToContext
}) => {
  const [activeParentId, setActiveParentId] = useState<string>('parent-1');
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('student-1');
  const [intelligence, setIntelligence] = useState<FamilyHomeIntelligence | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<'today' | 'progress' | 'work' | 'assessments' | 'messages'>('today');

  // Load children for the authenticated parent
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch('/api/education/family/children', {
      headers: { ...authClient.getAuthHeaders() }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.children && data.children.length > 0) {
          setChildren(data.children);
          setSelectedStudentId(data.children[0].studentId);
        }
      })
      .catch((err) => console.warn('Could not load parent children:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeParentId]);

  // Load intelligence for the selected child
  useEffect(() => {
    if (!selectedStudentId) return;
    let isMounted = true;

    fetch(`/api/education/family/child/${selectedStudentId}/intelligence`, {
      headers: { ...authClient.getAuthHeaders() }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.intelligence) {
          setIntelligence(data.intelligence);
        }
      })
      .catch((err) => console.warn('Could not load family intelligence:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedStudentId]);

  const activeChild = children.find((c) => c.studentId === selectedStudentId) || intelligence?.child;

  return (
    <div className="space-y-7 max-w-4xl mx-auto w-full font-sans pb-12">
      {/* 1. Warm Parent Header & Child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
            <span>Family & Guardian Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {activeChild ? `${activeChild.displayName}'s Learning` : "My Child's Learning"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            {activeChild?.gradeLevel} · {activeChild?.cohort} · Stark Academy
          </p>
        </div>

        {/* Parent & Child Switchers */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Parent Account Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-800 bg-slate-900/80">
            {[
              { id: 'parent-1', label: 'Maria Chen (Alex)' },
              { id: 'parent-2', label: 'Robert Lin (Maya)' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveParentId(p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeParentId === p.id
                    ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Child Selector (for families with multiple enrolled children) */}
          {children.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-800 bg-slate-900/80">
              {children.map((c) => (
                <button
                  key={c.studentId}
                  onClick={() => setSelectedStudentId(c.studentId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    selectedStudentId === c.studentId
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c.displayName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. NEXT ACTION: What should my child do next? (Clear & Direct) */}
      {intelligence?.nextAction && (
        <div className="p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-slate-950 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Recommended Next Step for Your Child</span>
            </span>
            {intelligence.nextAction.dueDate && (
              <span className="text-slate-400">{intelligence.nextAction.dueDate}</span>
            )}
          </div>
          <div className="text-base sm:text-lg font-bold text-white tracking-tight">
            {intelligence.nextAction.title}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans">
            {intelligence.nextAction.description}
          </p>
        </div>
      )}

      {/* 3. Operational Overview Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2 text-xs font-mono">
        {[
          { id: 'today', label: 'Today’s Learning', icon: Clock },
          { id: 'progress', label: 'Academic Progress', icon: BookOpen },
          { id: 'work', label: `Work & Assignments (${intelligence?.missingCount || 0} missing)`, icon: FileSpreadsheet },
          { id: 'assessments', label: 'Test Results', icon: Award },
          { id: 'messages', label: 'Teacher Updates', icon: MessageSquare }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'border border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TODAY'S LEARNING */}
      {activeSection === 'today' && (
        <div className="space-y-5">
          {/* Attention Alerts if any */}
          {intelligence?.attentionAlerts && intelligence.attentionAlerts.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/15 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Things to Keep in Mind</span>
              </div>
              <div className="space-y-2">
                {intelligence.attentionAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-white font-bold">
                      <span>{alert.title}</span>
                      <span className="text-slate-400">{alert.courseCode}</span>
                    </div>
                    <p className="text-slate-300 font-sans">{alert.description}</p>
                    <p className="text-cyan-300/90 text-[11px] pt-1 border-t border-slate-800/80">
                      💡 Tip for parents: {alert.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Schedule */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase px-1">
              Today's Classes & Locations
            </h2>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
              {intelligence?.todayClasses.map((cls) => (
                <div key={cls.classId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-cyan-300">{cls.courseCode}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">{cls.time}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{cls.room}</span>
                    </div>
                    <div className="text-sm font-bold text-white">{cls.courseName}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      Instructor: {cls.instructorName} · Topic: {cls.topic}
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-lg text-xs font-mono self-start sm:self-center bg-slate-800 text-slate-300 border border-slate-700">
                    {cls.status === 'in_progress' ? 'In Session Now' : 'Scheduled'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Study Habits & Consistency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Learning Streak</div>
              <div className="text-base font-bold text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>{intelligence?.streakDays || 5} Consecutive Days</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">Active study every school day this week.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Focus Time This Week</div>
              <div className="text-base font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>{Math.round((intelligence?.totalStudyMinutesThisWeek || 240) / 60)} Hours</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">Dedicated quiet study in Focus Room.</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Homework Status</div>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{intelligence?.missingCount === 0 ? 'All Up to Date' : `${intelligence?.missingCount} Overdue`}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">Current assignments progress on track.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC PROGRESS */}
      {activeSection === 'progress' && (
        <div className="space-y-4">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase px-1">
            Subject Progress & Curriculum Milestones
          </h2>

          <div className="space-y-3">
            {intelligence?.subjectsProgress.map((sub) => (
              <div key={sub.classId} className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <div className="text-xs font-mono text-cyan-300 font-bold">{sub.courseCode}</div>
                    <div className="text-base font-bold text-white">{sub.courseName}</div>
                    <div className="text-xs text-slate-400 font-mono">Instructor: {sub.instructorName}</div>
                  </div>
                  <div className="text-right self-start sm:self-auto font-mono">
                    <div className="text-lg font-bold text-white">{sub.progressPercent}%</div>
                    <div className="text-[10px] text-slate-400">
                      {sub.completedLessons} of {sub.totalLessons} lessons completed
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${sub.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                    <span>Current Topic: {sub.currentLesson}</span>
                    <span>Last active: {sub.lastActive}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WORK & ASSIGNMENTS */}
      {activeSection === 'work' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
              Assigned Problem Sets & Lab Reports
            </h2>
            {intelligence?.missingCount ? (
              <span className="px-2.5 py-1 rounded text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {intelligence.missingCount} Missing / Overdue
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                All Work Submitted
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
            {intelligence?.pendingWork.map((work) => {
              const isGraded = work.status === 'graded';
              const isSubmitted = work.status === 'submitted';

              return (
                <div key={work.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-white">{work.courseCode}</span>
                      <span className="text-slate-600">·</span>
                      <span className={work.isOverdue ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        Due {work.dueDate}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-200">{work.title}</div>
                    {work.feedback && (
                      <p className="text-xs text-slate-400 italic font-mono pt-0.5">
                        Teacher Feedback: "{work.feedback}"
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 self-start sm:self-center font-mono text-xs">
                    {isGraded ? (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{work.grade}/{work.maxScore}</span>
                      </span>
                    ) : isSubmitted ? (
                      <span className="px-3 py-1.5 rounded-lg bg-blue-950/50 border border-blue-500/30 text-blue-300 font-semibold">
                        Submitted · Awaiting Evaluation
                      </span>
                    ) : work.isOverdue ? (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Past Due</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TEST RESULTS & ASSESSMENTS */}
      {activeSection === 'assessments' && (
        <div className="space-y-4">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase px-1">
            Test Performance & Diagnostic Results
          </h2>
          <p className="text-xs text-slate-400 font-mono px-1">
            Verified scores and teacher feedback from classroom quizzes and formative assessments.
          </p>

          <div className="space-y-3">
            {intelligence?.recentAssessments.map((asm) => (
              <div key={asm.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="font-bold text-cyan-300">{asm.courseCode}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{asm.date}</span>
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">{asm.title}</div>
                  </div>

                  <div className="font-mono text-xs self-start sm:self-auto">
                    {asm.status === 'completed' ? (
                      <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                        Score: {asm.score} / {asm.maxScore} ({asm.accuracyPercent}%)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold">
                        Upcoming Test
                      </span>
                    )}
                  </div>
                </div>

                {asm.teacherFeedbackSnippet && (
                  <p className="text-xs text-slate-300 font-sans pt-1">
                    <span className="font-bold text-slate-400">Teacher's Note:</span> {asm.teacherFeedbackSnippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: TEACHER UPDATES */}
      {activeSection === 'messages' && (
        <div className="space-y-4">
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase px-1">
            Teacher & School Announcements
          </h2>

          <div className="space-y-3">
            {intelligence?.communications.map((comm) => (
              <div key={comm.id} className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-cyan-300">{comm.teacherName}</span>
                  <span className="text-slate-400">{comm.sentAt}</span>
                </div>
                <div className="text-sm font-bold text-white">{comm.title}</div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{comm.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
