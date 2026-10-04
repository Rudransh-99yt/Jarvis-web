import React, { useRef, useState, useEffect, useCallback } from 'react';
import type {
  BoardDocument,
  BoardPage,
  BoardElement,
  BoardElementType,
  BoardStrokePoint,
  BoardSemanticTag,
  BoardPageBackground
} from '../../../types/smartboard.ts';
import {
  Pen,
  Highlighter,
  Eraser,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowUpRight,
  Undo,
  Redo,
  Trash2,
  Tag,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Grid,
  FileText,
  Save,
  Layers,
  HelpCircle
} from 'lucide-react';

interface SmartBoardCanvasProps {
  document: BoardDocument;
  onAutosave?: (updatedDoc: BoardDocument) => void;
  isReadOnly?: boolean;
}

type ActiveTool = 'pen' | 'highlighter' | 'eraser' | 'text' | 'shape_rect' | 'shape_circle' | 'shape_triangle' | 'shape_line' | 'shape_arrow';

const COLOR_PALETTE = [
  '#00f2fe', // Cyan
  '#38bdf8', // Light Blue
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#ffffff', // White
  '#94a3b8'  // Slate
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export const SmartBoardCanvas: React.FC<SmartBoardCanvasProps> = ({
  document: initialDoc,
  onAutosave,
  isReadOnly = false
}) => {
  const [doc, setDoc] = useState<BoardDocument>(initialDoc);
  const [activePageIndex, setActivePageIndex] = useState<number>(initialDoc.activePageIndex || 0);
  const [activeTool, setActiveTool] = useState<ActiveTool>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#00f2fe');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [activeSemanticTag, setActiveSemanticTag] = useState<BoardSemanticTag | undefined>('general_note');
  
  // History stack for undo/redo
  const [history, setHistory] = useState<BoardPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Autosave status state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<BoardStrokePoint[]>([]);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Text input modal/inline state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  const currentPage = doc.pages[activePageIndex] || doc.pages[0];

  // Sync doc from prop changes if version is newer
  useEffect(() => {
    if (initialDoc.version > doc.version) {
      setDoc(initialDoc);
      if (initialDoc.activePageIndex !== undefined) {
        setActivePageIndex(initialDoc.activePageIndex);
      }
    }
  }, [initialDoc]);

  // Trigger autosave debounced
  const scheduleAutosave = useCallback(
    (updatedPages: BoardPage[], newPageIndex?: number) => {
      if (isReadOnly) return;
      setSaveStatus('dirty');

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        const updatedDoc: BoardDocument = {
          ...doc,
          pages: updatedPages,
          activePageIndex: newPageIndex ?? activePageIndex,
          version: doc.version + 1,
          timestamps: {
            ...doc.timestamps,
            updatedAt: new Date().toISOString(),
            lastAutosavedAt: new Date().toISOString()
          }
        };
        setDoc(updatedDoc);
        if (onAutosave) {
          try {
            await onAutosave(updatedDoc);
            setSaveStatus('saved');
            setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          } catch {
            setSaveStatus('dirty');
          }
        } else {
          setSaveStatus('saved');
        }
      }, 1200);
    },
    [doc, activePageIndex, isReadOnly, onAutosave]
  );

  // Push to history
  const pushHistory = (newPages: BoardPage[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPages)));
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Render canvas elements
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentPage) return;

    // Render elements in zIndex order
    const sorted = [...currentPage.elements].sort((a, b) => a.zIndex - b.zIndex);

    sorted.forEach((elem) => {
      ctx.save();
      if (elem.type === 'stroke' && elem.points && elem.points.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = elem.color || '#00f2fe';
        ctx.lineWidth = elem.width || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (elem.tool === 'highlighter') {
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = (elem.width || 4) * 3;
        }

        const pts = elem.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      } else if (elem.type === 'shape') {
        ctx.strokeStyle = elem.strokeColor || '#00f2fe';
        ctx.lineWidth = elem.width || 3;
        if (elem.fillColor) {
          ctx.fillStyle = elem.fillColor;
        }

        const x = elem.x || 0;
        const y = elem.y || 0;
        const w = elem.widthPx || 100;
        const h = elem.heightPx || 100;

        if (elem.shapeType === 'rectangle') {
          if (elem.fillColor) ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
        } else if (elem.shapeType === 'circle') {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.abs(w / 2), 0, Math.PI * 2);
          if (elem.fillColor) ctx.fill();
          ctx.stroke();
        } else if (elem.shapeType === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h);
          ctx.lineTo(x, y + h);
          ctx.closePath();
          if (elem.fillColor) ctx.fill();
          ctx.stroke();
        } else if (elem.shapeType === 'line' || elem.shapeType === 'arrow') {
          const endX = elem.endX ?? x + w;
          const endY = elem.endY ?? y + h;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          if (elem.shapeType === 'arrow') {
            const angle = Math.atan2(endY - y, endX - x);
            const headLen = 14;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
        }

        if (elem.label) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px var(--font-mono, monospace)';
          ctx.fillText(elem.label, x + 5, y + h + 16);
        }
      } else if (elem.type === 'text' && elem.text) {
        ctx.fillStyle = elem.color || '#38bdf8';
        ctx.font = `${elem.fontSize || 20}px var(--font-mono, monospace)`;
        ctx.fillText(elem.text, elem.x || 50, elem.y || 50);

        if (elem.semanticTag && elem.semanticTag !== 'general_note') {
          ctx.fillStyle = '#64748b';
          ctx.font = '10px var(--font-mono, monospace)';
          ctx.fillText(`[${elem.semanticTag.toUpperCase()}]`, (elem.x || 50), (elem.y || 50) - (elem.fontSize || 20) - 2);
        }
      }
      ctx.restore();
    });
  }, [currentPage]);

  // Adjust canvas size & redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = parent.clientWidth || 1200;
      canvas.height = Math.max(parent.clientHeight || 700, 600);
      redrawCanvas();
    });

    resizeObserver.observe(parent);
    canvas.width = parent.clientWidth || 1200;
    canvas.height = Math.max(parent.clientHeight || 700, 600);
    redrawCanvas();

    return () => resizeObserver.disconnect();
  }, [redrawCanvas]);

  // Pointer event handlers for drawing
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    const pos = getCanvasPos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (activeTool === 'text') {
      setTextInputPos(pos);
      setTextInputValue('');
      return;
    }

    if (activeTool === 'eraser') {
      // Point / radius eraser: remove elements within 24px of touch
      const filtered = currentPage.elements.filter((elem) => {
        if (elem.type === 'stroke' && elem.points) {
          return !elem.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 24);
        }
        if (elem.x !== undefined && elem.y !== undefined) {
          return Math.hypot(elem.x - pos.x, elem.y - pos.y) >= 32;
        }
        return true;
      });

      if (filtered.length !== currentPage.elements.length) {
        const updatedPages = [...doc.pages];
        updatedPages[activePageIndex] = { ...currentPage, elements: filtered, updatedAt: new Date().toISOString() };
        pushHistory(updatedPages);
        scheduleAutosave(updatedPages);
        redrawCanvas();
      }
      return;
    }

    isDrawingRef.current = true;
    startPosRef.current = pos;
    currentPointsRef.current = [pos];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isReadOnly) return;
    const pos = getCanvasPos(e);
    currentPointsRef.current.push(pos);

    // Live preview on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = activeTool === 'highlighter' ? strokeWidth * 3 : strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (activeTool === 'highlighter') ctx.globalAlpha = 0.35;

      const pts = currentPointsRef.current;
      if (pts.length > 1) {
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
      ctx.restore();
    } else if (activeTool.startsWith('shape_') && startPosRef.current) {
      redrawCanvas();
      const start = startPosRef.current;
      ctx.save();
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;

      const w = pos.x - start.x;
      const h = pos.y - start.y;

      if (activeTool === 'shape_rect') {
        ctx.strokeRect(start.x, start.y, w, h);
      } else if (activeTool === 'shape_circle') {
        ctx.beginPath();
        ctx.arc(start.x + w / 2, start.y + h / 2, Math.abs(w / 2), 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === 'shape_triangle') {
        ctx.beginPath();
        ctx.moveTo(start.x + w / 2, start.y);
        ctx.lineTo(start.x + w, start.y + h);
        ctx.lineTo(start.x, start.y + h);
        ctx.closePath();
        ctx.stroke();
      } else if (activeTool === 'shape_line' || activeTool === 'shape_arrow') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isReadOnly) return;
    isDrawingRef.current = false;
    const pos = getCanvasPos(e);

    const newElementId = `elem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    let newElement: BoardElement | null = null;

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      newElement = {
        id: newElementId,
        type: 'stroke',
        tool: activeTool,
        points: [...currentPointsRef.current],
        color: selectedColor,
        width: strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.35 : 1,
        semanticTag: activeSemanticTag,
        zIndex: currentPage.elements.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (activeTool.startsWith('shape_') && startPosRef.current) {
      const start = startPosRef.current;
      const w = pos.x - start.x;
      const h = pos.y - start.y;
      let shapeType: 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' = 'rectangle';
      if (activeTool === 'shape_circle') shapeType = 'circle';
      else if (activeTool === 'shape_triangle') shapeType = 'triangle';
      else if (activeTool === 'shape_line') shapeType = 'line';
      else if (activeTool === 'shape_arrow') shapeType = 'arrow';

      newElement = {
        id: newElementId,
        type: 'shape',
        shapeType,
        x: Math.min(start.x, pos.x),
        y: Math.min(start.y, pos.y),
        widthPx: Math.abs(w),
        heightPx: Math.abs(h),
        endX: pos.x,
        endY: pos.y,
        strokeColor: selectedColor,
        fillColor: `${selectedColor}15`,
        width: strokeWidth,
        semanticTag: activeSemanticTag,
        zIndex: currentPage.elements.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    if (newElement) {
      const updatedElements = [...currentPage.elements, newElement];
      const updatedPages = [...doc.pages];
      updatedPages[activePageIndex] = {
        ...currentPage,
        elements: updatedElements,
        updatedAt: new Date().toISOString()
      };

      pushHistory(updatedPages);
      scheduleAutosave(updatedPages);
      redrawCanvas();
    }

    currentPointsRef.current = [];
    startPosRef.current = null;
  };

  // Submit inline text input
  const handleAddText = () => {
    if (!textInputPos || !textInputValue.trim() || isReadOnly) {
      setTextInputPos(null);
      return;
    }

    const newElem: BoardElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: textInputValue.trim(),
      x: textInputPos.x,
      y: textInputPos.y,
      fontSize: 22,
      fontFamily: 'font-mono',
      color: selectedColor,
      semanticTag: activeSemanticTag,
      latexFormula: textInputValue.includes('\\') ? textInputValue.trim() : undefined,
      zIndex: currentPage.elements.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedElements = [...currentPage.elements, newElem];
    const updatedPages = [...doc.pages];
    updatedPages[activePageIndex] = {
      ...currentPage,
      elements: updatedElements,
      updatedAt: new Date().toISOString()
    };

    pushHistory(updatedPages);
    scheduleAutosave(updatedPages);
    setTextInputPos(null);
    setTextInputValue('');
    redrawCanvas();
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const targetPages = history[newIdx];
      setHistoryIndex(newIdx);
      setDoc((prev) => ({ ...prev, pages: targetPages }));
      scheduleAutosave(targetPages);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      const targetPages = history[newIdx];
      setHistoryIndex(newIdx);
      setDoc((prev) => ({ ...prev, pages: targetPages }));
      scheduleAutosave(targetPages);
    }
  };

  // Add new board page
  const handleAddPage = () => {
    const newPage: BoardPage = {
      pageId: `page-${doc.id}-${doc.pages.length + 1}`,
      pageIndex: doc.pages.length,
      title: `Page ${doc.pages.length + 1}`,
      background: 'dark_grid',
      elements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedPages = [...doc.pages, newPage];
    const newIndex = updatedPages.length - 1;
    setActivePageIndex(newIndex);
    pushHistory(updatedPages);
    scheduleAutosave(updatedPages, newIndex);
  };

  // Change background style
  const handleBackgroundChange = (bg: BoardPageBackground) => {
    const updatedPages = [...doc.pages];
    updatedPages[activePageIndex] = {
      ...currentPage,
      background: bg,
      updatedAt: new Date().toISOString()
    };
    pushHistory(updatedPages);
    scheduleAutosave(updatedPages);
  };

  // Clear current page elements
  const handleClearPage = () => {
    if (isReadOnly) return;
    const updatedPages = [...doc.pages];
    updatedPages[activePageIndex] = {
      ...currentPage,
      elements: [],
      updatedAt: new Date().toISOString()
    };
    pushHistory(updatedPages);
    scheduleAutosave(updatedPages);
    redrawCanvas();
  };

  const getBackgroundClass = (bg: BoardPageBackground) => {
    switch (bg) {
      case 'dark_grid':
        return 'bg-slate-950 hud-grid-bg text-cyan-100';
      case 'grid':
        return 'bg-slate-900 hud-grid-dense text-cyan-100';
      case 'lined':
        return 'bg-slate-950 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] text-cyan-100';
      case 'dark':
        return 'bg-black text-white';
      default:
        return 'bg-slate-950 text-cyan-100';
    }
  };

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-black/90 relative">
      {/* 1. Top Surface Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-cyan-500/20 bg-slate-950/90 backdrop-blur-md z-20 shrink-0">
        {/* Left: Document Info & Page Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              {doc.courseCode}
            </span>
            <span className="text-white font-bold max-w-[200px] sm:max-w-xs truncate">{doc.title}</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Page Carousel Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
              disabled={activePageIndex === 0}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-bold text-cyan-400 min-w-[50px] text-center">
              {activePageIndex + 1} / {doc.pages.length}
            </span>
            <button
              onClick={() => setActivePageIndex((p) => Math.min(doc.pages.length - 1, p + 1))}
              disabled={activePageIndex === doc.pages.length - 1}
              className="p-1 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isReadOnly && (
              <button
                onClick={handleAddPage}
                className="p-1 ml-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 cursor-pointer"
                title="Add New Board Page"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Autosave & Semantic Tag Selection */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {!isReadOnly && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[11px]">AI Tag:</span>
              <select
                value={activeSemanticTag}
                onChange={(e) => setActiveSemanticTag(e.target.value as BoardSemanticTag)}
                className="bg-transparent text-cyan-300 font-mono text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="formula" className="bg-slate-900">Formula / Equation</option>
                <option value="worked_solution" className="bg-slate-900">Worked Solution</option>
                <option value="diagram_label" className="bg-slate-900">Diagram / Geometry</option>
                <option value="key_concept" className="bg-slate-900">Key Concept</option>
                <option value="misconception_correction" className="bg-slate-900">Misconception Note</option>
                <option value="general_note" className="bg-slate-900">General Note</option>
              </select>
            </div>
          )}

          {/* Autosave Status Pill */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {saveStatus === 'saving' ? (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Autosaving...</span>
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Autosaved ({lastSavedTime})</span>
              </span>
            ) : (
              <span className="text-slate-400">Buffered</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Teaching Canvas Area */}
      <div className={`flex-1 relative overflow-hidden ${getBackgroundClass(currentPage.background)}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`w-full h-full touch-none ${isReadOnly ? 'cursor-default' : 'cursor-crosshair'}`}
        />

        {/* Inline Text Input Overlay */}
        {textInputPos && !isReadOnly && (
          <div
            className="absolute z-30 flex items-center gap-2 p-2 rounded-xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md"
            style={{ left: Math.min(textInputPos.x, 800), top: Math.min(textInputPos.y, 500) }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Write formula or text (LaTeX supported)..."
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddText();
                if (e.key === 'Escape') setTextInputPos(null);
              }}
              className="px-3 py-1.5 rounded bg-black/80 border border-slate-700 text-white font-mono text-sm w-72 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleAddText}
              className="px-3 py-1.5 rounded bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 cursor-pointer"
            >
              Add
            </button>
            <button
              onClick={() => setTextInputPos(null)}
              className="px-2 py-1.5 rounded text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 3. Bottom Floating Teacher Toolbar (Hidden if Read-Only) */}
      {!isReadOnly && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl">
          {/* Main Drawing Tools */}
          <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
            <button
              onClick={() => setActiveTool('pen')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'pen'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Smooth Pen"
            >
              <Pen className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('highlighter')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'highlighter'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Highlighter"
            >
              <Highlighter className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'eraser'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'text'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Text / Formula"
            >
              <Type className="w-5 h-5" />
            </button>
          </div>

          {/* Geometric Shapes */}
          <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
            <button
              onClick={() => setActiveTool('shape_rect')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'shape_rect' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Rectangle"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('shape_circle')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'shape_circle' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Circle"
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('shape_triangle')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'shape_triangle' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Triangle"
            >
              <Triangle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('shape_arrow')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'shape_arrow' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Vector Arrow"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  selectedColor === c ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs cursor-pointer ${
                  strokeWidth === w ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-500 hover:text-white'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Undo, Redo, Clear */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearPage}
              className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              title="Clear Canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
