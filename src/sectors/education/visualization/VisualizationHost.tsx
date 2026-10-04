// Unified Visualization Host Component (Phase D.10)
import React, { useState } from 'react';
import type { VisualizationDocument } from '../../../types/visualization.ts';
import { InteractiveGraphRenderer } from './InteractiveGraphRenderer.tsx';
import { ProjectileMotionRenderer } from './ProjectileMotionRenderer.tsx';
import { MoleculesRenderer } from './MoleculesRenderer.tsx';
import { DiagramRenderer } from './DiagramRenderer.tsx';
import { DataChartRenderer } from './DataChartRenderer.tsx';

interface VisualizationHostProps {
  document: VisualizationDocument;
  width?: number;
  height?: number;
  onParametersChange?: (newParams: any) => void;
  onDelete?: () => void;
  isReadOnly?: boolean;
}

export const VisualizationHost: React.FC<VisualizationHostProps> = ({
  document,
  width = 600,
  height = 400,
  onParametersChange,
  onDelete,
  isReadOnly = false
}) => {
  const [showA11y, setShowA11y] = useState(false);

  // Type badge styling
  const typeBadgeColor =
    document.type === 'GRAPH' || document.type === 'EQUATION'
      ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
      : document.type === 'PHYSICS'
      ? 'bg-amber-950 text-amber-400 border-amber-800'
      : document.type === 'CHEMISTRY'
      ? 'bg-rose-950 text-rose-400 border-rose-800'
      : document.type === 'DIAGRAM'
      ? 'bg-purple-950 text-purple-400 border-purple-800'
      : 'bg-emerald-950 text-emerald-400 border-emerald-800';

  const renderContent = () => {
    switch (document.type) {
      case 'GRAPH':
      case 'EQUATION':
        return (
          <InteractiveGraphRenderer
            parameters={document.parameters as any}
            width={width}
            height={height}
            onParametersChange={onParametersChange}
            isReadOnly={isReadOnly}
          />
        );

      case 'PHYSICS':
        return (
          <ProjectileMotionRenderer
            parameters={document.parameters as any}
            width={width}
            height={height}
            onParametersChange={onParametersChange}
            isReadOnly={isReadOnly}
          />
        );

      case 'CHEMISTRY':
        return (
          <MoleculesRenderer
            parameters={document.parameters as any}
            width={width}
            height={height}
            isReadOnly={isReadOnly}
          />
        );

      case 'DIAGRAM':
      case 'FLOW':
      case 'CONCEPT_MAP':
        return (
          <DiagramRenderer
            parameters={document.parameters as any}
            width={width}
            height={height}
          />
        );

      case 'DATA_CHART':
        return (
          <DataChartRenderer
            parameters={document.parameters as any}
            width={width}
            height={height}
          />
        );

      default:
        return (
          <div className="p-6 text-center text-slate-400 font-mono text-sm bg-slate-900 rounded-xl border border-slate-800">
            Unsupported visualization type: {document.type}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-950 border border-slate-800 p-4 shadow-2xl">
      {/* Top Header Card */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold border ${typeBadgeColor}`}
            >
              {document.type}
            </span>
            <h3 className="font-bold text-slate-100 text-base">{document.title}</h3>
          </div>
          {document.description && (
            <p className="text-xs text-slate-400 max-w-xl">{document.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Accessibility Info Button */}
          <button
            onClick={() => setShowA11y(!showA11y)}
            title="Toggle Accessible Description & Data Table"
            className="p-1.5 px-2.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700/60 transition-colors flex items-center gap-1"
          >
            <span>♿</span>
            <span className="hidden sm:inline">Accessible Summary</span>
          </button>

          {/* Delete (if teacher) */}
          {!isReadOnly && onDelete && (
            <button
              onClick={onDelete}
              title="Delete Visualization"
              className="p-1.5 px-2.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs border border-rose-800/60 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Accessible Summary Drawer */}
      {showA11y && document.accessibility && (
        <div className="rounded-lg bg-slate-900/90 border border-cyan-800/60 p-3 text-xs text-slate-300 flex flex-col gap-1.5 font-sans">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            <span>Accessibility Representation</span>
          </div>
          <p className="text-slate-200">{document.accessibility.summary}</p>
          {document.accessibility.transcriptOrTable && (
            <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-400 whitespace-pre-wrap">
              {document.accessibility.transcriptOrTable}
            </div>
          )}
        </div>
      )}

      {/* Main Interactive Renderer */}
      <div className="w-full overflow-auto">{renderContent()}</div>
    </div>
  );
};
