import React, { useState, useEffect } from 'react';
import type { EducationClass, KnowledgeSpace } from '../../../types/education.ts';
import type {
  WorkspacePage,
  WorkspaceDatabase,
  WorkspaceTemplate,
  PageBlock,
  AcademicAssociation
} from '../../../types/workspace.ts';
import { WorkspaceSidebar } from './WorkspaceSidebar.tsx';
import { BlockEditor } from './BlockEditor.tsx';
import { DatabaseView } from './DatabaseView.tsx';
import { WORKSPACE_TEMPLATES } from './workspaceTemplates.ts';
import { INITIAL_WORKSPACE_PAGES, INITIAL_WORKSPACE_DATABASES } from './initialWorkspaceData.ts';
import {
  Menu,
  X,
  Search,
  Plus,
  Sparkles,
  BookOpen,
  Layers,
  FileText,
  RotateCcw,
  Trash2,
  ExternalLink,
  ChevronRight,
  FolderPlus,
  Table,
  Check,
  Globe,
  Lock,
  GraduationCap
} from 'lucide-react';

interface MyWorkspaceViewProps {
  classes: EducationClass[];
  knowledgeSpaces: KnowledgeSpace[];
  onBackToHome: () => void;
  onNavigateToAcademicLink?: (link: AcademicAssociation) => void;
  initialPageId?: string;
  initialCourseId?: string;
  initialLessonId?: string;
}

