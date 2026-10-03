import React, { useState, useEffect, useRef } from 'react';
import type { PageBlock, BlockType, WorkspacePage, AcademicAssociation } from '../../../types/workspace.ts';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  CheckSquare,
  Square,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlertCircle,
  Code,
  Sigma,
  Table as TableIcon,
  Link as LinkIcon,
  FileText,
  Radio,
  Video,
  BookOpen,
  ArrowRight,
  Smile,
  Check,
  Tag,
  Clock,
  Save,
  ExternalLink
} from 'lucide-react';

interface BlockEditorProps {
  page: WorkspacePage;
  onUpdatePageTitle: (title: string) => void;
  onUpdatePageIcon: (icon: string) => void;
  onUpdateBlocks: (blocks: PageBlock[]) => void;
  onNavigateToAcademicLink?: (link: AcademicAssociation) => void;
  onOpenPage?: (pageId: string) => void;
  allPages?: WorkspacePage[];
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  page,
  onUpdatePageTitle,
  onUpdatePageIcon,
  onUpdateBlocks,
  onNavigateToAcademicLink,
  onOpenPage,
  allPages = []
}) => {
  const [blocks, setBlocks] = useState<PageBlock[]>(page.blocks || []);
  const [title, setTitle] = useState<string>(page.title || '');
  const [icon, setIcon] = useState<string>(page.icon || '📄');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [slashMenuIndex, setSlashMenuIndex] = useState<number | null>(null);
  const [slashFilter, setSlashFilter] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [editingMathId, setEditingMathId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<any>(null);

  // Sync state when active page changes
  useEffect(() => {
    setBlocks(page.blocks || []);
    setTitle(page.title || '');
    setIcon(page.icon || '📄');
    setSlashMenuIndex(null);
  }, [page.id]);

  // Debounced auto-save handler
  const triggerAutoSave = (newBlocks: PageBlock[], newTitle?: string) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      onUpdateBlocks(newBlocks);
      if (newTitle !== undefined && newTitle !== page.title) {
        onUpdatePageTitle(newTitle);
      }
      setSaveStatus('saved');
    }, 600);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutoSave(blocks, newTitle);
  };

  const handleIconChange = (newIcon: string) => {
    setIcon(newIcon);
    onUpdatePageIcon(newIcon);
    setShowEmojiPicker(false);
  };

  // Block Content Update
  const handleBlockContentChange = (index: number, content: string) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], content };
    setBlocks(updated);

    // Check for slash command invocation
    if (content.endsWith('/')) {
      setSlashMenuIndex(index);
      setSlashFilter('');
    } else if (slashMenuIndex === index) {
      if (content.includes('/')) {
        const query = content.split('/').pop() || '';
        setSlashFilter(query);
      } else {
        setSlashMenuIndex(null);
      }
    }

    triggerAutoSave(updated);
  };

  // Convert Block Type
  const handleConvertBlockType = (index: number, newType: BlockType) => {
    const updated = [...blocks];
    const currentBlock = updated[index];
    let cleanedContent = currentBlock.content.replace(/\/[a-z0-9]*$/i, '').trim();

    let properties: any = currentBlock.properties || {};

    if (newType === 'checklist') {
      properties.checked = false;
    } else if (newType === 'callout') {
      properties.calloutType = 'info';
      properties.calloutIcon = '💡';
    } else if (newType === 'code_block') {
      properties.language = 'typescript';
    } else if (newType === 'table') {
      properties.tableData = {
        headers: ['Column 1', 'Column 2', 'Column 3'],
        rows: [
          ['Value A1', 'Value B1', 'Value C1'],
          ['Value A2', 'Value B2', 'Value C2']
        ]
      };
    }

    updated[index] = {
      ...currentBlock,
      type: newType,
      content: cleanedContent,
      properties
    };

    setBlocks(updated);
    setSlashMenuIndex(null);
    triggerAutoSave(updated);
  };

  // Add Block Below
  const handleAddBlock = (afterIndex: number, type: BlockType = 'paragraph') => {
    const newBlock: PageBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      content: '',
      properties: type === 'checklist' ? { checked: false } : undefined
    };
    const updated = [...blocks.slice(0, afterIndex + 1), newBlock, ...blocks.slice(afterIndex + 1)];
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Delete Block
  const handleDeleteBlock = (index: number) => {
    if (blocks.length <= 1) {
      const reset = [{ id: `blk-${Date.now()}`, type: 'paragraph' as BlockType, content: '' }];
      setBlocks(reset);
      triggerAutoSave(reset);
      return;
    }
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Move Block Up / Down
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) {
      return;
    }
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Toggle Checklist item
  const handleToggleChecklist = (index: number) => {
    const updated = [...blocks];
    const isChecked = updated[index].properties?.checked;
    updated[index] = {
      ...updated[index],
      properties: { ...updated[index].properties, checked: !isChecked }
    };
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Update Table Cell
  const handleUpdateTableCell = (blockIndex: number, rowIndex: number, colIndex: number, value: string, isHeader = false) => {
    const updated = [...blocks];
    const tableData = updated[blockIndex].properties?.tableData || { headers: [], rows: [] };
    const newHeaders = [...tableData.headers];
    const newRows = tableData.rows.map((r) => [...r]);

    if (isHeader) {
      newHeaders[colIndex] = value;
    } else {
      newRows[rowIndex][colIndex] = value;
    }

    updated[blockIndex] = {
      ...updated[blockIndex],
      properties: {
        ...updated[blockIndex].properties,
        tableData: { headers: newHeaders, rows: newRows }
      }
    };
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Add Table Row / Column
  const handleAddTableRow = (blockIndex: number) => {
    const updated = [...blocks];
    const tableData = updated[blockIndex].properties?.tableData || { headers: ['Col 1', 'Col 2'], rows: [] };
    const emptyRow = new Array(tableData.headers.length).fill('');
    const newRows = [...tableData.rows, emptyRow];

    updated[blockIndex] = {
      ...updated[blockIndex],
      properties: {
        ...updated[blockIndex].properties,
        tableData: { headers: tableData.headers, rows: newRows }
      }
    };
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  const handleAddTableCol = (blockIndex: number) => {
    const updated = [...blocks];
    const tableData = updated[blockIndex].properties?.tableData || { headers: ['Col 1'], rows: [['']] };
    const newHeaders = [...tableData.headers, `Col ${tableData.headers.length + 1}`];
    const newRows = tableData.rows.map((r) => [...r, '']);

    updated[blockIndex] = {
      ...updated[blockIndex],
      properties: {
        ...updated[blockIndex].properties,
        tableData: { headers: newHeaders, rows: newRows }
      }
    };
    setBlocks(updated);
    triggerAutoSave(updated);
  };

  // Available emojis for icon selector
  const emojiList = ['📄', '⚛️', '🧲', '⚡', '📐', '💻', '📚', '📊', '🎯', '🧠', '💡', '📝', '🔬', '🎓', '🛠️', '⭐', '🪐', '🧪'];

  // Slash commands catalogue
  const slashCommands: Array<{ type: BlockType; label: string; icon: any; hint: string }> = [
    { type: 'paragraph', label: 'Text', icon: FileText, hint: 'Just start writing plain text' },
    { type: 'heading_1', label: 'Heading 1', icon: Heading1, hint: 'Large section heading' },
    { type: 'heading_2', label: 'Heading 2', icon: Heading2, hint: 'Medium sub-section heading' },
    { type: 'heading_3', label: 'Heading 3', icon: Heading3, hint: 'Small sub-heading' },
    { type: 'checklist', label: 'To-do List', icon: CheckSquare, hint: 'Track tasks with checkboxes' },
    { type: 'bullet_list', label: 'Bulleted List', icon: List, hint: 'Create a simple bulleted list' },
    { type: 'numbered_list', label: 'Numbered List', icon: ListOrdered, hint: 'Create a numbered list' },
    { type: 'quote', label: 'Quote', icon: Quote, hint: 'Capture a theoretical quote or citation' },
    { type: 'callout', label: 'Callout Box', icon: AlertCircle, hint: 'Highlight important formulas or notes' },
    { type: 'math_block', label: 'Math Formula Block', icon: Sigma, hint: 'Render LaTeX equations' },
    { type: 'code_block', label: 'Code Snippet', icon: Code, hint: 'Capture algorithms & snippets' },
    { type: 'table', label: 'Table Matrix', icon: TableIcon, hint: 'Add a structured data table' }
  ];

  const filteredCommands = slashCommands.filter((c) =>
    c.label.toLowerCase().includes(slashFilter.toLowerCase()) ||
    c.type.toLowerCase().includes(slashFilter.toLowerCase())
  );

  // Calculate word count
  const wordCount = blocks.reduce((acc, b) => acc + b.content.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* 1. Editor Control & Breadcrumbs Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-cyan-500/15 text-xs font-mono">
        {/* Left: Academic Association Link Badge */}
        <div className="flex items-center gap-2 truncate min-w-0">
          {page.academicLink?.courseCode && (
            <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30 truncate">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-bold">{page.academicLink.courseCode}</span>
              {page.academicLink.lessonTitle && (
                <>
                  <span aria-hidden="true" className="text-cyan-500/40">·</span>
                  <span className="text-cyan-200/80 truncate max-w-[200px]">{page.academicLink.lessonTitle}</span>
                </>
              )}
              {onNavigateToAcademicLink && (
                <button
                  onClick={() => onNavigateToAcademicLink(page.academicLink!)}
                  title="Open Related Academic Lesson"
                  className="ml-1 text-cyan-400 hover:text-white p-0.5 rounded hover:bg-white/10"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Autosave Status & Word Count */}
        <div className="flex items-center gap-3 shrink-0 text-cyan-400/60">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{wordCount} words</span>
          </span>

          <span aria-hidden="true" className="text-cyan-500/30">|</span>

          <span className="flex items-center gap-1.5 text-cyan-300">
            <Save className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            <span className="text-[11px]">{saveStatus === 'saving' ? 'Saving...' : 'All changes saved'}</span>
          </span>
        </div>
      </div>

      {/* 2. Page Identity: Icon, Cover & Title */}
      <div className="space-y-4 pt-2">
        {/* Page Icon & Quick Selector */}
        <div className="relative inline-block">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-3xl sm:text-4xl p-2 rounded-2xl hover:bg-cyan-500/10 transition-colors border border-transparent hover:border-cyan-500/30 cursor-pointer"
            title="Change Icon"
          >
            {icon}
          </button>

          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-2 p-3 rounded-2xl border border-cyan-500/30 bg-black/95 backdrop-blur-2xl shadow-2xl z-50 flex flex-wrap gap-2 w-64 animate-fade-in">
              {emojiList.map((em) => (
                <button
                  key={em}
                  onClick={() => handleIconChange(em)}
                  className="text-2xl p-2 rounded-xl hover:bg-cyan-500/20 transition-all cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled Page..."
          className="w-full text-2xl sm:text-4xl font-bold text-white bg-transparent border-none outline-none placeholder-cyan-400/30 tracking-tight"
        />

        {/* Tags Bar */}
        {page.tags && page.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-cyan-400/70">
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            {page.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-300">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 3. Block-Based Content Stream */}
      <div className="space-y-3 pt-4">
        {blocks.map((block, index) => {
          const isSlashActive = slashMenuIndex === index;

          return (
            <div
              key={block.id}
              className="group relative flex items-start gap-2 -ml-8 pl-8 pr-2 py-1 rounded-xl transition-all hover:bg-white/[0.02]"
            >
              {/* Left Action Handle (Visible on Hover) */}
              <div className="absolute left-0 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-cyan-400/60">
                <button
                  onClick={() => handleAddBlock(index, 'paragraph')}
                  title="Add Block Below (+)"
                  className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 hover:text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteBlock(index)}
                  title="Delete Block"
                  className="p-1 rounded hover:bg-red-500/20 text-red-400/70 hover:text-red-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Block Content Renderer by Type */}
              <div className="flex-1 min-w-0">
                {/* Paragraph */}
                {block.type === 'paragraph' && (
                  <textarea
                    rows={1}
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddBlock(index, 'paragraph');
                      } else if (e.key === 'Backspace' && !block.content) {
                        e.preventDefault();
                        handleDeleteBlock(index);
                      }
                    }}
                    placeholder="Type '/' for commands or start writing..."
                    className="w-full bg-transparent text-sm sm:text-base text-cyan-100/90 outline-none resize-none placeholder-cyan-400/30 leading-relaxed font-sans"
                  />
                )}

                {/* Heading 1 */}
                {block.type === 'heading_1' && (
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(index, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBlock(index, 'paragraph')}
                    placeholder="Heading 1..."
                    className="w-full text-xl sm:text-2xl font-bold text-white bg-transparent outline-none placeholder-cyan-400/30 tracking-tight"
                  />
                )}

                {/* Heading 2 */}
                {block.type === 'heading_2' && (
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(index, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBlock(index, 'paragraph')}
                    placeholder="Heading 2..."
                    className="w-full text-lg sm:text-xl font-bold text-cyan-200 bg-transparent outline-none placeholder-cyan-400/30"
                  />
                )}

                {/* Heading 3 */}
                {block.type === 'heading_3' && (
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(index, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBlock(index, 'paragraph')}
                    placeholder="Heading 3..."
                    className="w-full text-base sm:text-lg font-semibold text-cyan-300 bg-transparent outline-none placeholder-cyan-400/30 font-mono"
                  />
                )}

                {/* Checklist / To-Do */}
                {block.type === 'checklist' && (
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleToggleChecklist(index)}
                      className="text-cyan-400 hover:text-cyan-200 cursor-pointer shrink-0"
                    >
                      {block.properties?.checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-cyan-400/60" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(index, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBlock(index, 'checklist')}
                      placeholder="To-do task item..."
                      className={`w-full bg-transparent text-sm sm:text-base outline-none font-mono ${
                        block.properties?.checked ? 'line-through text-cyan-400/40' : 'text-cyan-100'
                      }`}
                    />
                  </div>
                )}

                {/* Bullet List */}
                {block.type === 'bullet_list' && (
                  <div className="flex items-start gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400/70 mt-2 shrink-0" />
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(index, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBlock(index, 'bullet_list')}
                      placeholder="List item..."
                      className="w-full bg-transparent text-sm sm:text-base text-cyan-100 outline-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Numbered List */}
                {block.type === 'numbered_list' && (
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs font-mono font-bold text-cyan-400 mt-0.5 shrink-0">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(index, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBlock(index, 'numbered_list')}
                      placeholder="Numbered step..."
                      className="w-full bg-transparent text-sm sm:text-base text-cyan-100 outline-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Callout Box */}
                {block.type === 'callout' && (
                  <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-black/60 backdrop-blur-md space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-bold">
                      <span className="text-base">{block.properties?.calloutIcon || '💡'}</span>
                      <span>KEY PRINCIPLE / CALLOUT</span>
                    </div>
                    <textarea
                      rows={2}
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(index, e.target.value)}
                      placeholder="Enter important theorem or takeaway..."
                      className="w-full bg-transparent text-sm text-cyan-100/90 outline-none resize-none leading-relaxed font-sans"
                    />
                  </div>
                )}

                {/* Quote */}
                {block.type === 'quote' && (
                  <div className="border-l-2 border-cyan-400 pl-4 py-1 italic text-cyan-200/90 font-serif">
                    <textarea
                      rows={2}
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(index, e.target.value)}
                      placeholder="Citation quote or statement..."
                      className="w-full bg-transparent text-sm sm:text-base outline-none resize-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Math Block / LaTeX Equation */}
                {block.type === 'math_block' && (
                  <div className="p-4 rounded-2xl border border-cyan-500/30 bg-black/60 font-mono space-y-2">
                    <div className="flex items-center justify-between text-xs text-cyan-400/60 pb-1 border-b border-cyan-500/10">
                      <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                        <Sigma className="w-3.5 h-3.5 text-cyan-400" />
                        <span>LaTeX Mathematical Formulation</span>
                      </span>
                      <button
                        onClick={() => setEditingMathId(editingMathId === block.id ? null : block.id)}
                        className="text-[11px] text-cyan-400 hover:text-white"
                      >
                        {editingMathId === block.id ? 'Done' : 'Edit LaTeX'}
                      </button>
                    </div>

                    {editingMathId === block.id ? (
                      <textarea
                        rows={2}
                        value={block.content}
                        onChange={(e) => handleBlockContentChange(index, e.target.value)}
                        placeholder="e.g. \oint \mathbf{E} \cdot d\boldsymbol{\ell} = - \frac{\partial \Phi_B}{\partial t}"
                        className="w-full bg-black/80 border border-cyan-500/30 rounded-lg p-2.5 text-xs text-cyan-100 font-mono outline-none"
                      />
                    ) : (
                      <div className="py-2 text-center text-sm sm:text-base text-cyan-200 tracking-wide select-all font-mono">
                        {block.content || '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}'}
                      </div>
                    )}
                  </div>
                )}

                {/* Code Block */}
                {block.type === 'code_block' && (
                  <div className="rounded-2xl border border-cyan-500/20 bg-black/80 overflow-hidden font-mono text-xs">
                    <div className="flex items-center justify-between px-3.5 py-1.5 bg-cyan-950/40 border-b border-cyan-500/15 text-cyan-400/60">
                      <span>{block.properties?.language || 'typescript'}</span>
                      <span className="text-[10px]">Code Snippet</span>
                    </div>
                    <textarea
                      rows={4}
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(index, e.target.value)}
                      placeholder="// Insert algorithm code or simulation script..."
                      className="w-full bg-transparent p-3.5 text-cyan-100 outline-none font-mono resize-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Table Block */}
                {block.type === 'table' && block.properties?.tableData && (
                  <div className="p-4 rounded-2xl border border-cyan-500/20 bg-black/50 space-y-3 overflow-x-auto">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-400/70">
                      <span className="font-bold text-cyan-300">Structured Data Matrix</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddTableRow(index)}
                          className="px-2 py-0.5 rounded border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 text-[11px]"
                        >
                          + Row
                        </button>
                        <button
                          onClick={() => handleAddTableCol(index)}
                          className="px-2 py-0.5 rounded border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 text-[11px]"
                        >
                          + Column
                        </button>
                      </div>
                    </div>

                    <table className="w-full text-xs font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-cyan-500/30 bg-cyan-950/30">
                          {block.properties.tableData.headers.map((hdr, hIdx) => (
                            <th key={hIdx} className="p-2 text-left text-cyan-300 font-bold">
                              <input
                                type="text"
                                value={hdr}
                                onChange={(e) => handleUpdateTableCell(index, 0, hIdx, e.target.value, true)}
                                className="w-full bg-transparent outline-none font-bold text-cyan-300"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.properties.tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-cyan-500/10 hover:bg-white/[0.02]">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 text-cyan-100">
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) => handleUpdateTableCell(index, rIdx, cIdx, e.target.value, false)}
                                  className="w-full bg-transparent outline-none text-cyan-100"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Embedded Academic Resource */}
                {block.type === 'embedded_resource' && block.properties?.academicLink && (
                  <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/40 to-black/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {block.properties.academicLink.title}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400/60 truncate">
                          {block.properties.academicLink.subtitle || 'Course Module Reference'}
                        </div>
                      </div>
                    </div>

                    {onNavigateToAcademicLink && (
                      <button
                        onClick={() => {
                          const link = block.properties!.academicLink!;
                          onNavigateToAcademicLink({
                            courseId: link.type === 'course' ? link.targetId : undefined,
                            unitId: link.type === 'unit' ? link.targetId : undefined,
                            lessonId: link.type === 'lesson' ? link.targetId : undefined,
                            assignmentId: link.type === 'assignment' ? link.targetId : undefined,
                            knowledgeSpaceId: link.type === 'space' ? link.targetId : undefined
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>Open Resource</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Slash Command Dropdown Palette */}
              {isSlashActive && (
                <div className="absolute top-full left-8 mt-1 w-64 max-h-72 overflow-y-auto rounded-2xl border border-cyan-500/30 bg-black/95 backdrop-blur-2xl shadow-2xl p-2 z-50 animate-fade-in space-y-1 custom-scrollbar">
                  <div className="text-[10px] font-mono uppercase text-cyan-400/50 px-2 py-1">
                    Insert Block Type
                  </div>
                  {filteredCommands.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.type}
                        onClick={() => handleConvertBlockType(index, cmd.type)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-cyan-500/20 text-cyan-200 transition-colors cursor-pointer group"
                      >
                        <div className="h-7 w-7 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:border-cyan-400">
                          <Icon className="w-4 h-4 text-cyan-400 group-hover:text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold text-white truncate">{cmd.label}</div>
                          <div className="text-[10px] font-mono text-cyan-400/60 truncate">{cmd.hint}</div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredCommands.length === 0 && (
                    <div className="p-3 text-center text-xs font-mono text-cyan-400/50">
                      No matching blocks
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Plus Inserter */}
      <div className="pt-4">
        <button
          onClick={() => handleAddBlock(blocks.length - 1, 'paragraph')}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-400/60 hover:text-cyan-300 py-2 px-3 rounded-lg hover:bg-cyan-500/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Click to add a block or press Enter</span>
        </button>
      </div>
    </div>
  );
};
