import React, { useState } from 'react';
import { Plus, Check, Trash2, FileText, AlertCircle } from 'lucide-react';
import { StarkDirective } from '../types';
import { soundEffects } from '../services/soundEffects';

interface MemosPanelProps {
  directives: StarkDirective[];
  onAddDirective: (text: string) => void;
  onToggleDirective: (id: string) => void;
  onDeleteDirective: (id: string) => void;
}

export const MemosPanel: React.FC<MemosPanelProps> = ({
  directives,
  onAddDirective,
  onToggleDirective,
  onDeleteDirective
}) => {
  const [newText, setNewText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    soundEffects.playAffirmative();
    onAddDirective(newText.trim());
    setNewText('');
  };

  const getPriorityBadge = (p: StarkDirective['priority']) => {
    switch (p) {
      case 'omega':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'low':
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="flex flex-col gap-2.5 font-mono-code text-xs w-full min-w-0">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 gap-2 min-w-0">
        <span className="text-cyan-300 font-bold tracking-wider flex items-center gap-1.5 truncate">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
          STARK DIRECTIVES & MEMOS
        </span>
        <span className="text-[10px] text-cyan-400/60 uppercase shrink-0">
          {directives.filter((d) => !d.completed).length} PENDING
        </span>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-1.5 min-w-0 w-full">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Enter directive or note..."
          className="flex-1 min-w-0 bg-black/60 border border-cyan-500/30 rounded px-2.5 py-1.5 text-xs text-white placeholder-cyan-500/40 focus:outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-200 px-3 py-1.5 rounded flex items-center gap-1 font-bold transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          LOG
        </button>
      </form>

      {/* Directives List */}
      <div className="space-y-1.5 overflow-y-auto max-h-56 pr-1 w-full min-w-0">
        {directives.length === 0 ? (
          <div className="text-center py-6 text-cyan-500/40 text-[11px]">
            No directives logged in local archive.
          </div>
        ) : (
          directives.map((directive) => (
            <div
              key={directive.id}
              className={`p-2 rounded border flex items-start justify-between gap-2.5 transition-all w-full min-w-0 ${
                directive.completed
                  ? 'bg-black/30 border-slate-800 opacity-60'
                  : 'bg-black/50 border-cyan-500/20 hover:border-cyan-500/40'
              }`}
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    onToggleDirective(directive.id);
                  }}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    directive.completed
                      ? 'bg-cyan-500 border-cyan-400 text-black'
                      : 'border-cyan-500/40 hover:border-cyan-400'
                  }`}
                >
                  {directive.completed && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11px] leading-snug break-words ${
                      directive.completed ? 'line-through text-cyan-500/50' : 'text-cyan-100'
                    }`}
                  >
                    {directive.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-cyan-500/50 truncate">
                    <span>{directive.category}</span>
                    <span>•</span>
                    <span>{directive.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span
                  className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase border shrink-0 ${getPriorityBadge(
                    directive.priority
                  )}`}
                >
                  {directive.priority}
                </span>
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    onDeleteDirective(directive.id);
                  }}
                  className="p-1 text-red-400/60 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
