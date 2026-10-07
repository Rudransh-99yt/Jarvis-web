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
import { GlassCard, Button, Badge } from '../../../components/ui/index.ts';
import { glassTokens } from '../../../design-system/tokens.ts';

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
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans pb-12">
      {/* 1. Header Banner */}
      <div className="space-y-1">
        <div className="text-xs font-mono text-amber-400 tracking-wider uppercase flex items-center gap-1.5 font-medium">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Academic Leadership · Dean / Executive Intelligence OS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-100 tracking-tight">
          {institution?.name || 'Stark Academy of Science & Advanced Engineering'}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400">
          Dean Alistair Vance <span className="text-neutral-500">·</span> Institutional Directorate <span className="text-neutral-500">·</span> Oversight across Grades 11–12
        </p>
      </div>

      {executionNotice && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in shadow-[0_2px_12px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{executionNotice}</span>
        </div>
      )}

      {/* 2. TODAY: Real-Time Operational Pulse */}
      <GlassCard level="elevated" highlight className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-xs font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Today’s Operational Pulse</span>
            </div>
            <div className="text-lg font-bold text-neutral-100 mt-1">Campus Academic Velocity</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('classroom')}
              className="px-3.5 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors focus-ring"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="tabular-nums font-mono">{pulse.activeClassroomsNow}</span>
              <span>Active Classrooms Live</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Scheduled Lectures</div>
            <div className="text-neutral-100 font-bold text-base mt-0.5 tabular-nums font-mono">{pulse.scheduledLecturesToday} Today</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Enrolled Cadets</div>
            <div className="text-cyan-300 font-bold text-base mt-0.5 tabular-nums font-mono">{pulse.totalStudentsEnrolled} Cadets</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Faculty on Duty</div>
            <div className="text-purple-300 font-bold text-base mt-0.5 tabular-nums font-mono">{pulse.facultyOnDuty} Professors</div>
          </div>
          <div>
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider">Overall Attendance</div>
            <div className="text-emerald-400 font-bold text-base mt-0.5 tabular-nums font-mono">
              {schoolData?.kpis.overallAttendancePercent || 92}% Verified
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 3. PRINCIPAL COMMAND INTERFACE: Controlled AI Diagnostic Generation */}
      <GlassCard level="intelligence" highlight className="p-6 space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
              Principal Command Interface · Diagnostic Generation
            </h2>
          </div>
          <span className="text-[11px] text-cyan-400/70 hidden sm:inline font-mono">Controlled Flow · Authorization Required</span>
        </div>

        <form onSubmit={handleProposeCommand} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="e.g., Run a 15-minute diagnostic Physics quiz across all Grade 11 Physics classes based on everything taught so far..."
            className="flex-1 bg-neutral-900/80 border border-white/[0.10] rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus-ring focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={isProposing || !commandInput.trim()}
            className="px-5 py-2.5 rounded-xl glass-btn-primary disabled:opacity-40 text-xs font-semibold tracking-wider transition-all shrink-0 cursor-pointer focus-ring"
          >
            {isProposing ? 'Analyzing Scope...' : 'Propose Command'}
          </button>
        </form>

        <p className="text-[11px] text-neutral-400">
          AI proposes grounded questions and target classes from verified curriculum. Explicit principal approval required before execution.
        </p>
      </GlassCard>

      {/* 4. PREVIEW MODAL FOR PRINCIPAL COMMAND APPROVAL */}
      {activeProposal && (
        <div className={`p-6 rounded-2xl ${glassTokens.level3} border border-amber-500/40 shadow-2xl space-y-4 animate-scale-in`}>
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Diagnostic Quiz Proposal Preview · Requires Approval</span>
            </div>
            <button
              onClick={() => setActiveProposal(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Target Grade:</span>
              <div className="text-slate-100 font-semibold">{activeProposal.targetGradeName}</div>
            </div>
            <div>
              <span className="text-slate-400">Target Course:</span>
              <div className="text-slate-100 font-semibold font-mono">{activeProposal.targetCourseCode}</div>
            </div>
            <div>
              <span className="text-slate-400">Duration & Questions:</span>
              <div className="text-slate-100 font-semibold tabular-nums font-mono">{activeProposal.durationMinutes} mins · {activeProposal.questionCount} Questions</div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <span className="text-slate-400">Covered Topics:</span>
            <div className="text-cyan-300">{activeProposal.coveredTopics.join(' · ')}</div>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
            <div className="text-xs font-semibold text-slate-300 uppercase">
              Question Previews ({activeProposal.previewQuestions.length} Sampled):
            </div>
            <div className="space-y-2">
              {activeProposal.previewQuestions.map((q, idx) => (
                <div key={q.id} className="p-3 rounded-lg border border-white/[0.06] bg-slate-900/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Q{idx + 1} · {q.topic} ({q.type})</span>
                    <span className="tabular-nums font-mono">{q.points} pts</span>
                  </div>
                  <div className="text-slate-200">{q.prompt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              onClick={() => setActiveProposal(null)}
              className="px-4 py-2 rounded-xl border border-white/[0.08] bg-slate-800 text-slate-300 text-xs cursor-pointer hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApproveAndExecute}
              disabled={isExecuting}
              className="px-5 py-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors focus-ring"
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
            <h2 className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
              Grade Intelligence & Cohort Overview
            </h2>
          </div>
          <span className="text-xs text-slate-400">Click a grade to drill down</span>
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
              className="p-5 rounded-xl border border-white/[0.08] glass-level-2-interactive cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-cyan-300 group-hover:text-cyan-200 font-mono">{grade.code}</span>
                <span className="text-slate-400 tabular-nums font-mono">{grade.studentsCount} Cadets Enrolled</span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-100 transition-colors">
                  {grade.name}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  <span className="tabular-nums font-mono">{grade.classesCount}</span> Classes <span className="text-slate-600">·</span> Avg Completion: <span className="tabular-nums font-mono text-slate-300">{grade.averageCompletionRate}%</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                <span className="text-amber-400/90 tabular-nums font-mono">{grade.attentionAlertsCount} Attention Signals</span>
                <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform font-medium">
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
            <h2 className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
              Teaching Overview · Faculty Velocity & Workload
            </h2>
          </div>
          <button
            onClick={() => {
              if (onNavigateToContext) {
                onNavigateToContext('principal_teachers', {});
              }
            }}
            className="text-xs text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer transition-colors focus-ring rounded"
          >
            <span>All Faculty Projections</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <GlassCard className="divide-y divide-white/[0.06] p-0 overflow-hidden">
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
            <div key={t.name} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors">
              <div className="space-y-0.5 min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">{t.name}</div>
                <div className="text-xs text-cyan-300 font-mono">{t.course}</div>
                <div className="text-[11px] text-slate-400">
                  {t.prepStatus} <span className="text-slate-600">·</span> {t.turnaround}
                </div>
              </div>
              <Badge variant="success" className="self-start sm:self-center">
                {t.status}
              </Badge>
            </div>
          ))}
        </GlassCard>
      </div>

      {/* 7. AUDIT LEDGER SHORTCUT */}
      <GlassCard className="p-4 flex items-center justify-between text-xs">
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
          className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 cursor-pointer transition-colors focus-ring rounded"
        >
          <span>View Audit Ledger</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </GlassCard>
    </div>
  );
};
