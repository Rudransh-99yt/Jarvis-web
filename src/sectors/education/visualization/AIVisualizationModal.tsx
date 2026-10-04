import React, { useState } from 'react';
import type {
  VisualizationDocument,
  VisualizationType,
  GraphVisualizationPayload
} from '../../../types/visualization.ts';
import { VisualizationHost } from './VisualizationHost.tsx';
import { X, Sparkles, Send, CheckCircle, AlertTriangle, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (doc: VisualizationDocument) => void;
  classSessionId?: string;
  courseCode?: string;
  activeBoardId?: string;
  activePageId?: string;
}

export const AIVisualizationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreated,
  classSessionId,
  courseCode = 'PHYS-301',
  activeBoardId,
  activePageId
}) => {
  const [visType, setVisType] = useState<VisualizationType>('GRAPH');
  const [title, setTitle] = useState('Wave Superposition (sin x + sin 2x)');
  const [formula, setFormula] = useState('sin(x) + 0.5 * sin(2 * x)');
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [isReleased, setIsReleased] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time preview document
  const previewDoc: VisualizationDocument = {
    id: 'vis-preview-temp',
    institutionId: 'inst-stark-academy',
    workspaceId: 'ws-main',
    courseCode,
    classSessionId,
    creatorId: 'teacher-1',
    creatorRole: 'teacher',
    title: title || 'Interactive Graph',
    visualizationType: visType,
    provenance: 'AI_GENERATED',
    status: isReleased ? 'RELEASED' : 'VALIDATED',
    isReleasedToStudents: isReleased,
    version: 1,
    payload: {
      type: 'GRAPH',
      title: title || 'Interactive Curve',
      series: [
        {
          id: 's1',
          name: formula || 'f(x)',
          expression: formula || 'sin(x)',
          color: '#00f2fe',
          strokeWidth: 2.5
        }
      ],
      xDomain: [xMin, xMax],
      yDomain: [-4, 4],
      grid: true,
      showCoordinates: true
    } as GraphVisualizationPayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleCreate = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/education/visualizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          visualizationType: visType,
          payload: previewDoc.payload,
          courseCode,
          classSessionId,
          isReleased
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to create visualization');
      }

      // If active SmartBoard page specified, automatically attach
      if (activeBoardId && activePageId && data.visualization?.id) {
        await fetch(`/api/education/visualizations/${data.visualization.id}/attach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boardId: activeBoardId,
            pageId: activePageId
          })
        });
      }

      if (onCreated) onCreated(data.visualization);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error creating visualization');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-cyan-300 font-hud">AI Interactive Visualization Studio</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {/* Preset / Type Selector */}
          <div className="flex gap-2 border-b border-slate-800 pb-3">
            {[
              { id: 'GRAPH', label: 'Math Graph' },
              { id: 'PROJECTILE', label: 'Projectile Motion' },
              { id: 'MOLECULE', label: 'Molecule Structure' },
              { id: 'DIAGRAM', label: 'Circuit / Diagram' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setVisType(t.id as any)}
                className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                  visType === t.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'bg-slate-800/60 text-slate-400 border border-transparent hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="text-slate-300 font-semibold">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                placeholder="e.g. Damped Waveform"
              />
            </div>

            {visType === 'GRAPH' && (
              <div className="flex flex-col gap-1">
                <label className="text-slate-300 font-semibold">Expression f(x)</label>
                <input
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-cyan-300 font-mono"
                  placeholder="e.g. sin(x) + cos(2*x)"
                />
              </div>
            )}
          </div>

          {/* Live Preview Canvas */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Live Mathematical Preview</span>
            <VisualizationHost document={previewDoc} width={580} height={280} interactive={true} />
          </div>

          {/* Release and Attach Options */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isReleased}
                onChange={(e) => setIsReleased(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500"
              />
              <span>Release immediately to enrolled students</span>
            </label>
            {activeBoardId && (
              <span className="text-cyan-400 flex items-center gap-1 font-mono">
                <Layers className="w-3.5 h-3.5" /> Will attach to active SmartBoard
              </span>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2 bg-red-950/60 border border-red-500/40 rounded text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-black px-4 py-1.5 rounded text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            {isSaving ? (
              'Creating...'
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Create & Publish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
