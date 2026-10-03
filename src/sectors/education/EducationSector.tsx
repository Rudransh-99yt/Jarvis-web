import React, { useState, useEffect } from 'react';
import type { EducationRole, EducationClass, Assignment, StudentSubmission, KnowledgeSpace, GroundedQueryResponse } from '../../types/education.ts';
import { StudentDashboard } from './views/StudentDashboard.tsx';
import { TeacherDashboard } from './views/TeacherDashboard.tsx';
import { ClassesView } from './views/ClassesView.tsx';
import { AssignmentsView } from './views/AssignmentsView.tsx';
import { KnowledgeWorkspaceView } from './views/KnowledgeWorkspaceView.tsx';
import { StudyAssistantView } from './views/StudyAssistantView.tsx';
import { LayoutDashboard, BookOpen, FileCheck2, Sparkles, Brain, UserCheck, RefreshCw } from 'lucide-react';

interface EducationSectorProps {
  currentRole: EducationRole;
  onToggleRole: () => void;
  onSendChatMessage: (message: string, context?: any) => Promise<string>;
}

export type EducationTab = 'overview' | 'classes' | 'assignments' | 'knowledge' | 'study';

export const EducationSector: React.FC<EducationSectorProps> = ({
  currentRole,
  onToggleRole,
  onSendChatMessage
}) => {
  const [activeTab, setActiveTab] = useState<EducationTab>('overview');
  const [classes, setClasses] = useState<EducationClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('ks-quantum');
  const [selectedGradingSub, setSelectedGradingSub] = useState<StudentSubmission | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Hydrate state from server REST API on mount
  const fetchEducationState = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/education/state');
      if (res.ok) {
        const data = await res.json();
        if (data.classes) setClasses(data.classes);
        if (data.assignments) setAssignments(data.assignments);
        if (data.submissions) setSubmissions(data.submissions);
        if (data.knowledgeSpaces) setKnowledgeSpaces(data.knowledgeSpaces);
      }
    } catch (err) {
      console.warn('Failed to fetch education state from API, using fallback store:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchEducationState();
  }, []);

  // Teacher Create Assignment Handler
  const handleCreateAssignment = async (data: {
    classId: string;
    title: string;
    description: string;
    instructions: string;
    dueDate: string;
    maxScore: number;
    category?: 'Worksheet' | 'Lab Report' | 'Exam' | 'Project';
  }) => {
    try {
      const res = await fetch('/api/education/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, teacherId: 'teacher-1' })
      });
      if (res.ok) {
        const payload = await res.json();
        setAssignments((prev) => [payload.assignment, ...prev]);
        showNotification(`Assignment '${data.title}' published successfully!`);
      }
    } catch (err) {
      console.error('Failed to create assignment:', err);
    }
  };

  // Student Submit Work Handler
  const handleSubmitWork = async (data: {
    assignmentId: string;
    studentId: string;
    studentName: string;
    content: string;
    attachments?: Array<{ name: string; size: string }>;
  }) => {
    try {
      const res = await fetch('/api/education/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const payload = await res.json();
        setSubmissions((prev) => {
          const filtered = prev.filter(
            (s) => !(s.assignmentId === data.assignmentId && s.studentId === data.studentId)
          );
          return [payload.submission, ...filtered];
        });
        showNotification(`Your work for assignment was successfully submitted!`);
      }
    } catch (err) {
      console.error('Failed to submit work:', err);
    }
  };

  // Teacher Grade Submission Handler
  const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      const res = await fetch(`/api/education/submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, feedback })
      });
      if (res.ok) {
        const payload = await res.json();
        setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? payload.submission : s)));
        showNotification(`Submission graded (${grade}/100) with feedback returned.`);
      }
    } catch (err) {
      console.error('Failed to grade submission:', err);
    }
  };

  // Knowledge Space Handlers
  const handleCreateSpace = async (title: string, description: string, category: string) => {
    try {
      const res = await fetch('/api/education/knowledge-spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, category })
      });
      if (res.ok) {
        const payload = await res.json();
        setKnowledgeSpaces((prev) => [...prev, payload.knowledgeSpace]);
        setSelectedSpaceId(payload.knowledgeSpace.id);
        showNotification(`Knowledge Workspace '${title}' created.`);
      }
    } catch (err) {
      console.error('Failed to create space:', err);
    }
  };

  const handleAddSource = async (spaceId: string, title: string, fullText: string, type: 'pdf' | 'notes' | 'lecture' | 'web') => {
    try {
      const res = await fetch(`/api/education/knowledge-spaces/${spaceId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, fullText, type })
      });
      if (res.ok) {
        const payload = await res.json();
        setKnowledgeSpaces((prev) =>
          prev.map((s) => (s.id === spaceId ? { ...s, sources: [...s.sources, payload.source] } : s))
        );
        showNotification(`Document '${title}' indexed in knowledge space.`);
      }
    } catch (err) {
      console.error('Failed to add source:', err);
    }
  };

  const handleDeleteSource = async (spaceId: string, sourceId: string) => {
    try {
      const res = await fetch(`/api/knowledge-spaces/${spaceId}/sources/${sourceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setKnowledgeSpaces((prev) =>
          prev.map((s) => (s.id === spaceId ? { ...s, sources: s.sources.filter((src) => src.id !== sourceId) } : s))
        );
        showNotification(`Knowledge source purged from workspace.`);
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleReindexSource = async (spaceId: string, sourceId: string) => {
    try {
      const res = await fetch(`/api/knowledge-spaces/${spaceId}/sources/${sourceId}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceReindex: true })
      });
      if (res.ok) {
        showNotification(`Re-indexing triggered for source ${sourceId}.`);
      }
    } catch (err) {
      console.error('Failed to reindex source:', err);
    }
  };

  const handleQueryGrounded = async (spaceId: string, query: string): Promise<GroundedQueryResponse> => {
    const res = await fetch(`/api/education/knowledge-spaces/${spaceId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, userRole: currentRole, userId: currentRole === 'student' ? 'student-1' : 'teacher-1' })
    });
    if (!res.ok) throw new Error('Query failed');
    return res.json();
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'classes' as const, label: 'Classes & Syllabi', icon: BookOpen },
    { id: 'assignments' as const, label: 'Assignments', icon: FileCheck2 },
    { id: 'knowledge' as const, label: 'NotebookLM / Knowledge', icon: Sparkles },
    { id: 'study' as const, label: 'Study AI Assistant', icon: Brain }
  ];

  return (
    <div className="space-y-6">
      {/* Top Sector Navigation & Role Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-cyan-500/20 bg-black/50 p-3 rounded-xl backdrop-blur-md">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono tracking-wider transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-cyan-400/60'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Demo Role Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchEducationState}
            disabled={isSyncing}
            title="Refresh academic data from server"
            className="p-2 rounded-lg border border-cyan-500/20 bg-black/40 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onToggleRole}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-blue-500/40 bg-gradient-to-r from-blue-950/40 to-cyan-950/40 hover:border-cyan-400/60 text-xs font-mono text-cyan-200 transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)]"
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>ROLE: <strong className="text-cyan-300 uppercase">{currentRole === 'student' ? 'Alex Chen [Student]' : 'Dr. Sarah [Teacher]'}</strong></span>
            <span className="text-[10px] text-cyan-400/60 underline ml-1">Switch</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 rounded-lg border border-cyan-400/40 bg-cyan-950/80 text-cyan-200 text-xs font-mono flex items-center gap-2 shadow-lg animate-fade-in">
          <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{notification}</span>
        </div>
      )}

      {/* Active Tab View Rendering */}
      {activeTab === 'overview' && (
        currentRole === 'student' ? (
          <StudentDashboard
            classes={classes}
            assignments={assignments}
            submissions={submissions}
            knowledgeSpaces={knowledgeSpaces}
            onNavigateTab={(t) => setActiveTab(t)}
            onSelectKnowledgeSpace={(id) => setSelectedSpaceId(id)}
          />
        ) : (
          <TeacherDashboard
            classes={classes}
            assignments={assignments}
            submissions={submissions}
            onNavigateTab={(t) => setActiveTab(t)}
            onOpenCreateAssignmentModal={() => {
              setActiveTab('assignments');
            }}
            onSelectSubmissionForGrading={(sub) => {
              setSelectedGradingSub(sub);
              setActiveTab('assignments');
            }}
          />
        )
      )}

      {activeTab === 'classes' && (
        <ClassesView classes={classes} currentRole={currentRole} />
      )}

      {activeTab === 'assignments' && (
        <AssignmentsView
          assignments={assignments}
          submissions={submissions}
          classes={classes}
          currentRole={currentRole}
          onCreateAssignment={handleCreateAssignment}
          onSubmitWork={handleSubmitWork}
          onGradeSubmission={handleGradeSubmission}
          selectedSubmissionForGrading={selectedGradingSub}
          onClearSelectedGradingSubmission={() => setSelectedGradingSub(null)}
        />
      )}

      {activeTab === 'knowledge' && (
        <KnowledgeWorkspaceView
          knowledgeSpaces={knowledgeSpaces}
          activeSpaceId={selectedSpaceId}
          onSelectSpace={(id) => setSelectedSpaceId(id)}
          onCreateSpace={handleCreateSpace}
          onAddSource={handleAddSource}
          onDeleteSource={handleDeleteSource}
          onReindexSource={handleReindexSource}
          onQueryGrounded={handleQueryGrounded}
        />
      )}

      {activeTab === 'study' && (
        <StudyAssistantView
          currentRole={currentRole}
          onSendMessage={(msg) => onSendChatMessage(msg, { sector: 'education', role: currentRole, activeSpaceId: selectedSpaceId })}
        />
      )}
    </div>
  );
};
