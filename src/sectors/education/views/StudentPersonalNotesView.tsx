import React, { useState } from 'react';
import type { EducationClass, KnowledgeSpace } from '../../../types/education.ts';
import { BookOpen, PlusCircle, Bookmark, Sparkles, FileText, Trash2, ArrowLeft } from 'lucide-react';

interface PersonalNote {
  id: string;
  title: string;
  courseCode: string;
  topic: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

const INITIAL_NOTES: PersonalNote[] = [
  {
    id: 'note-1',
    title: 'Commutator [a, a†] = 1 Proof Summary',
    courseCode: 'PHYS-301',
    topic: 'Harmonic Oscillators',
    content: '1. Substitute dimensionless operators a = sqrt(m omega / 2 hbar) (x + i p / m omega).\n2. Expand [x, p] = i hbar.\n3. Symmetric ordering yields exactly 1.\n4. Energy E_n = hbar omega (n + 1/2).',
    tags: ['Quantum', 'Derivation', 'Exams'],
    updatedAt: 'Today at 09:30 AM'
  },
  {
    id: 'note-2',
    title: 'Generalized Stokes Theorem Formulations',
    courseCode: 'MATH-240',
    topic: 'Differential Forms',
    content: 'Universal formula: integral_M d omega = integral_{partial M} omega.\nApplies to FTC (1D), Green Theorem (2D), Stokes Theorem (2D in 3D), and Gauss Divergence (3D).',
    tags: ['Calculus', 'Theorems', 'Differential Forms'],
    updatedAt: 'Yesterday'
  }
];

interface StudentPersonalNotesViewProps {
  classes: EducationClass[];
  knowledgeSpaces: KnowledgeSpace[];
  onBackToHome: () => void;
  onQueryGrounded?: (spaceId: string, query: string) => Promise<any>;
}

export const StudentPersonalNotesView: React.FC<StudentPersonalNotesViewProps> = ({
  classes,
  onBackToHome
}) => {
  const [notes, setNotes] = useState<PersonalNote[]>(INITIAL_NOTES);
  const [selectedNoteId, setSelectedNoteId] = useState<string>(INITIAL_NOTES[0].id);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(classes[0]?.code || 'PHYS-301');
  const [isCreating, setIsCreating] = useState(false);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: PersonalNote = {
      id: `note-${Date.now()}`,
      title: newTitle,
      courseCode: selectedCourse,
      topic: 'Personal Study',
      content: newContent,
      tags: ['Study Note'],
      updatedAt: 'Just now'
    };

    setNotes((prev) => [created, ...prev]);
    setSelectedNoteId(created.id);
    setNewTitle('');
    setNewContent('');
    setIsCreating(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(notes.find((n) => n.id !== id)?.id || '');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div>
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
            Personal Knowledge Hub · Study Notes & Formula Cheatsheets
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            My Study Workspace & Notes
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + New Note
          </button>
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors p-2 rounded hover:bg-cyan-500/10 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Notes</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Notes List + Editor/Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left: Notes Navigator (4 cols) */}
        <div className="space-y-2 lg:col-span-4 min-w-0">
          <div className="text-xs font-mono font-bold text-cyan-400/80 uppercase px-1 mb-2">
            My Notes ({notes.length})
          </div>

          <div className="space-y-2">
            {notes.map((n) => {
              const isSelected = n.id === selectedNoteId;

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    setSelectedNoteId(n.id);
                    setIsCreating(false);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5 ${
                    isSelected && !isCreating
                      ? 'border-cyan-400 bg-cyan-950/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'border-cyan-500/15 bg-black/30 text-cyan-300/80 hover:border-cyan-500/35 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300">{n.courseCode}</span>
                    <span className="text-[10px] font-mono text-cyan-400/50">{n.updatedAt}</span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate">{n.title}</h3>
                  <p className="text-[11px] text-cyan-100/60 line-clamp-1">{n.content}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Note Canvas / Creator (8 cols) */}
        <div className="lg:col-span-8 min-w-0">
          {isCreating ? (
            <div className="p-6 rounded-2xl border border-cyan-500/30 bg-black/50 backdrop-blur-md space-y-4">
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Create New Study Note
              </h2>

              <form onSubmit={handleCreateNote} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-cyan-300 font-bold mb-1">Course</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-200 focus:outline-none focus:border-cyan-400"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.code} className="bg-slate-950 text-white">
                          {c.code}: {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-cyan-300 font-bold mb-1">Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wave function normalization notes"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-cyan-300 font-bold mb-1">Note Content / Derivations</label>
                  <textarea
                    rows={8}
                    required
                    placeholder="Write your study notes, formulas, or takeaways..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400 font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-lg border border-cyan-500/20 bg-black/40 text-cyan-400 hover:text-cyan-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold cursor-pointer"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            </div>
          ) : selectedNote ? (
            <div className="p-6 rounded-2xl border border-cyan-500/30 bg-black/50 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                      {selectedNote.courseCode}
                    </span>
                    <span className="text-xs font-mono text-cyan-400/60">{selectedNote.topic}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white font-mono mt-1">{selectedNote.title}</h2>
                </div>

                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="p-2 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 transition-colors cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl border border-cyan-500/15 bg-black/60 font-mono text-xs text-cyan-200 leading-relaxed whitespace-pre-line min-h-[250px]">
                {selectedNote.content}
              </div>

              <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-cyan-400/60">
                <span>Tags:</span>
                {selectedNote.tags.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20 text-cyan-300">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-mono text-cyan-400/60 border border-cyan-500/15 rounded-2xl bg-black/30">
              No notes created yet. Click "+ New Note" to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
