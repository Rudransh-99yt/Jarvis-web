import React, { useState } from 'react';
import type { ResearchProject, ResearchProjectStatus } from '../../../types/research.ts';
import {
  FlaskConical,
  Plus,
  Search,
  FolderGit2,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  Sparkles,
  CheckCircle2,
  Clock,
  Archive,
  PauseCircle
} from 'lucide-react';

interface ProjectsOverviewViewProps {
  projects: ResearchProject[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (data: {
    title: string;
    researchQuestion: string;
    description: string;
    knowledgeSpaceIds: string[];
  }) => Promise<void>;
  availableSpaces: Array<{ id: string; name: string; category?: string }>;
}

export const ProjectsOverviewView: React.FC<ProjectsOverviewViewProps> = ({
  projects,
  onSelectProject,
  onCreateProject,
  availableSpaces
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ResearchProjectStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(['ks-quantum']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.researchQuestion.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuestion.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateProject({
        title: newTitle.trim(),
        researchQuestion: newQuestion.trim(),
        description: newDescription.trim(),
        knowledgeSpaceIds: selectedSpaces
      });
      setNewTitle('');
      setNewQuestion('');
      setNewDescription('');
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: ResearchProjectStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-950/40 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIVE
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-950/40 text-amber-300">
            <PauseCircle className="w-2.5 h-2.5" />
            PAUSED
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
            <CheckCircle2 className="w-2.5 h-2.5" />
            COMPLETED
          </span>
        );
      case 'archived':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-600 bg-slate-900 text-slate-400">
            <Archive className="w-2.5 h-2.5" />
            ARCHIVED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Deck */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/30 to-black p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-cyan-400 uppercase">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              <span>STARK RESEARCH & LABS // OPERATING SECTOR</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
              SCIENTIFIC RESEARCH WORKSPACE
            </h1>
            <p className="mt-2 text-sm text-cyan-200/70 max-w-2xl">
              Persistent hypotheses, multi-source grounded investigations, structured evidence locking, and verifiable citation reports backed by Stark Knowledge Spaces.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl border border-cyan-400/60 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 font-mono text-xs font-bold tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-cyan-300" />
            <span>NEW RESEARCH PROJECT</span>
          </button>
        </div>

        {/* High-Density Metric Counters */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-cyan-500/20 font-mono">
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-black/40">
            <div className="text-[10px] text-cyan-400/60 uppercase">ACTIVE PROJECTS</div>
            <div className="text-xl font-bold text-white mt-0.5">
              {projects.filter((p) => p.status === 'active').length}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-black/40">
            <div className="text-[10px] text-cyan-400/60 uppercase">GROUNDED SPACES</div>
            <div className="text-xl font-bold text-cyan-300 mt-0.5">
              {availableSpaces.length}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-black/40">
            <div className="text-[10px] text-cyan-400/60 uppercase">VERIFIED CITATIONS</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">
              100% GROUNDED
            </div>
          </div>
          <div className="p-3 rounded-lg border border-cyan-500/20 bg-black/40">
            <div className="text-[10px] text-cyan-400/60 uppercase">CORE PERSISTENCE</div>
            <div className="text-xl font-bold text-blue-400 mt-0.5">
              DURABLE DISK
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects or research questions..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-cyan-500/30 bg-black/60 text-cyan-100 placeholder-cyan-500/40 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'active', 'paused', 'completed', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wider uppercase transition-all ${
                statusFilter === st
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                  : 'border-cyan-500/20 bg-black/40 text-cyan-400/60 hover:text-cyan-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-cyan-500/20 bg-black/40 p-12 text-center backdrop-blur-md">
          <FolderGit2 className="w-12 h-12 text-cyan-500/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white font-mono">No Research Projects Found</h3>
          <p className="text-xs text-cyan-400/60 font-mono mt-1 max-w-md mx-auto">
            {searchQuery ? 'No projects match your search query.' : 'Initialize a new research project to begin grounded literature investigations.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="group relative rounded-xl border border-cyan-500/20 hover:border-cyan-400/60 bg-gradient-to-br from-black/80 to-slate-950/80 p-5 backdrop-blur-md cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getStatusBadge(project.status)}
                  <span className="text-[10px] font-mono text-cyan-500/60">
                    ID: {project.id}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white font-mono group-hover:text-cyan-300 transition-colors leading-snug">
                  {project.title}
                </h3>

                <div className="mt-3 p-3 rounded-lg border border-cyan-500/15 bg-cyan-950/20 font-mono text-xs">
                  <div className="text-[9px] uppercase tracking-wider text-cyan-400/70 font-semibold mb-1">
                    PRIMARY RESEARCH HYPOTHESIS:
                  </div>
                  <div className="text-cyan-100 italic line-clamp-2">
                    "{project.researchQuestion}"
                  </div>
                </div>

                {project.description && (
                  <p className="mt-3 text-xs text-slate-300 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-cyan-500/10 flex items-center justify-between font-mono text-[11px] text-cyan-400/70">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{project.knowledgeSpaceIds?.length || 0} Grounded Spaces</span>
                </div>

                <div className="flex items-center gap-1 text-cyan-300 font-bold group-hover:translate-x-1 transition-transform">
                  <span>ENTER LAB</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
          <div className="relative w-full max-w-xl rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                <FlaskConical className="w-4 h-4" />
                <span>INITIALIZE NEW RESEARCH PROJECT</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  PROJECT TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Vibranium Molecular Shear & Toroidal Plasma Cohesion"
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  PRIMARY RESEARCH QUESTION / HYPOTHESIS *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="e.g. Can surface flux integration prove boundary containment without plasma leakage?"
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  SCOPE & DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Theoretical and experimental scope..."
                  className="w-full px-3 py-2 rounded-lg border border-cyan-500/30 bg-black text-cyan-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-cyan-300 font-bold mb-1">
                  LINKED GROUNDED KNOWLEDGE SPACES
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-36 overflow-y-auto p-1">
                  {availableSpaces.map((sp) => {
                    const isChecked = selectedSpaces.includes(sp.id);
                    return (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedSpaces(selectedSpaces.filter((id) => id !== sp.id));
                          } else {
                            setSelectedSpaces([...selectedSpaces, sp.id]);
                          }
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          isChecked
                            ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                            : 'border-slate-800 bg-black/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                            isChecked ? 'border-cyan-400 bg-cyan-500 text-black font-bold' : 'border-slate-600'
                          }`}
                        >
                          {isChecked && '✓'}
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-bold truncate">{sp.name}</div>
                          <div className="text-[9px] opacity-60 truncate">{sp.category || sp.id}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-cyan-500/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg border border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold"
                >
                  {isSubmitting ? 'Initializing...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
