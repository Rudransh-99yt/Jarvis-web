import React from 'react';
import type { EducationClass, Assignment, StudentSubmission, KnowledgeSpace } from '../../../types/education.ts';
import { BookOpen, Calendar, Clock, Award, FileText, Sparkles, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

interface StudentDashboardProps {
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  knowledgeSpaces: KnowledgeSpace[];
  onNavigateTab: (tab: 'classes' | 'assignments' | 'knowledge' | 'study') => void;
  onSelectKnowledgeSpace: (spaceId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  classes,
  assignments,
  submissions,
  knowledgeSpaces,
  onNavigateTab,
  onSelectKnowledgeSpace
}) => {
  const submittedIds = new Set(submissions.map((s) => s.assignmentId));
  const pendingAssignments = assignments.filter((a) => !submittedIds.has(a.id));
  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');

  const avgGrade = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubmissions.length)
    : 96;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-black/60 p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono tracking-wider uppercase mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              Jarvis Academic Workspace // Student Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Alex Chen</span>
            </h1>
            <p className="text-sm text-cyan-100/70 mt-1 max-w-xl">
              You have <strong className="text-cyan-300">{pendingAssignments.length} upcoming assignments</strong> and {classes.length} active courses in the Fall 2026 academic cycle.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('study')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] self-start md:self-auto"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            LAUNCH STUDY AI
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>ACTIVE CLASSES</span>
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{classes.length}</div>
          <div className="text-[11px] text-cyan-400/50 mt-1">Physics & Mathematics</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>PENDING WORK</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2 font-mono">{pendingAssignments.length}</div>
          <div className="text-[11px] text-amber-400/50 mt-1">Due within next 14 days</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>AVERAGE GRADE</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2 font-mono">{avgGrade}%</div>
          <div className="text-[11px] text-emerald-400/50 mt-1">{gradedSubmissions.length} graded submission(s)</div>
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
            <span>KNOWLEDGE SPACES</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 mt-2 font-mono">{knowledgeSpaces.length}</div>
          <div className="text-[11px] text-cyan-400/50 mt-1">Grounded NotebookLM spaces</div>
        </div>
      </div>

      {/* Main Dual Grid: Upcoming Work & Knowledge Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Work & Upcoming Assignments */}
        <div className="space-y-6 lg:col-span-7">
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Upcoming Assignments & Deadlines
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('assignments')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {assignments.map((asg) => {
                const isSubmitted = submittedIds.has(asg.id);
                const sub = submissions.find((s) => s.assignmentId === asg.id);

                return (
                  <div
                    key={asg.id}
                    className="p-3.5 rounded-lg border border-cyan-500/10 bg-black/30 hover:border-cyan-500/30 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                          {asg.className.split(':')[0]}
                        </span>
                        <span className="text-xs text-cyan-400/60 font-mono">• {asg.category}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{asg.title}</h3>
                      <p className="text-xs text-cyan-100/60 line-clamp-1">{asg.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-cyan-400">Due: {asg.dueDate}</div>
                      <div className="mt-1.5">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" />
                            {sub?.status === 'graded' ? `Graded: ${sub.grade}/100` : 'Submitted'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/30">
                            <AlertCircle className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enrolled Classes Quick View */}
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Enrolled Classes
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('classes')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                View Details <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-lg border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-black/40 hover:border-cyan-400/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{cls.code}</span>
                    <span className="text-[10px] font-mono text-cyan-400/50">{cls.term}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{cls.name}</h3>
                  <div className="text-xs text-cyan-100/60 flex items-center gap-1">
                    <span>{cls.instructorName}</span>
                  </div>
                  <div className="pt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono text-cyan-400/70">
                    <span>{cls.materialsCount} Materials</span>
                    <span>{cls.schedule.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Grounded Knowledge Spaces & Quick Study Assistant */}
        <div className="space-y-6 lg:col-span-5">
          {/* Knowledge Spaces Card */}
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                  Grounded Notebook Spaces
                </h2>
              </div>
              <button
                onClick={() => onNavigateTab('knowledge')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                Open Workspace <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-cyan-100/60 mb-4">
              Ask Jarvis questions grounded in indexed lecture notes, papers, and syllabi with verifiable source citations.
            </p>

            <div className="space-y-3">
              {knowledgeSpaces.map((space) => (
                <div
                  key={space.id}
                  onClick={() => {
                    onSelectKnowledgeSpace(space.id);
                    onNavigateTab('knowledge');
                  }}
                  className="p-3.5 rounded-lg border border-cyan-500/10 bg-cyan-950/20 hover:bg-cyan-950/40 hover:border-cyan-500/30 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white font-mono">{space.title}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                      {space.sources.length} sources
                    </span>
                  </div>
                  <p className="text-xs text-cyan-100/60 line-clamp-1">{space.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {space.tags.slice(0, 3).map((t, idx) => (
                      <span key={idx} className="text-[10px] font-mono text-cyan-400/60 bg-black/40 px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick AI Study Prompts */}
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-blue-950/30 to-black/60 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                Jarvis Study Assistant Modes
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigateTab('study')}
                className="p-3 rounded-lg border border-cyan-500/20 bg-black/40 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-left transition-all"
              >
                <div className="text-xs font-bold text-cyan-300 font-mono">1. Concept Explainer</div>
                <div className="text-[10px] text-cyan-100/50 mt-1">Break down complex physics/math derivations</div>
              </button>

              <button
                onClick={() => onNavigateTab('study')}
                className="p-3 rounded-lg border border-cyan-500/20 bg-black/40 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-left transition-all"
              >
                <div className="text-xs font-bold text-cyan-300 font-mono">2. Practice Quiz</div>
                <div className="text-[10px] text-cyan-100/50 mt-1">Generate multi-step problem sets with solutions</div>
              </button>

              <button
                onClick={() => onNavigateTab('study')}
                className="p-3 rounded-lg border border-cyan-500/20 bg-black/40 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-left transition-all"
              >
                <div className="text-xs font-bold text-cyan-300 font-mono">3. Document Summarizer</div>
                <div className="text-[10px] text-cyan-100/50 mt-1">Condense 20-page papers into executive takeaways</div>
              </button>

              <button
                onClick={() => onNavigateTab('study')}
                className="p-3 rounded-lg border border-cyan-500/20 bg-black/40 hover:border-cyan-400/40 hover:bg-cyan-500/10 text-left transition-all"
              >
                <div className="text-xs font-bold text-cyan-300 font-mono">4. Formula Flashcards</div>
                <div className="text-[10px] text-cyan-100/50 mt-1">Rapid recall for operator algebra & theorems</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
