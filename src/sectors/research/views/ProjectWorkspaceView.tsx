import React, { useState } from 'react';
import type {
  ResearchProject,
  ResearchQuestion,
  EvidenceRecord,
  ResearchNote,
  ResearchReport,
  ResearchQuestionPriority,
  ResearchQuestionStatus,
  EvidenceCitation
} from '../../../types/research.ts';
import { ResearchQuestionsPanel } from './ResearchQuestionsPanel.tsx';
import { EvidencePanel } from './EvidencePanel.tsx';
import { NotesPanel } from './NotesPanel.tsx';
import { ResearchAssistantView } from './ResearchAssistantView.tsx';
import { ReportsView } from './ReportsView.tsx';
import {
  ArrowLeft,
  FlaskConical,
  HelpCircle,
  FileCheck2,
  FileText,
  Sparkles,
  BarChart2,
  Database,
  Layers,
  CheckCircle2,
  Clock,
  Archive,
  PauseCircle,
  ExternalLink
} from 'lucide-react';

interface ProjectWorkspaceViewProps {
  project: ResearchProject;
  questions: ResearchQuestion[];
  evidence: EvidenceRecord[];
  notes: ResearchNote[];
  reports: ResearchReport[];
  availableSpaces: Array<{ id: string; name: string; category?: string }>;
  onBackToProjects: () => void;
  onCreateQuestion: (data: {
    title: string;
    question: string;
    priority: ResearchQuestionPriority;
    notes?: string;
  }) => Promise<void>;
  onUpdateQuestionStatus?: (questionId: string, status: ResearchQuestionStatus, answer?: string) => Promise<void>;
  onAddEvidence: (item: {
    knowledgeSourceId: string;
    knowledgeSpaceId: string;
    sourceTitle: string;
    chunkId: string;
    chunkText: string;
    citation: EvidenceCitation;
    relevance: number;
    userNote?: string;
    questionId?: string;
  }) => Promise<void>;
  onDeleteEvidence?: (evidenceId: string) => Promise<void>;
  onCreateNote: (data: {
    title: string;
    content: string;
    tags: string[];
    linkedQuestionIds: string[];
    linkedEvidenceIds: string[];
  }) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onGenerateReport: (data: { title?: string; questionId?: string }) => Promise<void>;
}

