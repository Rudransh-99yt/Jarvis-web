import React, { useState, useEffect } from 'react';
import type { EducationClass, Assignment, StudentSubmission, AcademicInstitution } from '../../../types/education.ts';
import type {
  SchoolIntelligenceData,
  PrincipalCommandProposal,
  InstitutionalAuditEvent
} from '../../../types/institutional.ts';
import {
  ShieldAlert,
  Building2,
  Users,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Radio,
  ArrowRight,
  Activity,
  FileSpreadsheet,
  History,
  Sparkles,
  CheckCircle,
  FileText,
  HelpCircle,
  X
} from 'lucide-react';

interface PrincipalExecutiveViewProps {
  institution?: AcademicInstitution;
  classes: EducationClass[];
  assignments: Assignment[];
  submissions: StudentSubmission[];
  onSelectCourse: (courseId: string) => void;
  onNavigateTab: (tab: any) => void;
  onNavigateToContext?: (view: string, context?: any) => void;
}

export const PrincipalExecutiveView: React.FC<PrincipalExecutiveViewProps> = ({
  institution: propInstitution,
  classes,
  assignments,
  submissions,
  onSelectCourse,
  onNavigateTab,
  onNavigateToContext
}) => {
  const [schoolData, setSchoolData] = useState<SchoolIntelligenceData | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [activeProposal, setActiveProposal] = useState<PrincipalCommandProposal | null>(null);
  const [isProposing, setIsProposing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionNotice, setExecutionNotice] = useState<string | null>(null);

  // Fetch live School Intelligence
  const fetchSchoolData = () => {
    fetch('/api/education/institutional/school', {
      headers: {
        'x-user-id': 'principal-1',
        'x-user-role': 'principal'
      }
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.intelligence) setSchoolData(data.intelligence);
      })
      .catch((err) => console.warn('Could not load school intelligence:', err));
  };

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const handleProposeCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commandInput.trim()) return;

    setIsProposing(true);
    try {
      const res = await fetch('/api/education/institutional/commands/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'principal-1',
          'x-user-role': 'principal'
        },
        body: JSON.stringify({
          commandPrompt: commandInput,
          targetGradeId: 'g11',
          courseCode: 'PHYS-301',
          durationMinutes: 15,
          questionCount: 12
        })
      });

      if (res.ok) {
        const payload = await res.json();
        setActiveProposal(payload.proposal);
      }
    } catch (err) {
      console.error('Failed to propose command:', err);
    } finally {
      setIsProposing(false);
    }
  };

  const handleApproveAndExecute = async () => {
    if (!activeProposal) return;
    setIsExecuting(true);
    try {
      const res = await fetch(`/api/education/institutional/commands/${activeProposal.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'principal-1',
          'x-user-role': 'principal'
        }
      });

      if (res.ok) {
        const payload = await res.json();
        setExecutionNotice(`Diagnostic quiz published across ${activeProposal.targetGradeName} cohorts. Audit log recorded.`);
        setActiveProposal(null);
        setCommandInput('');
        fetchSchoolData();
        setTimeout(() => setExecutionNotice(null), 5000);
      }
    } catch (err) {
      console.error('Failed to execute command:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const institution = schoolData?.institution || propInstitution;
  const pulse = schoolData?.pulse || {
    activeClassroomsNow: 2,
    scheduledLecturesToday: 3,
    totalStudentsEnrolled: classes.reduce((sum, c) => sum + c.studentCount, 0),
    facultyOnDuty: 4,
    systemHealth: 'nominal'
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* 1. Header Banner */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-amber-400 tracking-wider uppercase flex items-center gap-1.5 font-semibold">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Academic Leadership · Dean / Executive Intelligence OS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {institution?.name || 'Stark Academy of Science & Advanced Engineering'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono">
          Dean Alistair Vance · Institutional Directorate · Oversight across Grades 11–12
        </p>
      </div>

      {executionNotice && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{executionNotice}</span>
        </div>
      )}

      {/* 2. TODAY: Real-Time Operational Pulse */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Today’s Operational Pulse</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">Campus Academic Velocity</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('classroom')}
              className="px-3.5 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{pulse.activeClassroomsNow} Active Classrooms Live</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Scheduled Lectures</div>
            <div className="text-white font-bold text-base mt-0.5">{pulse.scheduledLecturesToday} Today</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Enrolled Cadets</div>
            <div className="text-cyan-300 font-bold text-base mt-0.5">{pulse.totalStudentsEnrolled} Cadets</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Faculty on Duty</div>
            <div className="text-purple-300 font-bold text-base mt-0.5">{pulse.facultyOnDuty} Professors</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Overall Attendance</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5">
              {schoolData?.kpis.overallAttendancePercent || 92}% Verified
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRINCIPAL COMMAND INTERFACE: Controlled AI Diagnostic Generation */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-slate-950 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
              Principal Command Interface · Diagnostic Generation
            </h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-400/70">Controlled Flow · Authorization Required</span>
        </div>

        <form onSubmit={handleProposeCommand} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="e.g., Run a 15-minute diagnostic Physics quiz across all Grade 11 Physics classes based on everything taught so far..."
            className="flex-1 bg-black/60 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={isProposing || !commandInput.trim()}
            className="px-5 py-2.5 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all shrink-0 cursor-pointer"
          >
            {isProposing ? 'Analyzing Scope...' : 'Propose Command'}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 font-mono">
          AI proposes grounded questions and target classes from verified curriculum. Explicit principal approval required before execution.
        </p>
      </div>

      {/* 4. PREVIEW MODAL FOR PRINCIPAL COMMAND APPROVAL */}
      {activeProposal && (
        <div className="p-6 rounded-2xl border border-amber-500/40 bg-slate-950 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Diagnostic Quiz Proposal Preview · Requires Approval</span>
            </div>
            <button
              onClick={() => setActiveProposal(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-500">Target Grade:</span>
              <div className="text-white font-bold">{activeProposal.targetGradeName}</div>
            </div>
            <div>
              <span className="text-slate-500">Target Course:</span>
              <div className="text-white font-bold">{activeProposal.targetCourseCode}</div>
            </div>
            <div>
              <span className="text-slate-500">Duration & Questions:</span>
              <div className="text-white font-bold">{activeProposal.durationMinutes} mins · {activeProposal.questionCount} Questions</div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <span className="text-slate-500">Covered Topics:</span>
            <div className="text-cyan-300">{activeProposal.coveredTopics.join(' · ')}</div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase">
              Question Previews ({activeProposal.previewQuestions.length} Sampled):
            </div>
            <div className="space-y-2">
              {activeProposal.previewQuestions.map((q, idx) => (
                <div key={q.id} className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Q{idx + 1} · {q.topic} ({q.type})</span>
                    <span>{q.points} pts</span>
                  </div>
                  <div className="text-slate-200">{q.prompt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setActiveProposal(null)}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveAndExecute}
              disabled={isExecuting}
              className="px-5 py-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{isExecuting ? 'Publishing...' : 'Approve & Execute Across Classes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. ACADEMIC OVERVIEW: Grade-Level Drill-Down */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
              Grade Intelligence & Cohort Overview
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Click a grade to drill down</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {schoolData?.grades.map((grade) => (
            <div
              key={grade.gradeId}
              onClick={() => {
                if (onNavigateToContext) {
                  onNavigateToContext('principal_grade', { gradeId: grade.gradeId });
                }
              }}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-cyan-300 group-hover:text-cyan-200">{grade.code}</span>
                <span className="text-slate-400">{grade.studentsCount} Cadets Enrolled</span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-100 transition-colors">
                  {grade.name}
                </h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {grade.classesCount} Classes · Avg Completion: {grade.averageCompletionRate}%
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-amber-400/90">{grade.attentionAlertsCount} Attention Signals</span>
                <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Grade Intelligence</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. TEACHING OVERVIEW: Faculty Leadership Projections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
              Teaching Overview · Faculty Velocity & Workload
            </h2>
          </div>
          <button
            onClick={() => {
              if (onNavigateToContext) {
                onNavigateToContext('principal_teachers', {});
              }
            }}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
          >
            <span>All Faculty Projections</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
          {[
            {
              name: 'Dr. Sarah (Lead Theoretical Physicist)',
              course: 'PHYS-301: Advanced Quantum & Classical Electrodynamics',
              prepStatus: 'Sessions Prepared & Approved',
              turnaround: '18h avg grading turnaround',
              status: 'On Schedule'
            },
            {
              name: 'Prof. Marcus Vance',
              course: 'MATH-240: Multivariable Calculus & Differential Forms',
              prepStatus: 'Multivariable Track Active',
              turnaround: '24h avg grading turnaround',
              status: 'On Schedule'
            }
          ].map((t) => (
            <div key={t.name} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors">
              <div className="space-y-0.5 min-w-0">
                <div className="text-sm font-bold text-white truncate">{t.name}</div>
                <div className="text-xs text-cyan-300 font-mono">{t.course}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {t.prepStatus} · {t.turnaround}
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold self-start sm:self-center">
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. AUDIT LEDGER SHORTCUT */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <History className="w-4 h-4 text-cyan-400" />
          <span>Institutional Command Audit Trail & Governance Log</span>
        </div>
        <button
          onClick={() => {
            if (onNavigateToContext) {
              onNavigateToContext('principal_audit', {});
            }
          }}
          className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
        >
          <span>View Audit Ledger</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
