import React, { useState, useEffect } from 'react';
import type {
  ResearchProject,
  ResearchQuestion,
  EvidenceRecord,
  ResearchNote,
  ResearchReport,
  ResearchQuestionPriority,
  ResearchQuestionStatus,
  EvidenceCitation
} from '../../types/research.ts';
import { ProjectsOverviewView } from './views/ProjectsOverviewView.tsx';
import { ProjectWorkspaceView } from './views/ProjectWorkspaceView.tsx';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface ResearchSectorProps {
  onSendChatMessage?: (message: string, context?: any) => Promise<string>;
}

export const ResearchSector: React.FC<ResearchSectorProps> = ({ onSendChatMessage }) => {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ResearchProject | null>(null);
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [availableSpaces, setAvailableSpaces] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch all projects and knowledge spaces
  const fetchInitialState = async () => {
    setIsSyncing(true);
    try {
      const [projRes, eduRes] = await Promise.all([
        fetch('/api/research/projects'),
        fetch('/api/education/state')
      ]);

      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data.projects || []);
      }

      if (eduRes.ok) {
        const eduData = await eduRes.json();
        if (eduData.knowledgeSpaces) {
          setAvailableSpaces(
            eduData.knowledgeSpaces.map((s: any) => ({
              id: s.id,
              name: s.name,
              category: s.category
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Failed to fetch research sector state:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Load details for selected project
  const loadProjectDetails = async (projectId: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/research/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveProject(data.project);
        setQuestions(data.questions || []);
        setEvidence(data.evidence || []);
        setNotes(data.notes || []);
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchInitialState();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails(selectedProjectId);
    } else {
      setActiveProject(null);
      setQuestions([]);
      setEvidence([]);
      setNotes([]);
      setReports([]);
    }
  }, [selectedProjectId]);

  // Actions
  const handleCreateProject = async (data: {
    title: string;
    researchQuestion: string;
    description: string;
    knowledgeSpaceIds: string[];
  }) => {
    try {
      const res = await fetch('/api/research/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          workspaceId: 'ws-stark-core',
          ownerId: 'user-tony'
        })
      });

      if (res.ok) {
        const payload = await res.json();
        setProjects((prev) => [payload.project, ...prev]);
        setSelectedProjectId(payload.project.id);
        showNotification(`Project '${data.title}' initialized!`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleCreateQuestion = async (data: {
    title: string;
    question: string;
    priority: ResearchQuestionPriority;
    notes?: string;
  }) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/research/projects/${selectedProjectId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const payload = await res.json();
        setQuestions((prev) => [payload.question, ...prev]);
        showNotification(`Question '${data.title}' tracked!`);
      }
    } catch (err) {
      console.error('Failed to create question:', err);
    }
  };

  const handleUpdateQuestionStatus = async (
    questionId: string,
    status: ResearchQuestionStatus,
    answer?: string
  ) => {
    try {
      const res = await fetch(`/api/research/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, answer })
      });
      if (res.ok) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? { ...q, status, answer: answer || q.answer } : q))
        );
        showNotification(`Question updated to '${status}'`);
      }
    } catch (err) {
      console.error('Failed to update question status:', err);
    }
  };

  const handleAddEvidence = async (item: {
    knowledgeSourceId: string;
    knowledgeSpaceId: string;
    sourceTitle: string;
    chunkId: string;
    chunkText: string;
    citation: EvidenceCitation;
    relevance: number;
    userNote?: string;
    questionId?: string;
  }) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/research/projects/${selectedProjectId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        const payload = await res.json();
        setEvidence((prev) => [payload.evidence, ...prev]);
        showNotification(`Evidence locked from '${item.sourceTitle}'!`);
      }
    } catch (err) {
      console.error('Failed to lock evidence:', err);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    try {
      const res = await fetch(`/api/research/evidence/${evidenceId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setEvidence((prev) => prev.filter((e) => e.id !== evidenceId));
        showNotification('Evidence record removed.');
      }
    } catch (err) {
      console.error('Failed to delete evidence:', err);
    }
  };

  const handleCreateNote = async (data: {
    title: string;
    content: string;
    tags: string[];
    linkedQuestionIds: string[];
    linkedEvidenceIds: string[];
  }) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/research/projects/${selectedProjectId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const payload = await res.json();
        setNotes((prev) => [payload.note, ...prev]);
        showNotification(`Note '${data.title}' saved!`);
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/research/notes/${noteId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showNotification('Note removed.');
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleGenerateReport = async (data: { title?: string; questionId?: string }) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/research/projects/${selectedProjectId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const payload = await res.json();
        setReports((prev) => [payload.report, ...prev]);
        showNotification(`Report '${payload.report.title}' successfully generated!`);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-xl border border-cyan-400 bg-slate-950/95 px-4 py-3 text-xs font-mono text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{notification}</span>
        </div>
      )}

      {selectedProjectId && activeProject ? (
        <ProjectWorkspaceView
          project={activeProject}
          questions={questions}
          evidence={evidence}
          notes={notes}
          reports={reports}
          availableSpaces={availableSpaces}
          onBackToProjects={() => setSelectedProjectId(null)}
          onCreateQuestion={handleCreateQuestion}
          onUpdateQuestionStatus={handleUpdateQuestionStatus}
          onAddEvidence={handleAddEvidence}
          onDeleteEvidence={handleDeleteEvidence}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onGenerateReport={handleGenerateReport}
        />
      ) : (
        <ProjectsOverviewView
          projects={projects}
          onSelectProject={(id) => setSelectedProjectId(id)}
          onCreateProject={handleCreateProject}
          availableSpaces={availableSpaces}
        />
      )}
    </div>
  );
};