export type WorkspaceTab = 'overview' | 'questions' | 'evidence' | 'notes' | 'assistant' | 'reports';

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  project,
  questions,
  evidence,
  notes,
  reports,
  availableSpaces,
  onBackToProjects,
  onCreateQuestion,
  onUpdateQuestionStatus,
  onAddEvidence,
  onDeleteEvidence,
  onCreateNote,
  onDeleteNote,
  onGenerateReport
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [targetQuestionForAssistant, setTargetQuestionForAssistant] = useState<ResearchQuestion | null>(null);

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: FlaskConical },
    { id: 'questions', label: 'Questions', icon: HelpCircle, badge: questions.length },
    { id: 'evidence', label: 'Evidence', icon: FileCheck2, badge: evidence.length },
    { id: 'notes', label: 'Notes', icon: FileText, badge: notes.length },
    { id: 'assistant', label: 'Research Assistant', icon: Sparkles },
    { id: 'reports', label: 'Reports', icon: BarChart2, badge: reports.length }
  ];

  const handleInvestigateQuestion = (q: ResearchQuestion) => {
    setTargetQuestionForAssistant(q);
    setActiveTab('assistant');
  };

  const projectSpaces = availableSpaces.filter((s) =>
    project.knowledgeSpaceIds?.includes(s.id)
  );

  return (
    <div className="space-y-5 font-mono">
      {/* Top Breadcrumb and Project Header */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/20 to-black p-5 backdrop-blur-xl shadow-[0_0_25px_rgba(6,182,212,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToProjects}
              className="p-1.5 rounded-lg border border-cyan-500/30 bg-black/60 text-cyan-400 hover:text-cyan-200 hover:border-cyan-400 transition-colors"
              title="Return to Projects List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-[10px] text-cyan-400/60 uppercase">
                <span>PROJECT LAB // {project.workspaceId}</span>
                <span>•</span>
                <span className="text-cyan-300">ID: {project.id}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {project.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {project.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-1.5 pt-4 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? 'border border-cyan-400/80 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'border border-cyan-500/15 bg-black/40 text-cyan-400/60 hover:text-cyan-300 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-cyan-400/60'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-cyan-400 text-black' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents Viewport */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Primary Hypothesis Card */}
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-black/90 to-slate-950/90 p-5 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <div className="text-[10px] uppercase font-bold text-cyan-400/70 tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>PRIMARY RESEARCH QUESTION & HYPOTHESIS:</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white font-sans italic leading-relaxed">
                "{project.researchQuestion}"
              </h2>

              {project.description && (
                <p className="mt-3 text-xs text-slate-300 leading-relaxed font-sans border-t border-cyan-500/10 pt-3">
                  {project.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-cyan-400/60 text-[11px]">
                  <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                  <span>Owner: {project.ownerId}</span>
                </div>

                <button
                  onClick={() => {
                    setTargetQuestionForAssistant(null);
                    setActiveTab('assistant');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>INVESTIGATE HYPOTHESIS</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setActiveTab('questions')}
                className="p-4 rounded-xl border border-cyan-500/20 bg-black/60 cursor-pointer hover:border-cyan-400/50 transition-all"
              >
                <div className="flex items-center justify-between text-cyan-400">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-xs">→</span>
                </div>
                <div className="text-2xl font-bold text-white mt-2">{questions.length}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase mt-0.5">RESEARCH QUESTIONS</div>
              </div>

              <div
                onClick={() => setActiveTab('evidence')}
                className="p-4 rounded-xl border border-cyan-500/20 bg-black/60 cursor-pointer hover:border-cyan-400/50 transition-all"
              >
                <div className="flex items-center justify-between text-emerald-400">
                  <FileCheck2 className="w-4 h-4" />
                  <span className="text-xs">→</span>
                </div>
                <div className="text-2xl font-bold text-white mt-2">{evidence.length}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase mt-0.5">EVIDENCE RECORDS</div>
              </div>

              <div
                onClick={() => setActiveTab('notes')}
                className="p-4 rounded-xl border border-cyan-500/20 bg-black/60 cursor-pointer hover:border-cyan-400/50 transition-all"
              >
                <div className="flex items-center justify-between text-blue-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">→</span>
                </div>
                <div className="text-2xl font-bold text-white mt-2">{notes.length}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase mt-0.5">RESEARCH NOTES</div>
              </div>

              <div
                onClick={() => setActiveTab('reports')}
                className="p-4 rounded-xl border border-cyan-500/20 bg-black/60 cursor-pointer hover:border-cyan-400/50 transition-all"
              >
                <div className="flex items-center justify-between text-purple-400">
                  <BarChart2 className="w-4 h-4" />
                  <span className="text-xs">→</span>
                </div>
                <div className="text-2xl font-bold text-white mt-2">{reports.length}</div>
                <div className="text-[10px] text-cyan-400/60 uppercase mt-0.5">SYNTHESIS REPORTS</div>
              </div>
            </div>

            {/* Linked Knowledge Spaces Card */}
            <div className="rounded-xl border border-cyan-500/20 bg-black/60 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-cyan-500/10">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>LINKED KNOWLEDGE SPACES ({projectSpaces.length})</span>
                </h3>
                <span className="text-[10px] text-cyan-400/60">Grounded Multi-Source Retrieval Base</span>
              </div>

              {projectSpaces.length === 0 ? (
                <p className="text-xs text-cyan-400/60">
                  Defaulting to all accessible workspace knowledge spaces.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projectSpaces.map((sp) => (
                    <div
                      key={sp.id}
                      className="p-3 rounded-lg border border-cyan-500/15 bg-slate-950/60 text-xs"
                    >
                      <div className="font-bold text-white">{sp.name}</div>
                      <div className="text-[10px] text-cyan-400/60 mt-0.5">
                        Category: {sp.category || 'General'} • ID: {sp.id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <ResearchQuestionsPanel
            questions={questions}
            projectId={project.id}
            onCreateQuestion={onCreateQuestion}
            onInvestigateQuestion={handleInvestigateQuestion}
            onUpdateQuestionStatus={onUpdateQuestionStatus}
          />
        )}

        {activeTab === 'evidence' && (
          <EvidencePanel
            evidence={evidence}
            questions={questions}
            onDeleteEvidence={onDeleteEvidence}
            onNavigateToAssistant={() => setActiveTab('assistant')}
          />
        )}

        {activeTab === 'notes' && (
          <NotesPanel
            notes={notes}
            questions={questions}
            evidence={evidence}
            onCreateNote={onCreateNote}
            onDeleteNote={onDeleteNote}
          />
        )}

        {activeTab === 'assistant' && (
          <ResearchAssistantView
            project={project}
            questions={questions}
            onAddEvidence={onAddEvidence}
            initialQuestion={targetQuestionForAssistant}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            reports={reports}
            questions={questions}
            projectId={project.id}
            projectTitle={project.title}
            onGenerateReport={onGenerateReport}
          />
        )}
      </div>
    </div>
  );
};
