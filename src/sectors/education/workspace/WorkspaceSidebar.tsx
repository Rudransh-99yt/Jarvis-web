import React, { useState } from 'react';
import type { WorkspacePage, WorkspaceDatabase } from '../../../types/workspace.ts';
import {
  FileText,
  FolderPlus,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  Table,
  Sparkles,
  Search,
  BookOpen,
  Layers,
  Flame,
  Star,
  CornerDownRight
} from 'lucide-react';

interface WorkspaceSidebarProps {
  pages: WorkspacePage[];
  activePageId?: string;
  activeDatabaseId?: string;
  currentNavSection: 'editor' | 'database' | 'templates' | 'trash';
  onSelectPage: (pageId: string) => void;
  onSelectDatabase: (dbId: string) => void;
  onSelectSection: (section: 'editor' | 'database' | 'templates' | 'trash') => void;
  onCreatePage: (parentId?: string | null) => void;
  onOpenTemplates: () => void;
  onOpenSearch: () => void;
  onDeletePage: (pageId: string) => void;
  databases: WorkspaceDatabase[];
  trashCount: number;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  pages,
  activePageId,
  activeDatabaseId,
  currentNavSection,
  onSelectPage,
  onSelectDatabase,
  onSelectSection,
  onCreatePage,
  onOpenTemplates,
  onOpenSearch,
  onDeletePage,
  databases,
  trashCount
}) => {
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const toggleCollapse = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  // Build recursive page tree
  const buildPageTree = (parentId: string | null = null, depth = 0) => {
    const children = pages.filter((p) => (p.parentId === parentId || (!parentId && !p.parentId)));

    if (children.length === 0) return null;

    return (
      <div className="space-y-0.5">
        {children.map((page) => {
          const hasChildren = pages.some((p) => p.parentId === page.id);
          const isCollapsed = collapsedNodes[page.id];
          const isActive = currentNavSection === 'editor' && activePageId === page.id;

          return (
            <div key={page.id} className="select-none">
              <div
                onClick={() => onSelectPage(page.id)}
                style={{ paddingLeft: `${Math.max(0.5, depth * 0.75 + 0.5)}rem` }}
                className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-white font-bold border border-cyan-400/30'
                    : 'text-cyan-300/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate min-w-0">
                  {hasChildren ? (
                    <button
                      onClick={(e) => toggleCollapse(page.id, e)}
                      className="p-0.5 text-cyan-400/60 hover:text-cyan-200"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <span className="w-3.5" />
                  )}

                  <span className="text-sm shrink-0">{page.icon || '📄'}</span>
                  <span className="truncate">{page.title || 'Untitled'}</span>
                </div>

                {/* Hover actions: Add subpage / Delete */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreatePage(page.id);
                    }}
                    title="Add Nested Sub-Page"
                    className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400 hover:text-white"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePage(page.id);
                    }}
                    title="Move to Trash"
                    className="p-1 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Recursive Children rendering if expanded */}
              {hasChildren && !isCollapsed && buildPageTree(page.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-64 shrink-0 bg-[#080d16]/95 border-r border-cyan-500/20 flex flex-col h-full text-xs font-mono text-cyan-100 select-none">
      {/* 1. Top Quick Action Bar */}
      <div className="p-3 border-b border-cyan-500/15 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 font-bold">
            My Workspace
          </span>
          <button
            onClick={() => onCreatePage(null)}
            title="Create New Top-Level Page"
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>New Page</span>
          </button>
        </div>

        {/* Quick Search Bar Trigger */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between p-2 rounded-lg border border-cyan-500/20 bg-black/60 text-cyan-400/60 hover:border-cyan-400/50 hover:text-cyan-200 transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span className="text-[11px]">Search notes & docs...</span>
          </div>
          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
            ⌘K
          </span>
        </button>
      </div>

      {/* 2. Scrollable Hierarchical Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4 custom-scrollbar">
        {/* Templates Launcher */}
        <div className="space-y-0.5">
          <button
            onClick={onOpenTemplates}
            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left cursor-pointer ${
              currentNavSection === 'templates'
                ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/30'
                : 'text-cyan-300/80 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Templates Catalog</span>
          </button>
        </div>

        {/* Hierarchical Pages Tree */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 text-[10px] uppercase tracking-wider text-cyan-400/50 font-bold">
            <span>My Pages</span>
            <span>{pages.length}</span>
          </div>

          {buildPageTree(null, 0)}

          {pages.length === 0 && (
            <div className="p-3 text-center text-cyan-400/40 text-[11px]">
              No pages yet. Click "+ New Page".
            </div>
          )}
        </div>

        {/* Database Collections */}
        <div className="space-y-1 pt-1 border-t border-cyan-500/10">
          <div className="flex items-center justify-between px-2 text-[10px] uppercase tracking-wider text-cyan-400/50 font-bold">
            <span>Databases</span>
            <span>{databases.length}</span>
          </div>

          <div className="space-y-0.5">
            {databases.map((db) => {
              const isActive = currentNavSection === 'database' && activeDatabaseId === db.id;
              return (
                <button
                  key={db.id}
                  onClick={() => onSelectDatabase(db.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/30'
                      : 'text-cyan-300/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="truncate">{db.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Trash Bar */}
      <div className="p-2.5 border-t border-cyan-500/15 bg-black/40">
        <button
          onClick={() => onSelectSection('trash')}
          className={`w-full flex items-center justify-between p-2 rounded-lg transition-all text-left cursor-pointer ${
            currentNavSection === 'trash'
              ? 'bg-red-500/20 text-red-200 font-bold border border-red-500/30'
              : 'text-cyan-400/60 hover:text-red-300 hover:bg-red-500/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash / Deleted</span>
          </div>
          {trashCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 font-bold">
              {trashCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
