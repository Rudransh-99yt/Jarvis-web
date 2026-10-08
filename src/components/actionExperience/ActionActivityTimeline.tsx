import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Download,
  Layers,
  FileText,
  HelpCircle,
  Filter,
  CheckCircle2
} from 'lucide-react';
import type { ActionActivityItem } from '../../types/actionExperience.ts';
import { actionExperienceClient } from '../../services/actionExperienceClient.ts';

interface ActionActivityTimelineProps {
  contextId?: string;
  contextType?: string;
  onRefreshTrigger?: number;
  className?: string;
}

export const ActionActivityTimeline: React.FC<ActionActivityTimelineProps> = ({
  contextId,
  contextType,
  onRefreshTrigger = 0,
  className = ''
}) => {
  const [items, setItems] = useState<ActionActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterContext, setFilterContext] = useState<string>('ALL');
  const [undoingIds, setUndoingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<string | null>(null);

  const loadTimeline = async () => {
    setIsLoading(true);
    try {
      const data = await actionExperienceClient.getActivityTimeline({
        contextId: filterContext !== 'ALL' && contextId ? contextId : undefined,
        contextType: filterContext !== 'ALL' && contextType ? contextType : undefined
      });
      setItems(data);
    } catch (err) {
      console.error('Failed to load activity timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [contextId, contextType, filterContext, onRefreshTrigger]);

  const handleUndo = async (activityId: string) => {
    setUndoingIds((prev) => new Set(prev).add(activityId));
    try {
      const res = await actionExperienceClient.undoActivity(activityId);
      setItems((prev) =>
        prev.map((item) => (item.id === activityId ? { ...item, undone: true } : item))
      );
      setNotification(res.message);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification(`Undo failed: ${err.message || 'Error'}`);
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setUndoingIds((prev) => {
        const next = new Set(prev);
        next.delete(activityId);
        return next;
      });
    }
  };

  // Group items by Day: Today, Yesterday, Earlier
  const groupItemsByDate = (activityList: ActionActivityItem[]) => {
    const today: ActionActivityItem[] = [];
    const yesterday: ActionActivityItem[] = [];
    const earlier: ActionActivityItem[] = [];

    const now = new Date();
    const todayDateStr = now.toDateString();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateStr = yesterdayDate.toDateString();

    for (const item of activityList) {
      const d = new Date(item.timestamp);
      if (d.toDateString() === todayDateStr) {
        today.push(item);
      } else if (d.toDateString() === yesterdayDateStr) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    }

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Earlier', items: earlier }
    ].filter((g) => g.items.length > 0);
  };

  const grouped = groupItemsByDate(items);

  const getItemIcon = (category: string) => {
    switch (category) {
      case 'practice':
        return <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />;
      case 'knowledge':
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      case 'notes':
        return <FileText className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div
      className={`rounded-xl border border-cyan-500/20 bg-black/50 p-4 font-sans text-xs space-y-4 backdrop-blur-md ${className}`}
    >
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="font-mono text-xs font-bold text-white tracking-wider uppercase">
            Jarvis Activity Timeline
          </h3>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
            {items.length} Events
          </span>
        </div>

        {/* Isolation Context Filter */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <button
            onClick={() => setFilterContext('ALL')}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
              filterContext === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterContext('EDUCATION')}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
              filterContext === 'EDUCATION'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Education
          </button>
          <button
            onClick={() => setFilterContext('PERSONAL')}
            className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
              filterContext === 'PERSONAL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Personal
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="py-6 text-center text-neutral-400 font-mono text-xs">
          Loading activity history…
        </div>
      ) : grouped.length === 0 ? (
        <div className="py-6 text-center text-neutral-500 font-mono text-xs">
          No recent activity recorded for this context.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold px-1">
                {group.label}
              </div>

              <div className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all ${
                      item.undone
                        ? 'border-neutral-800 bg-black/30 opacity-60'
                        : 'border-white/[0.06] bg-white/[0.02] hover:border-cyan-500/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="p-1 rounded bg-black/40 border border-white/10 shrink-0 mt-0.5">
                          {getItemIcon(item.category)}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="text-xs font-medium text-neutral-200 leading-snug">
                            {item.title}
                          </div>

                          {/* Context and Count Telemetry */}
                          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-neutral-400">
                            <span className="text-cyan-400/80">
                              {item.contextType}
                            </span>
                            {item.reusedCount !== undefined && item.reusedCount > 0 && (
                              <span>• {item.reusedCount} Reused</span>
                            )}
                            {item.generatedCount !== undefined && item.generatedCount > 0 && (
                              <span>• {item.generatedCount} Generated</span>
                            )}
                            <span>
                              •{' '}
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Undo Trigger (ONLY where safe and not yet undone) */}
                      {item.canUndo && !item.undone && (
                        <button
                          onClick={() => handleUndo(item.id)}
                          disabled={undoingIds.has(item.id)}
                          className="shrink-0 px-2 py-1 rounded bg-white/5 hover:bg-rose-950/40 hover:text-rose-300 border border-white/10 text-neutral-400 text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                          title="Safely reverse this local creation"
                        >
                          <RotateCcw
                            className={`w-3 h-3 ${
                              undoingIds.has(item.id) ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Undo</span>
                        </button>
                      )}

                      {item.undone && (
                        <span className="shrink-0 text-[10px] font-mono text-neutral-500 italic">
                          Undone
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
