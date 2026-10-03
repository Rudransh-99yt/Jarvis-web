import React, { useState } from 'react';
import { X, PlusCircle, Layers, FileText, Clock, Video } from 'lucide-react';

interface TeacherCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create_unit' | 'create_lesson';
  courseId: string;
  courseCode: string;
  unitId?: string;
  unitTitle?: string;
  onSaveUnit: (data: { title: string; description: string; learningObjectives: string[]; estimatedHours: number }) => Promise<void>;
  onSaveLesson: (data: { title: string; description: string; durationMinutes: number; notes: string; keyTakeaways: string[]; videoId?: string }) => Promise<void>;
}

export const TeacherCurriculumModal: React.FC<TeacherCurriculumModalProps> = ({
  isOpen,
  onClose,
  mode,
  courseId,
  courseCode,
  unitId,
  unitTitle,
  onSaveUnit,
  onSaveLesson
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(10);
  const [learningObjectivesText, setLearningObjectivesText] = useState('');
  
  // Lesson specific
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState('');
  const [keyTakeawaysText, setKeyTakeawaysText] = useState('');
  const [videoId, setVideoId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'create_unit') {
        const objectives = learningObjectivesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        await onSaveUnit({
          title,
          description,
          learningObjectives: objectives,
          estimatedHours: Number(estimatedHours) || 10
        });
      } else {
        const takeaways = keyTakeawaysText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        await onSaveLesson({
          title,
          description,
          durationMinutes: Number(durationMinutes) || 45,
          notes,
          keyTakeaways: takeaways,
          videoId: videoId || undefined
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save curriculum item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono">
      <div className="relative w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-slate-950 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3">
          <div className="flex items-center gap-2">
            {mode === 'create_unit' ? (
              <Layers className="w-5 h-5 text-cyan-400" />
            ) : (
              <FileText className="w-5 h-5 text-cyan-400" />
            )}
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              {mode === 'create_unit' ? `Add Unit to ${courseCode}` : `Add Topic to ${unitTitle || 'Unit'}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-cyan-400/60 hover:text-cyan-200 hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-cyan-300 font-bold mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'create_unit' ? 'e.g., Electromagnetic Quantization' : 'e.g., Creation & Annihilation Commutators'}
              className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-cyan-300 font-bold mb-1">Description / Summary</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of topics covered..."
              className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {mode === 'create_unit' ? (
            <>
              <div>
                <label className="block text-cyan-300 font-bold mb-1">Estimated Hours</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold mb-1">Learning Objectives (one per line)</label>
                <textarea
                  rows={3}
                  value={learningObjectivesText}
                  onChange={(e) => setLearningObjectivesText(e.target.value)}
                  placeholder="Formulate the wave equation&#10;Derive ladder commutation relations"
                  className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-cyan-300 font-bold mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-cyan-300 font-bold mb-1">Attach Video ID (Optional)</label>
                  <input
                    type="text"
                    value={videoId}
                    onChange={(e) => setVideoId(e.target.value)}
                    placeholder="e.g. vid-seed-phys-1"
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-cyan-300 font-bold mb-1">Lecture Notes / Formula Derivations</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detailed markdown or mathematical formulas for students..."
                  className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-cyan-300 font-bold mb-1">Key Takeaways (one per line)</label>
                <textarea
                  rows={2}
                  value={keyTakeawaysText}
                  onChange={(e) => setKeyTakeawaysText(e.target.value)}
                  placeholder="Commutator [a, a†] = 1&#10;Ground state E_0 = 1/2 ħ ω"
                  className="w-full bg-black/60 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-cyan-500/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-cyan-500/20 bg-black/40 text-cyan-400 hover:text-cyan-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 rounded-lg border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 font-bold disabled:opacity-40 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Curriculum Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
