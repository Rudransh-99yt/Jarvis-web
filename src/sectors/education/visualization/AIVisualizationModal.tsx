// AI Visualization Creation & Preview Modal (Phase D.10)
import React, { useState } from 'react';
import type { VisualizationDocument } from '../../../types/visualization.ts';
import type { EquationObject } from '../../../types/smartboard.ts';
import { VisualizationHost } from './VisualizationHost.tsx';
import { getAuthHeaders } from '../../../services/authClient.ts';

interface AIVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (doc: VisualizationDocument) => void;
  equationCandidate?: EquationObject | null;
  courseCode?: string;
  topic?: string;
  classSessionId?: string;
  isTeacher?: boolean;
}

export const AIVisualizationModal: React.FC<AIVisualizationModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  equationCandidate,
  courseCode = 'MATH-201',
  topic = 'Classroom Topic',
  classSessionId,
  isTeacher = true
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('GRAPH');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VisualizationDocument | null>(null);
  const [confirmedLowConfidence, setConfirmedLowConfidence] = useState<boolean>(false);

  if (!isOpen) return null;

  // Preset templates
  const presets = [
    { label: 'Quadratic Parabola', prompt: 'Plot quadratic function y = x^2 - 4' },
    { label: 'Sine Wave', prompt: 'Plot trigonometric function y = sin(x)' },
    { label: 'Projectile Motion', prompt: 'Simulate projectile motion at 25 m/s at 45 degree angle' },
    { label: 'Water Molecule (H₂O)', prompt: 'Show water molecule H2O chemical structure' },
    { label: 'DC Series Circuit', prompt: 'Create DC circuit schematic with 9V battery, 220 ohm resistor and LED' },
    { label: 'Kinetic Data Chart', prompt: 'Show data chart comparing measured vs theoretical velocity' }
  ];

  // Generate preview from prompt
  const handleGenerate = async (promptText: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);

    try {
      const res = await fetch('/api/education/visualizations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          prompt: promptText,
          courseCode,
          topic,
          classSessionId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to generate visualization.');
      }

      setPreviewDoc(data.visualization);
    } catch (err: any) {
      setErrorMsg(err.message || 'Generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert handwriting equation candidate to graph
  const handleConvertEquation = async () => {
    if (!equationCandidate) return;
    setIsLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);

    try {
      const res = await fetch('/api/education/visualizations/from-equation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          candidate: equationCandidate,
          confirmLowConfidence: confirmedLowConfidence,
          courseCode,
          topic
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to convert equation.');
      }

      setPreviewDoc(data.visualization);
      if (data.needsConfirmation) {
        setWarningMsg(data.warning || 'Low confidence recognition: please verify formula before approving.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Equation conversion failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-bold text-sm">
              AI
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                JARVIS Visualization Engine (D.10)
              </h2>
              <p className="text-xs text-slate-400">
                Generate structured, interactive visual objects from intent or board handwriting.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-lg font-bold"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Section 1: Handwriting Equation Candidate Bridge (if present) */}
          {equationCandidate && (
            <div className="rounded-xl bg-slate-950/80 border border-purple-500/40 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Detected Board Equation</span>
                  <span className="font-mono text-purple-400">({Math.round((equationCandidate.confidence || 1) * 100)}% Confidence)</span>
                </span>
                <button
                  onClick={handleConvertEquation}
                  disabled={isLoading}
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                >
                  Convert Equation to Graph
                </button>
              </div>

              <div className="text-lg font-mono text-cyan-300 font-bold">
                {equationCandidate.expression}
              </div>

              {equationCandidate.confidence < 0.85 && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="chk-confirm"
                    checked={confirmedLowConfidence}
                    onChange={(e) => setConfirmedLowConfidence(e.target.checked)}
                    className="accent-purple-500"
                  />
                  <label htmlFor="chk-confirm" className="text-xs text-amber-300 font-medium cursor-pointer">
                    I confirm this equation expression is mathematically correct.
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Natural Language Prompt Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Describe what you want to visualize:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && prompt.trim()) {
                    handleGenerate(prompt);
                  }
                }}
                placeholder="e.g. Plot y = sin(x) or Simulate projectile motion at 25 m/s at 45 degrees..."
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => handleGenerate(prompt)}
                disabled={isLoading || !prompt.trim()}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm transition-all shadow-lg"
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500 font-semibold uppercase">Presets:</span>
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(preset.prompt);
                  handleGenerate(preset.prompt);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700/60"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Low Confidence Warning Message */}
          {warningMsg && (
            <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-300 text-xs flex items-center justify-between">
              <span>{warningMsg}</span>
              <button
                onClick={() => {
                  setConfirmedLowConfidence(true);
                  setWarningMsg(null);
                }}
                className="px-2.5 py-1 rounded bg-amber-600 text-black font-bold text-[11px] ml-3"
              >
                Confirm Formula
              </button>
            </div>
          )}

          {/* Preview Section */}
          {previewDoc && (
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Interactive Preview (Review before inserting)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onInsert(previewDoc);
                      onClose();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>✓</span>
                    <span>Approve & Insert onto Board</span>
                  </button>
                </div>
              </div>

              <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2">
                <VisualizationHost document={previewDoc} width={700} height={360} isReadOnly={false} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-500">
          <div>Course: {courseCode} • Topic: {topic}</div>
          <button onClick={onClose} className="hover:text-slate-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