export const MyWorkspaceView: React.FC<MyWorkspaceViewProps> = ({
  classes,
  knowledgeSpaces,
  onBackToHome,
  onNavigateToAcademicLink,
  initialPageId,
  initialCourseId,
  initialLessonId
}) => {
  // Persistence state
  const [pages, setPages] = useState<WorkspacePage[]>(() => {
    const saved = localStorage.getItem('jarvis_workspace_pages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved pages:', e);
      }
    }
    return INITIAL_WORKSPACE_PAGES;
  });

  const [databases, setDatabases] = useState<WorkspaceDatabase[]>(() => {
    const saved = localStorage.getItem('jarvis_workspace_databases');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved databases:', e);
      }
    }
    return INITIAL_WORKSPACE_DATABASES;
  });

  const [activePageId, setActivePageId] = useState<string>(() => {
    if (initialPageId && pages.some((p) => p.id === initialPageId)) return initialPageId;
    return pages[0]?.id || 'page-phys-faraday';
  });

  const [activeDatabaseId, setActiveDatabaseId] = useState<string>(INITIAL_WORKSPACE_DATABASES[0]?.id || '');
  const [currentNavSection, setCurrentNavSection] = useState<'editor' | 'database' | 'templates' | 'trash'>('editor');

  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Academic Linker modal
  const [isAcademicLinkerOpen, setIsAcademicLinkerOpen] = useState(false);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('jarvis_workspace_pages', JSON.stringify(pages));
  }, [pages]);

  useEffect(() => {
    localStorage.setItem('jarvis_workspace_databases', JSON.stringify(databases));
  }, [databases]);

  // Handle incoming academic link selection
  useEffect(() => {
    if (initialLessonId) {
      const match = pages.find((p) => p.academicLink?.lessonId === initialLessonId);
      if (match) {
        setActivePageId(match.id);
        setCurrentNavSection('editor');
      }
    } else if (initialCourseId) {
      const match = pages.find((p) => p.academicLink?.courseId === initialCourseId);
      if (match) {
        setActivePageId(match.id);
        setCurrentNavSection('editor');
      }
    }
  }, [initialCourseId, initialLessonId]);

  // Active items
  const activePage = pages.find((p) => p.id === activePageId && !p.isDeleted) || pages.find((p) => !p.isDeleted);
  const activeDatabase = databases.find((d) => d.id === activeDatabaseId) || databases[0];
  const deletedPages = pages.filter((p) => p.isDeleted);

  // Page Operations
  const handleCreatePage = (parentId: string | null = null, template?: WorkspaceTemplate) => {
    const newPageId = `page-${Date.now()}`;
    const newPage: WorkspacePage = {
      id: newPageId,
      title: template ? template.defaultTitle : 'Untitled Page',
      icon: template ? template.icon : '📄',
      parentId: parentId || null,
      type: template ? template.type : 'doc',
      ownerId: 'student-1',
      ownerName: 'Alex Mercer',
      ownerRole: 'student',
      visibility: 'personal',
      tags: template ? [...template.sampleTags] : ['Notes'],
      blocks: template
        ? template.blocks.map((b) => ({ ...b, id: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` }))
        : [
            {
              id: `blk-${Date.now()}`,
              type: 'paragraph',
              content: ''
            }
          ],
      isFavorite: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPages((prev) => [newPage, ...prev]);
    setActivePageId(newPageId);
    setCurrentNavSection('editor');
    setIsSidebarOpen(false);
  };

  const handleUpdatePageTitle = (title: string) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, title, updatedAt: new Date().toISOString() } : p))
    );
  };

  const handleUpdatePageIcon = (icon: string) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, icon, updatedAt: new Date().toISOString() } : p))
    );
  };

  const handleUpdateBlocks = (blocks: PageBlock[]) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, blocks, updatedAt: new Date().toISOString() } : p))
    );
  };

  const handleDeletePage = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p))
    );
    if (activePageId === pageId) {
      const remaining = pages.filter((p) => p.id !== pageId && !p.isDeleted);
      if (remaining.length > 0) {
        setActivePageId(remaining[0].id);
      }
    }
  };

  const handleRestorePage = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, isDeleted: false, deletedAt: undefined } : p))
    );
    setActivePageId(pageId);
    setCurrentNavSection('editor');
  };

  const handlePermanentlyDeletePage = (pageId: string) => {
    setPages((prev) => prev.filter((p) => p.id !== pageId));
  };

  const handleToggleFavorite = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  const handleToggleVisibility = (pageId: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === pageId
          ? { ...p, visibility: p.visibility === 'personal' ? 'class_shared' : 'personal' }
          : p
      )
    );
  };

  const handleAttachAcademicLink = (link: AcademicAssociation) => {
    if (!activePage) return;
    setPages((prev) =>
      prev.map((p) => (p.id === activePage.id ? { ...p, academicLink: link } : p))
    );
    setIsAcademicLinkerOpen(false);
  };

  // Breadcrumbs calculation for active page
  const getBreadcrumbs = (page: WorkspacePage | undefined): WorkspacePage[] => {
    if (!page) return [];
    const trail: WorkspacePage[] = [page];
    let curr = page;
    while (curr.parentId) {
      const parent = pages.find((p) => p.id === curr.parentId && !p.isDeleted);
      if (parent) {
        trail.unshift(parent);
        curr = parent;
      } else {
        break;
      }
    }
    return trail;
  };

  const breadcrumbs = getBreadcrumbs(activePage);

  // Filtered search results
  const searchResults = pages.filter((p) => {
    if (p.isDeleted) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = p.title.toLowerCase().includes(q);
    const blockMatch = p.blocks?.some((b) => b.content.toLowerCase().includes(q));
    const tagMatch = p.tags?.some((t) => t.toLowerCase().includes(q));
    return titleMatch || blockMatch || tagMatch;
  });

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-4">
      {/* 1. Mobile Drawer Backdrop & Toggle */}
      <div className="md:hidden flex items-center justify-between p-3 rounded-xl bg-black/40 border border-cyan-500/20 backdrop-blur-md">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2 text-xs font-mono text-cyan-300 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>Workspace Tree</span>
        </button>
        <span className="text-xs font-mono text-cyan-400/80 truncate max-w-[200px]">
          {activePage?.title || 'My Workspace'}
        </span>
      </div>

      {/* 2. Left Workspace Tree & Navigation Sidebar */}
      {/* Desktop Sticky / Mobile Overlay Drawer */}
      <div
        className={`fixed inset-0 z-40 md:relative md:inset-auto md:z-auto md:block md:w-64 lg:w-72 shrink-0 ${
          isSidebarOpen ? 'block' : 'hidden md:block'
        }`}
      >
        {/* Mobile overlay backdrop */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm md:hidden"
          />
        )}

        <div className="relative z-50 h-full max-h-[85vh] md:max-h-none overflow-y-auto bg-slate-950/90 border border-cyan-500/20 md:rounded-xl p-3 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
          <WorkspaceSidebar
            pages={pages.filter((p) => !p.isDeleted)}
            activePageId={activePageId}
            activeDatabaseId={activeDatabaseId}
            currentNavSection={currentNavSection}
            onSelectPage={(id) => {
              setActivePageId(id);
              setCurrentNavSection('editor');
              setIsSidebarOpen(false);
            }}
            onSelectDatabase={(id) => {
              setActiveDatabaseId(id);
              setCurrentNavSection('database');
              setIsSidebarOpen(false);
            }}
            onSelectSection={(sec) => {
              setCurrentNavSection(sec);
              setIsSidebarOpen(false);
            }}
            onCreatePage={(parentId) => handleCreatePage(parentId)}
            onOpenTemplates={() => {
              setCurrentNavSection('templates');
              setIsSidebarOpen(false);
            }}
            onOpenSearch={() => {
              setIsSearchOpen(true);
              setIsSidebarOpen(false);
            }}
            onDeletePage={(id) => handleDeletePage(id)}
            databases={databases}
            trashCount={deletedPages.length}
          />

          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="mt-4 md:hidden w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-xs font-mono text-cyan-300"
            >
              <X className="w-4 h-4" />
              <span>Close Drawer</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Workspace Canvas Area */}
      <div className="flex-1 min-w-0 bg-black/40 border border-cyan-500/20 rounded-xl p-4 sm:p-6 backdrop-blur-md">
        {/* SECTION A: BLOCK EDITOR */}
        {currentNavSection === 'editor' && activePage && (
          <div className="space-y-4">
            {/* Top Workspace Bar: Breadcrumbs + Academic Integration + Visibility */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
              {/* Breadcrumb Trail */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-400/70 overflow-x-auto py-1">
                <span className="font-bold text-cyan-300">My Workspace</span>
                {breadcrumbs.map((b, idx) => (
                  <React.Fragment key={b.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-500/40 shrink-0" />
                    <button
                      onClick={() => setActivePageId(b.id)}
                      className={`truncate max-w-[140px] hover:text-white cursor-pointer ${
                        idx === breadcrumbs.length - 1 ? 'text-white font-bold' : ''
                      }`}
                    >
                      {b.icon} {b.title}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 text-xs font-mono">
                {/* Academic Association Badge */}
                {activePage.academicLink ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-cyan-300">
                    <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-bold">{activePage.academicLink.courseCode || 'Course'}</span>
                    {activePage.academicLink.lessonTitle && (
                      <span className="hidden sm:inline text-cyan-100/70 truncate max-w-[120px]">
                        · {activePage.academicLink.lessonTitle}
                      </span>
                    )}
                    {onNavigateToAcademicLink && (
                      <button
                        onClick={() => onNavigateToAcademicLink(activePage.academicLink!)}
                        title="Jump to Academic Lesson"
                        className="ml-1 p-0.5 hover:text-white text-cyan-400 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAcademicLinkerOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400/80 hover:text-cyan-300 cursor-pointer transition-all"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Link Course</span>
                  </button>
                )}

                {/* Visibility Indicator (Personal / Shared) */}
                <button
                  onClick={() => handleToggleVisibility(activePage.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    activePage.visibility === 'class_shared'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-cyan-500/20 text-cyan-400/80 hover:text-cyan-200'
                  }`}
                  title="Toggle Workspace Visibility"
                >
                  {activePage.visibility === 'class_shared' ? (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Class Shared</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private</span>
                    </>
                  )}
                </button>

                {/* Subpage Creator */}
                <button
                  onClick={() => handleCreatePage(activePage.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 cursor-pointer transition-all"
                  title="Create Nested Subpage"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add Subpage</span>
                </button>
              </div>
            </div>

            {/* Block Editor */}
            <BlockEditor
              page={activePage}
              onUpdatePageTitle={handleUpdatePageTitle}
              onUpdatePageIcon={handleUpdatePageIcon}
              onUpdateBlocks={handleUpdateBlocks}
              onNavigateToAcademicLink={onNavigateToAcademicLink}
              onOpenPage={(id) => setActivePageId(id)}
              allPages={pages.filter((p) => !p.isDeleted)}
            />
          </div>
        )}

        {/* SECTION B: DATABASE VIEW */}
        {currentNavSection === 'database' && activeDatabase && (
          <DatabaseView
            database={activeDatabase}
            onUpdateDatabase={(updated) => {
              setDatabases((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
            }}
            onOpenPage={(pageId) => {
              setActivePageId(pageId);
              setCurrentNavSection('editor');
            }}
          />
        )}

        {/* SECTION C: TEMPLATES GALLERY */}
        {currentNavSection === 'templates' && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            <div>
              <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
                Workspace Templates · Structured Academic Starters
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Academic Page Templates
              </h1>
              <p className="text-xs sm:text-sm text-cyan-100/70 font-mono mt-1">
                Create new structured notes, derivation sheets, daily study sprints, and revision frameworks in one click.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WORKSPACE_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 hover:border-cyan-400/60 hover:bg-slate-900/80 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30">
                        {tpl.icon}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                        {tpl.category}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {tpl.name}
                    </h2>
                    <p className="text-xs text-cyan-100/70 font-mono leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-cyan-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {tpl.sampleTags.map((tag) => (
                        <span key={tag} className="text-[9px] font-mono text-cyan-400/60">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleCreatePage(null, tpl)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Use Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION D: TRASH & RECENTLY DELETED */}
        {currentNavSection === 'trash' && (
          <div className="space-y-6 max-w-4xl mx-auto py-2">
            <div>
              <div className="text-xs font-mono text-rose-400 tracking-wider uppercase mb-1">
                Workspace Trash · Soft Deleted Items
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Recently Deleted Pages
              </h1>
              <p className="text-xs sm:text-sm text-cyan-100/70 font-mono mt-1">
                Pages remain in trash until permanently removed. You can restore any page back to your workspace hierarchy.
              </p>
            </div>

            {deletedPages.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-cyan-500/20 text-center space-y-2">
                <Trash2 className="w-8 h-8 text-cyan-400/40 mx-auto" />
                <p className="text-xs font-mono text-cyan-200/60">Trash is empty. No deleted pages.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deletedPages.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/20 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-lg">{p.icon || '📄'}</span>
                      <span className="text-xs font-mono font-bold text-white truncate">{p.title}</span>
                      <span className="text-[10px] font-mono text-cyan-400/50">
                        (Deleted {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : 'recently'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestorePage(p.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-mono hover:bg-cyan-500/30 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handlePermanentlyDeletePage(p.id)}
                        className="p-1 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Search & Quick-Jump Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Jump to Workspace Page</span>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-cyan-400/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Search by title, keywords, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-white placeholder-cyan-500/40 text-xs font-mono focus:outline-none focus:border-cyan-400"
            />

            <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
              {searchResults.length === 0 ? (
                <p className="text-xs font-mono text-cyan-200/50 text-center py-4">No matching pages found.</p>
              ) : (
                searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActivePageId(p.id);
                      setCurrentNavSection('editor');
                      setIsSearchOpen(false);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-transparent hover:border-cyan-400/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{p.icon || '📄'}</span>
                      <span className="text-xs font-mono text-white truncate">{p.title}</span>
                    </div>
                    {p.academicLink && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                        {p.academicLink.courseCode}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Academic Linker Modal */}
      {isAcademicLinkerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono">
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                <span>Link Academic Subject / Unit</span>
              </div>
              <button
                onClick={() => setIsAcademicLinkerOpen(false)}
                className="text-cyan-400/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-cyan-200/70">
              Choose an enrolled course to connect this workspace page. This allows one-click jumping between personal notes and curriculum modules.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() =>
                    handleAttachAcademicLink({
                      courseId: cls.id,
                      courseCode: cls.code
                    })
                  }
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/20 hover:border-cyan-400/60 hover:bg-cyan-950/40 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-mono font-bold text-white">{cls.name}</div>
                    <div className="text-[10px] font-mono text-cyan-400/70">{cls.code} · {cls.instructorName}</div>
                  </div>
                  <Plus className="w-4 h-4 text-cyan-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
