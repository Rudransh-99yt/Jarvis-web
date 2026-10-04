import React, { useRef, useState, useEffect, useCallback } from 'react';
import type {
  BoardDocument,
  BoardPage,
  BoardElement,
  BoardStrokePoint,
  BoardSemanticTag,
  BoardPageBackground,
  SemanticCandidate,
  BoardAIContext,
  BoundingBox
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
  HelpCircle,
  Maximize2,
  MousePointer,
  Cpu,
  Check,
  X,
  Eye,
  EyeOff,
  Brain,
  Share2
} from 'lucide-react';

interface SmartBoardCanvasProps {
  document: BoardDocument;
  onAutosave?: (updatedDoc: BoardDocument) => void;
  isReadOnly?: boolean;
}

type ActiveTool =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'text'
  | 'shape_rect'
  | 'shape_circle'
  | 'shape_triangle'
  | 'shape_line'
  | 'shape_arrow';

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

// Helper to compute bounding box for any element on the client
function getElementBox(elem: BoardElement): BoundingBox {
  if (elem.type === 'stroke' && elem.points && elem.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of elem.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = (elem.width || 4) / 2;
    return {
      minX: Math.max(0, minX - pad),
      minY: Math.max(0, minY - pad),
      maxX: maxX + pad,
      maxY: maxY + pad,
      width: Math.max(1, maxX - minX + pad * 2),
      height: Math.max(1, maxY - minY + pad * 2)
    };
  }

  if (elem.type === 'shape') {
    const x = elem.x ?? 0;
    const y = elem.y ?? 0;
    const w = elem.widthPx ?? (elem.endX !== undefined ? Math.abs(elem.endX - x) : 60);
    const h = elem.heightPx ?? (elem.endY !== undefined ? Math.abs(elem.endY - y) : 60);
    const minX = Math.min(x, elem.endX ?? x);
    const minY = Math.min(y, elem.endY ?? y);
    return {
      minX,
      minY,
      maxX: minX + w,
      maxY: minY + h,
      width: Math.max(1, w),
      height: Math.max(1, h)
    };
  }

  if (elem.type === 'text') {
    const x = elem.x ?? 0;
    const y = elem.y ?? 0;
    const len = elem.text?.length || 10;
    const fs = elem.fontSize || 20;
    const w = len * (fs * 0.6);
    const h = fs * 1.2;
    return {
      minX: x,
      minY: Math.max(0, y - h),
      maxX: x + w,
      maxY: y,
      width: w,
      height: h
    };
  }

  const x = elem.x ?? 0;
  const y = elem.y ?? 0;
  return { minX: x, minY: y, maxX: x + 80, maxY: y + 40, width: 80, height: 40 };
}

