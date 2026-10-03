import React, { useState } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import { ClassMessagingDeck } from './ClassMessagingDeck.tsx';
import { MessageSquare, Radio, Users, Hash, ChevronRight, ArrowLeft } from 'lucide-react';

interface EducationCommunityViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  initialClassId?: string;
  onBackToHome: () => void;
}

export const EducationCommunityView: React.FC<EducationCommunityViewProps> = ({
  classes,
  currentRole,
  initialClassId,
  onBackToHome
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || classes[0]?.id || '');
  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-md">
        <div>
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
            Academic Community · Course Channels & Discussion Threads
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Class Channels & Peer Study Groups
          </h1>
        </div>

        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors p-2 rounded hover:bg-cyan-500/10 cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Community</span>
        </button>
      </div>

      {/* Main Grid: Channel Sidebar + Active Chat Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
        {/* Left: Channels / Classes List (4 cols) */}
        <div className="space-y-2 lg:col-span-4 min-w-0">
          <div className="text-xs font-mono font-bold text-cyan-400/80 uppercase px-1 mb-2">
            Active Course Channels ({classes.length})
          </div>

          <div className="space-y-2">
            {classes.map((cls) => {
              const isSelected = cls.id === selectedClassId;

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : 'border-cyan-500/15 bg-black/30 text-cyan-300/80 hover:border-cyan-500/35 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-mono truncate">{cls.code}</div>
                      <div className="text-[10px] text-cyan-400/60 truncate">{cls.name}</div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-cyan-400 shrink-0">
                    {cls.studentCount} members
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Active Messaging Deck (8 cols) */}
        <div className="lg:col-span-8 min-w-0">
          {selectedClass && (
            <ClassMessagingDeck
              currentClass={selectedClass}
              currentRole={currentRole}
              workspaceId="ws-stark-core"
            />
          )}
        </div>
      </div>
    </div>
  );
};