export const SmartBoardCanvas: React.FC<SmartBoardCanvasProps> = ({
  document: initialDoc,
  onAutosave,
  isReadOnly = false
}) => {
  // Ensure we always have at least one valid page
  const sanitizeDoc = (d: BoardDocument): BoardDocument => {
    if (!d.pages || d.pages.length === 0) {
      return {
        ...d,
        activePageIndex: 0,
        pages: [
          {
            pageId: `page-${d.id || 'board'}-1`,
            pageIndex: 0,
            title: 'Page 1 — Main Canvas',
            background: 'dark_grid',
            elements: [],
            semanticCandidates: [],
            spatialRelationships: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    }
    return d;
  };

  const [doc, setDoc] = useState<BoardDocument>(() => sanitizeDoc(initialDoc));
  const [activePageIndex, setActivePageIndex] = useState<number>(() => {
    const idx = initialDoc.activePageIndex ?? 0;
    return idx >= 0 && idx < (initialDoc.pages?.length || 1) ? idx : 0;
  });

  const [activeTool, setActiveTool] = useState<ActiveTool>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#00f2fe');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [activeSemanticTag, setActiveSemanticTag] = useState<BoardSemanticTag>('general_note');

  // D.9 Vision Board State
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activeCandidate, setActiveCandidate] = useState<SemanticCandidate | null>(null);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [showVisionOverlays, setShowVisionOverlays] = useState<boolean>(true);
  const [aiContextModal, setAiContextModal] = useState<BoardAIContext | null>(null);
  const [visionNotice, setVisionNotice] = useState<string | null>(null);

  // History stack for undo/redo
  const [history, setHistory] = useState<BoardPage[][]>(() => [JSON.parse(JSON.stringify(sanitizeDoc(initialDoc).pages))]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Autosave status state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<BoardStrokePoint[]>([]);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Text input inline state
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  const currentPage = doc.pages[activePageIndex] || doc.pages[0];

  // Sync doc from prop changes if version is strictly newer from external source
  useEffect(() => {
    if (initialDoc && initialDoc.version > doc.version) {
      const sanitized = sanitizeDoc(initialDoc);
      setDoc(sanitized);
      if (initialDoc.activePageIndex !== undefined && initialDoc.activePageIndex < sanitized.pages.length) {
        setActivePageIndex(initialDoc.activePageIndex);
      }
    }
  }, [initialDoc]);

  // Push to undo/redo history
  const pushHistory = (newPages: BoardPage[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newPages)));
    if (newHistory.length > 25) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Schedule background debounced network autosave
  const scheduleAutosave = useCallback(
    (updatedDoc: BoardDocument) => {
      if (isReadOnly) return;
      setSaveStatus('dirty');

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        if (onAutosave) {
          try {
            await onAutosave(updatedDoc);
            setSaveStatus('saved');
            setLastSavedTime(
              new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            );
          } catch {
            setSaveStatus('dirty');
          }
        } else {
          setSaveStatus('saved');
        }
      }, 1000);
    },
    [isReadOnly, onAutosave]
  );

  // Render canvas elements
  const redrawCanvas = useCallback((targetPage?: BoardPage) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pageToDraw = targetPage || currentPage;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!pageToDraw || !pageToDraw.elements) return;

    // 1. Render elements in zIndex order
    const sorted = [...pageToDraw.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

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
        } else {
          ctx.globalAlpha = elem.opacity ?? 1;
        }

        const pts = elem.points;
        if (pts.length === 1) {
          ctx.arc(pts[0].x, pts[0].y, (elem.width || 3) / 2, 0, Math.PI * 2);
          ctx.fillStyle = elem.color || '#00f2fe';
          ctx.fill();
        } else {
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();
        }
      } else if (elem.type === 'shape') {
        ctx.strokeStyle = elem.strokeColor || '#00f2fe';
        ctx.lineWidth = elem.width || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (elem.fillColor) {
          ctx.fillStyle = elem.fillColor;
        }

        const x = elem.x ?? 0;
        const y = elem.y ?? 0;
        const w = elem.widthPx ?? 100;
        const h = elem.heightPx ?? 100;

        if (elem.shapeType === 'rectangle') {
          if (elem.fillColor) ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
        } else if (elem.shapeType === 'circle') {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.max(1, Math.abs(w / 2)), 0, Math.PI * 2);
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
          ctx.fillText(`[${elem.semanticTag.toUpperCase()}]`, (elem.x || 50), (elem.y || 50) - (elem.fontSize || 20) - 4);
        }
      }
      ctx.restore();
    });

    // 2. Render Selection Bounding Box Overlays
    if (selectedElementIds.length > 0) {
      selectedElementIds.forEach((id) => {
        const target = pageToDraw.elements.find((e) => e.id === id);
        if (target) {
          const b = getElementBox(target);
          ctx.save();
          ctx.strokeStyle = '#00f2fe';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(b.minX - 4, b.minY - 4, b.width + 8, b.height + 8);

          // Corner tick marks
          ctx.setLineDash([]);
          ctx.fillStyle = '#00f2fe';
          const tick = 4;
          ctx.fillRect(b.minX - 4 - tick, b.minY - 4 - tick, tick * 2, tick * 2);
          ctx.fillRect(b.maxX + 4 - tick, b.minY - 4 - tick, tick * 2, tick * 2);
          ctx.fillRect(b.minX - 4 - tick, b.maxY + 4 - tick, tick * 2, tick * 2);
          ctx.fillRect(b.maxX + 4 - tick, b.maxY + 4 - tick, tick * 2, tick * 2);
          ctx.restore();
        }
      });
    }

    // 3. Render Accepted Vision Semantic Overlays (if enabled)
    if (showVisionOverlays && pageToDraw.semanticCandidates && pageToDraw.semanticCandidates.length > 0) {
      pageToDraw.semanticCandidates.forEach((cand) => {
        const b = cand.boundingBox;
        ctx.save();
        ctx.strokeStyle = cand.semanticType === 'EQUATION' ? '#a855f7' : cand.semanticType === 'DIAGRAM' ? '#38bdf8' : '#10b981';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(b.minX - 6, b.minY - 6, b.width + 12, b.height + 12);

        // Header Pill
        ctx.setLineDash([]);
        ctx.fillStyle = '#0f172a';
        const labelText = cand.equation
          ? `EQ: ${cand.equation.expression} (${Math.round(cand.confidence * 100)}%)`
          : cand.diagram
          ? `DIAGRAM: ${cand.diagram.diagramType.toUpperCase()}`
          : `TEXT: ${(cand.recognizedText || '').slice(0, 15)}`;

        ctx.font = '10px var(--font-mono, monospace)';
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(b.minX - 6, Math.max(0, b.minY - 22), textWidth + 12, 16);
        ctx.strokeStyle = cand.semanticType === 'EQUATION' ? '#a855f7' : '#38bdf8';
        ctx.strokeRect(b.minX - 6, Math.max(0, b.minY - 22), textWidth + 12, 16);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(labelText, b.minX, Math.max(12, b.minY - 10));
        ctx.restore();
      });
    }
  }, [currentPage, selectedElementIds, showVisionOverlays]);

  // Adjust canvas size & redraw on mount/resize with rAF
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let rafId: number | null = null;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const targetWidth = Math.max(Math.floor(rect.width), 300);
      const targetHeight = Math.max(Math.floor(rect.height), 300);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        redrawCanvas();
      }
    };

    resize();

    const resizeObserver = new ResizeObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        resize();
      });
    });

    resizeObserver.observe(parent);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [redrawCanvas]);

  // Redraw when currentPage or selection changes
  useEffect(() => {
    redrawCanvas();
  }, [currentPage, selectedElementIds, showVisionOverlays, redrawCanvas]);

  // Pointer position helper
  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    const pos = getCanvasPos(e);

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    // 1. Select Tool Handling
    if (activeTool === 'select') {
      const hitElement = currentPage.elements.slice().reverse().find((elem) => {
        const b = getElementBox(elem);
        return pos.x >= b.minX - 10 && pos.x <= b.maxX + 10 && pos.y >= b.minY - 10 && pos.y <= b.maxY + 10;
      });

      if (hitElement) {
        setSelectedElementIds((prev) =>
          prev.includes(hitElement.id) ? prev.filter((id) => id !== hitElement.id) : [...prev, hitElement.id]
        );
      } else {
        // Clicked background -> clear selection
        setSelectedElementIds([]);
        setActiveCandidate(null);
      }
      return;
    }

    if (activeTool === 'text') {
      setTextInputPos(pos);
      setTextInputValue('');
      return;
    }

    if (activeTool === 'eraser') {
      // Point / radius eraser
      const filtered = currentPage.elements.filter((elem) => {
        if (elem.type === 'stroke' && elem.points) {
          return !elem.points.some((p) => Math.hypot(p.x - pos.x, p.y - pos.y) < 28);
        }
        if (elem.x !== undefined && elem.y !== undefined) {
          return Math.hypot(elem.x - pos.x, elem.y - pos.y) >= 36;
        }
        return true;
      });

      if (filtered.length !== currentPage.elements.length) {
        const updatedPage: BoardPage = {
          ...currentPage,
          elements: filtered,
          updatedAt: new Date().toISOString()
        };
        const updatedPages = [...doc.pages];
        updatedPages[activePageIndex] = updatedPage;

        const updatedDoc: BoardDocument = {
          ...doc,
          pages: updatedPages,
          version: doc.version + 1,
          timestamps: {
            ...doc.timestamps,
            updatedAt: new Date().toISOString()
          }
        };

        setDoc(updatedDoc);
        pushHistory(updatedPages);
        scheduleAutosave(updatedDoc);
        redrawCanvas(updatedPage);
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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const w = pos.x - start.x;
      const h = pos.y - start.y;

      if (activeTool === 'shape_rect') {
        ctx.fillStyle = `${selectedColor}18`;
        ctx.fillRect(start.x, start.y, w, h);
        ctx.strokeRect(start.x, start.y, w, h);
      } else if (activeTool === 'shape_circle') {
        ctx.beginPath();
        ctx.arc(start.x + w / 2, start.y + h / 2, Math.max(1, Math.abs(w / 2)), 0, Math.PI * 2);
        ctx.fillStyle = `${selectedColor}18`;
        ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'shape_triangle') {
        ctx.beginPath();
        ctx.moveTo(start.x + w / 2, start.y);
        ctx.lineTo(start.x + w, start.y + h);
        ctx.lineTo(start.x, start.y + h);
        ctx.closePath();
        ctx.fillStyle = `${selectedColor}18`;
        ctx.fill();
        ctx.stroke();
      } else if (activeTool === 'shape_line' || activeTool === 'shape_arrow') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        if (activeTool === 'shape_arrow') {
          const angle = Math.atan2(pos.y - start.y, pos.x - start.x);
          const headLen = 14;
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isReadOnly) return;
    isDrawingRef.current = false;
    const pos = getCanvasPos(e);

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

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
        zIndex: (currentPage.elements?.length || 0) + 1,
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
        fillColor: `${selectedColor}18`,
        width: strokeWidth,
        semanticTag: activeSemanticTag,
        zIndex: (currentPage.elements?.length || 0) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    if (newElement) {
      const updatedElements = [...(currentPage.elements || []), newElement];
      const updatedPage: BoardPage = {
        ...currentPage,
        elements: updatedElements,
        updatedAt: new Date().toISOString()
      };
      const updatedPages = [...doc.pages];
      updatedPages[activePageIndex] = updatedPage;

      const updatedDoc: BoardDocument = {
        ...doc,
        pages: updatedPages,
        version: doc.version + 1,
        timestamps: {
          ...doc.timestamps,
          updatedAt: new Date().toISOString()
        }
      };

      setDoc(updatedDoc);
      pushHistory(updatedPages);
      scheduleAutosave(updatedDoc);
      redrawCanvas(updatedPage);
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
      id: `text-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'text',
      text: textInputValue.trim(),
      x: textInputPos.x,
      y: textInputPos.y,
      fontSize: 22,
      fontFamily: 'font-mono',
      color: selectedColor,
      semanticTag: activeSemanticTag,
      latexFormula: textInputValue.includes('\\') ? textInputValue.trim() : undefined,
      zIndex: (currentPage.elements?.length || 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedElements = [...(currentPage.elements || []), newElem];
    const updatedPage: BoardPage = {
      ...currentPage,
      elements: updatedElements,
      updatedAt: new Date().toISOString()
    };
    const updatedPages = [...doc.pages];
    updatedPages[activePageIndex] = updatedPage;

    const updatedDoc: BoardDocument = {
      ...doc,
      pages: updatedPages,
      version: doc.version + 1,
      timestamps: {
        ...doc.timestamps,
        updatedAt: new Date().toISOString()
      }
    };

    setDoc(updatedDoc);
    pushHistory(updatedPages);
    scheduleAutosave(updatedDoc);
    setTextInputPos(null);
    setTextInputValue('');
    redrawCanvas(updatedPage);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      const targetPages = history[newIdx];
      setHistoryIndex(newIdx);
      const updatedDoc: BoardDocument = {
        ...doc,
        pages: targetPages,
        version: doc.version + 1
      };
      setDoc(updatedDoc);
      scheduleAutosave(updatedDoc);
      redrawCanvas(targetPages[activePageIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      const targetPages = history[newIdx];
      setHistoryIndex(newIdx);
      const updatedDoc: BoardDocument = {
        ...doc,
        pages: targetPages,
        version: doc.version + 1
      };
      setDoc(updatedDoc);
      scheduleAutosave(updatedDoc);
      redrawCanvas(targetPages[activePageIndex]);
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
      semanticCandidates: [],
      spatialRelationships: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedPages = [...doc.pages, newPage];
    const newIndex = updatedPages.length - 1;
    const updatedDoc: BoardDocument = {
      ...doc,
      pages: updatedPages,
      activePageIndex: newIndex,
      version: doc.version + 1
    };

    setActivePageIndex(newIndex);
    setDoc(updatedDoc);
    pushHistory(updatedPages);
    scheduleAutosave(updatedDoc);
  };

  // Change background style
  const handleBackgroundChange = (bg: BoardPageBackground) => {
    const updatedPage: BoardPage = {
      ...currentPage,
      background: bg,
      updatedAt: new Date().toISOString()
    };
    const updatedPages = [...doc.pages];
    updatedPages[activePageIndex] = updatedPage;

    const updatedDoc: BoardDocument = {
      ...doc,
      pages: updatedPages,
      version: doc.version + 1
    };

    setDoc(updatedDoc);
    pushHistory(updatedPages);
    scheduleAutosave(updatedDoc);
  };

  // Clear current page elements
  const handleClearPage = () => {
    if (isReadOnly) return;
    const updatedPage: BoardPage = {
      ...currentPage,
      elements: [],
      semanticCandidates: [],
      updatedAt: new Date().toISOString()
    };
    const updatedPages = [...doc.pages];
    updatedPages[activePageIndex] = updatedPage;

    const updatedDoc: BoardDocument = {
      ...doc,
      pages: updatedPages,
      version: doc.version + 1
    };

    setDoc(updatedDoc);
    setSelectedElementIds([]);
    setActiveCandidate(null);
    pushHistory(updatedPages);
    scheduleAutosave(updatedDoc);
    redrawCanvas(updatedPage);
  };

  // D.9 Vision Board: Trigger recognition on selected elements
  const handleRecognizeSelection = async (type: 'equation' | 'diagram' | 'text') => {
    const selectedElements = currentPage.elements.filter((e) => selectedElementIds.includes(e.id));
    const targetElements = selectedElements.length > 0 ? selectedElements : currentPage.elements;

    if (targetElements.length === 0) {
      setVisionNotice('No canvas elements selected for vision recognition.');
      setTimeout(() => setVisionNotice(null), 3000);
      return;
    }

    setIsRecognizing(true);
    setVisionNotice(`Recognizing ${type}...`);

    try {
      const res = await fetch('/api/education/smartboard/vision/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: targetElements,
          type,
          options: {
            courseCode: doc.courseCode,
            topic: doc.title,
            lessonTitle: doc.lessonTitle
          }
        })
      });

      const data = await res.json();
      if (data.candidate) {
        setActiveCandidate(data.candidate);
        setVisionNotice(`Recognized candidate: ${data.candidate.equation?.expression || data.candidate.diagram?.diagramType || data.candidate.recognizedText || 'Complete'}`);
      }
    } catch (err) {
      console.warn('Vision recognition error:', err);
      setVisionNotice('Recognition fallback active.');
    } finally {
      setIsRecognizing(false);
      setTimeout(() => setVisionNotice(null), 4000);
    }
  };

  // Accept candidate and attach to page semantic metadata
  const handleAcceptCandidate = () => {
    if (!activeCandidate) return;

    const updatedCandidates = [...(currentPage.semanticCandidates || []), { ...activeCandidate, acceptedByTeacher: true }];
    const updatedPage: BoardPage = {
      ...currentPage,
      semanticCandidates: updatedCandidates,
      updatedAt: new Date().toISOString()
    };
    const updatedPages = [...doc.pages];
    updatedPages[activePageIndex] = updatedPage;

    const updatedDoc: BoardDocument = {
      ...doc,
      pages: updatedPages,
      version: doc.version + 1,
      timestamps: {
        ...doc.timestamps,
        updatedAt: new Date().toISOString()
      }
    };

    setDoc(updatedDoc);
    pushHistory(updatedPages);
    scheduleAutosave(updatedDoc);
    setActiveCandidate(null);
    setSelectedElementIds([]);
    redrawCanvas(updatedPage);
    setVisionNotice('Semantic candidate saved to board metadata.');
    setTimeout(() => setVisionNotice(null), 3000);
  };

  // Extract Bounded BoardAIContext
  const handleInspectAIContext = async () => {
    try {
      const res = await fetch('/api/education/smartboard/vision/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: currentPage,
          selectedElementIds,
          academicContext: {
            courseCode: doc.courseCode,
            courseName: doc.courseName,
            topic: doc.title,
            lessonTitle: doc.lessonTitle
          },
          classSessionId: doc.classSessionId
        })
      });
      const data = await res.json();
      if (data.aiContext) {
        setAiContextModal(data.aiContext);
      }
    } catch {
      setVisionNotice('Could not extract AI context.');
    }
  };

  const getBackgroundClass = (bg?: BoardPageBackground) => {
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
    <div className="flex flex-col h-full w-full select-none overflow-hidden bg-black relative">
      {/* 1. Top Surface Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-cyan-500/20 bg-slate-950/95 backdrop-blur-md z-20 shrink-0">
        {/* Left: Document Info & Page Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              {doc.courseCode || 'PHYS-301'}
            </span>
            <span className="text-white font-bold max-w-[200px] sm:max-w-xs truncate">{doc.title}</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Page Carousel Buttons */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => {
                const nextIdx = Math.max(0, activePageIndex - 1);
                setActivePageIndex(nextIdx);
                setSelectedElementIds([]);
                setActiveCandidate(null);
              }}
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
              onClick={() => {
                const nextIdx = Math.min(doc.pages.length - 1, activePageIndex + 1);
                setActivePageIndex(nextIdx);
                setSelectedElementIds([]);
                setActiveCandidate(null);
              }}
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

          {/* Background switcher */}
          {!isReadOnly && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => handleBackgroundChange('dark_grid')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  currentPage.background === 'dark_grid' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Dark Grid"
              >
                Grid
              </button>
              <button
                onClick={() => handleBackgroundChange('lined')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  currentPage.background === 'lined' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Ruled Lines"
              >
                Lines
              </button>
              <button
                onClick={() => handleBackgroundChange('dark')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer ${
                  currentPage.background === 'dark' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title="Pure Dark"
              >
                Blank
              </button>
            </div>
          )}
        </div>

        {/* Right: Vision Toggle & Autosave */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {/* Vision Overlays Toggle */}
          <button
            onClick={() => setShowVisionOverlays((s) => !s)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              showVisionOverlays
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white'
            }`}
            title="Toggle Vision Object Metadata Overlays"
          >
            {showVisionOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Vision HUD</span>
          </button>

          {/* AI Context Inspector Button */}
          <button
            onClick={handleInspectAIContext}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
            title="Inspect Bounded BoardAIContext"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">AI Context</span>
          </button>

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
                <span>Autosaved</span>
              </span>
            ) : (
              <span className="text-slate-400">Buffered</span>
            )}
          </div>
        </div>
      </div>

      {/* Vision Notification Strip */}
      {visionNotice && (
        <div className="bg-cyan-500/90 text-black font-mono text-xs px-4 py-1 text-center font-bold animate-pulse z-30 shrink-0">
          {visionNotice}
        </div>
      )}

      {/* 2. Main Teaching Canvas Area */}
      <div className={`flex-1 relative overflow-hidden ${getBackgroundClass(currentPage.background)}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
          className={`w-full h-full block select-none ${
            isReadOnly ? 'cursor-default' : activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'
          }`}
        />

        {/* Floating Vision AI Action Toolbar for Selected Elements */}
        {selectedElementIds.length > 0 && !isReadOnly && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/95 border border-cyan-500/50 shadow-2xl backdrop-blur-xl">
            <span className="text-[11px] font-mono font-bold text-cyan-300 pl-2">
              {selectedElementIds.length} Selected:
            </span>
            <button
              onClick={() => handleRecognizeSelection('equation')}
              disabled={isRecognizing}
              className="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Recognize Equation</span>
            </button>
            <button
              onClick={() => handleRecognizeSelection('diagram')}
              disabled={isRecognizing}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Recognize Diagram</span>
            </button>
            <button
              onClick={() => handleRecognizeSelection('text')}
              disabled={isRecognizing}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Transcribe Text</span>
            </button>
            <button
              onClick={() => {
                setSelectedElementIds([]);
                setActiveCandidate(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              title="Deselect"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Recognized Semantic Candidate Inspector Card */}
        {activeCandidate && !isReadOnly && (
          <div className="absolute top-16 right-4 z-40 w-80 sm:w-96 rounded-3xl bg-slate-950/95 border border-cyan-500/50 p-4 shadow-2xl backdrop-blur-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white uppercase">{activeCandidate.semanticType} Candidate</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  activeCandidate.source === 'AI_RECOGNIZED'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {activeCandidate.source} ({Math.round(activeCandidate.confidence * 100)}%)
              </span>
            </div>

            {/* Candidate Content */}
            {activeCandidate.equation && (
              <div className="space-y-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[11px]">Normalized Expression:</div>
                <div className="text-base font-bold text-cyan-300">{activeCandidate.equation.expression}</div>
                {activeCandidate.equation.latex && (
                  <div className="text-slate-400 text-[11px] font-sans">
                    LaTeX: <span className="font-mono text-purple-300">{activeCandidate.equation.latex}</span>
                  </div>
                )}
                {activeCandidate.equation.variables.length > 0 && (
                  <div className="text-[11px] text-slate-400">
                    Variables: <span className="text-emerald-300">{activeCandidate.equation.variables.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {activeCandidate.diagram && (
              <div className="space-y-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Type:</span>
                  <span className="text-cyan-300 font-bold uppercase">{activeCandidate.diagram.diagramType}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Nodes: <span className="text-white font-bold">{activeCandidate.diagram.nodes.length}</span> · Edges: <span className="text-white font-bold">{activeCandidate.diagram.edges.length}</span>
                </div>
              </div>
            )}

            {activeCandidate.recognizedText && (
              <div className="space-y-1 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-slate-200">
                <div className="text-slate-400 text-[10px]">Transcribed Content:</div>
                <p className="text-xs font-sans">{activeCandidate.recognizedText}</p>
              </div>
            )}

            {/* Acceptance actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleAcceptCandidate}
                className="flex-1 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Annotation</span>
              </button>
              <button
                onClick={() => setActiveCandidate(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            <p className="text-[10px] text-slate-500 font-sans">
              * Original handwritten chalkboard strokes remain 100% visible and uncorrupted.
            </p>
          </div>
        )}

        {/* Inline Text Input Overlay */}
        {textInputPos && !isReadOnly && (
          <div
            className="absolute z-30 flex items-center gap-2 p-2 rounded-xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md"
            style={{ left: Math.min(textInputPos.x, 600), top: Math.min(textInputPos.y, 400) }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Write formula or text (e.g. \lambda = q/L)..."
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
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl max-w-[95vw]">
          {/* Main Drawing & Pointer Tools */}
          <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'select'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Select & Inspect Objects"
            >
              <MousePointer className="w-5 h-5" />
            </button>
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
          <div className="hidden sm:flex items-center gap-1 border-r border-slate-800 pr-2">
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
              onClick={() => setActiveTool('shape_line')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeTool === 'shape_line' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
              title="Straight Line"
            >
              <Minus className="w-4 h-4" />
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
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  selectedColor === c ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Stroke Width Selector */}
          <div className="hidden sm:flex items-center gap-1 border-r border-slate-800 pr-2">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-mono text-xs cursor-pointer ${
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

      {/* 4. BoardAIContext Modal Dialog */}
      {aiContextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
          <div className="w-full max-w-2xl rounded-3xl border border-cyan-500/40 bg-slate-950 p-6 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Bounded BoardAIContext</h3>
              </div>
              <button
                onClick={() => setAiContextModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-sans">
              This bounded representation encapsulates only authorized chalkboard elements, equations, and spatial relationships without token bloat.
            </p>

            <div className="space-y-2 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 max-h-72 overflow-y-auto">
              <div className="text-cyan-300 font-bold">Semantic Summary:</div>
              <p className="text-slate-200 font-sans">{aiContextModal.semanticSummary}</p>

              {aiContextModal.recognizedEquations.length > 0 && (
                <div className="pt-2">
                  <span className="text-purple-400 font-bold">Equations:</span>
                  <ul className="list-disc pl-4 text-slate-300">
                    {aiContextModal.recognizedEquations.map((eq) => (
                      <li key={eq.id}>
                        {eq.expression} (LaTeX: <code className="text-cyan-300">{eq.latex}</code>) [Confidence: {Math.round(eq.confidence * 100)}%]
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiContextModal.spatialRelations.length > 0 && (
                <div className="pt-2">
                  <span className="text-amber-400 font-bold">Spatial Graph ({aiContextModal.spatialRelations.length} relations):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {aiContextModal.spatialRelations.slice(0, 8).map((rel, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-black/60 border border-slate-800 text-[10px] text-slate-300">
                        <span className="text-cyan-400 font-bold">{rel.relation}</span> ({rel.sourceId.slice(0, 8)} → {rel.targetId.slice(0, 8)})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setAiContextModal(null)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold cursor-pointer"
              >
                Close Context
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
