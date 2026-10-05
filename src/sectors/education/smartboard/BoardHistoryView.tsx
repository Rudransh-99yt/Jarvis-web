import React, { useState, useEffect } from 'react';
import type { EducationRole, EducationClass } from '../../../types/education.ts';
import type { BoardDocument } from '../../../types/smartboard.ts';
import { SmartBoardCanvas } from './SmartBoardCanvas.tsx';
import {
  BookOpen,
  Tv,
  Layers,
  Calendar,
  Share2,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  FileCheck2,
  Clock,
  Eye,
  ArrowRight,
  Filter,
  Search,
  Brain,
  FileText,
  HelpCircle,
  RefreshCw,
  Send,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';

interface BoardHistoryViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  selectedClassId?: string;
  onSelectDocument?: (doc: BoardDocument) => void;
  onBack?: () => void;
}

export const BoardHistoryView: React.FC<BoardHistoryViewProps> = ({
  classes,
  currentRole,
  selectedClassId,
  onSelectDocument,
  onBack
}) => {
  const [documents, setDocuments] = useState<BoardDocument[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>(
    selectedClassId || (classes.length > 0 ? classes[0].id : 'class-phys-301')
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedDoc, setSelectedDoc] = useState<BoardDocument | null>(null);
  const [knowledgeModalDoc, setKnowledgeModalDoc] = useState<BoardDocument | null>(null);
  const [askJarvisDoc, setAskJarvisDoc] = useState<BoardDocument | null>(null);
  const [askQuery, setAskQuery] = useState<string>('');
  const [askAnswer, setAskAnswer] = useState<any | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<string | null>(null);

  const isTeacher = currentRole === 'teacher' || currentRole === 'principal';

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Fetch Board History
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/education/smartboard/history?classId=${filterClassId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.documents) {
          setDocuments(data.documents);
        }
      })
      .catch((err) => console.warn('Could not fetch board history:', err))
      .finally(() => setIsLoading(false));
  }, [filterClassId]);

  // Handle Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/education/smartboard/knowledge/search?q=${encodeURIComponent(q)}&classId=${filterClassId}`);
      const data = await res.json();
      if (res.ok && data.results) {
        setSearchResults(data.results);
      }
    } catch {
      showToast('Search query failed');
    } finally {
      setIsSearching(false);
    }
  };

  // Derive Notes in Workspace
  const handleDeriveNotes = async (doc: BoardDocument) => {
    try {
      const res = await fetch('/api/education/smartboard/knowledge/notes/derive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardDocId: doc.id })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Notes page '${data.title}' created in your Workspace!`);
      } else {
        showToast(data.error || 'Failed to create derived notes');
      }
    } catch {
      showToast('Network error creating notes');
    }
  };

  // Trigger Index / RAG Sync
  const handleTriggerIndex = async (doc: BoardDocument) => {
    try {
      const res = await fetch('/api/education/smartboard/knowledge/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardDocId: doc.id, triggerRagIngest: true })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Board indexed & synced to Knowledge Space! (${data.boardDoc.pages?.length} pages)`);
        setDocuments((prev) => prev.map((d) => (d.id === doc.id ? data.boardDoc : d)));
      } else {
        showToast(data.error || 'Indexing failed');
      }
    } catch {
      showToast('Network error indexing board');
    }
  };

  // Toggle Release
  const handleToggleRelease = async (doc: BoardDocument) => {
    const nextState = !doc.isReleasedToStudents;
    try {
      const res = await fetch('/api/education/smartboard/knowledge/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardDocId: doc.id, isReleased: nextState })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(nextState ? 'Board notes released to enrolled cadets.' : 'Board unreleased (private).');
        setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, isReleasedToStudents: nextState } : d)));
      }
    } catch {
      showToast('Error changing release status');
    }
  };

  // Ask Jarvis About Board
  const handleAskBoard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!askJarvisDoc || !askQuery.trim()) return;

    setIsAsking(true);
    setAskAnswer(null);
    try {
      const res = await fetch('/api/education/smartboard/knowledge/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: askQuery.trim(),
          boardDocumentId: askJarvisDoc.id,
          courseCode: askJarvisDoc.courseCode
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAskAnswer(data);
      } else {
        showToast(data.error || 'Inquiry failed');
      }
    } catch {
      showToast('Network error querying board knowledge');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Toast Notice */}
      {notice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-cyan-500 text-black font-mono text-xs font-bold shadow-2xl animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notice}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-cyan-500/20 bg-slate-950/80 backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5" />
            <span>SmartBoard Knowledge Engine (D.13)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isTeacher ? 'Academic Whiteboard Knowledge Base' : 'Classroom Board History & Knowledge'}
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            {isTeacher
              ? 'Structured board documents, formulas, RAG knowledge indexing, and derived lecture notes.'
              : 'Search verified board notes, derivations, and ask Jarvis questions grounded in actual whiteboard sessions.'}
          </p>
        </div>

        {/* Course Filter & Search Trigger */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 bg-slate-950/90 border border-slate-800 focus-within:border-cyan-500/60 rounded-2xl p-2 transition-all">
        <Search className="w-4 h-4 text-cyan-400 ml-2 shrink-0" />
        <input
          type="text"
          placeholder="Search board knowledge, derivations, formulas (e.g. 'Gauss flux', '∮ E · dA', 'dipole')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSearchResults(null);
            }}
            className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Search Results Display if active */}
      {searchResults && (
        <div className="p-4 rounded-3xl border border-cyan-500/30 bg-slate-950/90 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span>Matched Whiteboard Knowledge ({searchResults.length} results)</span>
            </h3>
            <button
              onClick={() => setSearchResults(null)}
              className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
            >
              Clear Search
            </button>
          </div>

          {searchResults.length === 0 ? (
            <p className="text-xs text-slate-400 font-mono py-2">No matching equations or text found on classroom whiteboards.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((item, idx) => (
                <div
                  key={`${item.boardDocumentId}-${item.pageId}-${idx}`}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-cyan-300">{item.courseCode} · Page {item.pageIndex + 1}</span>
                    <span className="text-emerald-400">{Math.round(item.confidence * 100)}% match</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">{item.pageTitle}</h4>
                  <p className="text-xs text-slate-300 font-mono bg-black/40 p-2 rounded-lg border border-slate-800/80">
                    {item.matchedFormula ? `⚡ ${item.matchedFormula}` : item.matchedText}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Documents Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Loading board knowledge documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-950/50 space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300 font-mono">No Board History Found</h3>
          <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">
            {isTeacher
              ? 'Complete a SmartBoard class session to archive, extract, and release structured board knowledge here.'
              : 'Your instructor has not yet released any board documents for this course.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const formulaCount = doc.pages.reduce(
              (acc, p) => acc + (p.elements?.filter((e) => e.semanticTag === 'formula' || e.latexFormula).length || 0) + (p.extractedEquations?.length || 0),
              0
            );
            const totalElements = doc.pages.reduce((acc, p) => acc + (p.elements?.length || 0), 0);

            return (
              <div
                key={doc.id}
                className="p-5 rounded-3xl border border-slate-800 bg-slate-950/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-cyan-300">{doc.courseCode}</span>
                    <div className="flex items-center gap-2">
                      {doc.ragIndexed && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                          RAG INDEXED
                        </span>
                      )}
                      {doc.isReleasedToStudents ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <Share2 className="w-3 h-3" />
                          <span>Released</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-sans line-clamp-2">
                    {doc.lessonTitle || doc.courseName} · {doc.classroomName}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {doc.pages.length} Pages
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                      {formulaCount} Formulas
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {totalElements} Elements
                    </span>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        if (onSelectDocument) {
                          onSelectDocument(doc);
                        } else {
                          setSelectedDoc(doc);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => setKnowledgeModalDoc(doc)}
                      className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Knowledge</span>
                    </button>

                    <button
                      onClick={() => {
                        setAskJarvisDoc(doc);
                        setAskAnswer(null);
                        setAskQuery('');
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Ask</span>
                    </button>

                    <button
                      onClick={() => handleDeriveNotes(doc)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
                      title="Generate derived Workspace Notes"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Notes</span>
                    </button>
                  </div>

                  {isTeacher && (
                    <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                      <button
                        onClick={() => handleToggleRelease(doc)}
                        className={`hover:underline cursor-pointer ${doc.isReleasedToStudents ? 'text-amber-400' : 'text-emerald-400'}`}
                      >
                        {doc.isReleasedToStudents ? 'Unrelease' : 'Publish to Students'}
                      </button>

                      <button
                        onClick={() => handleTriggerIndex(doc)}
                        className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Re-Index</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Structured Knowledge Inspector Modal */}
      {knowledgeModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  {knowledgeModalDoc.courseCode} Structured Board Knowledge
                </h3>
              </div>
              <button onClick={() => setKnowledgeModalDoc(null)} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Executive Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Executive Summary
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  {knowledgeModalDoc.derivedKnowledge?.summary || `Lecture notes delivered on ${knowledgeModalDoc.classroomName}.`}
                </p>
              </div>

              {/* Key Concepts */}
              {knowledgeModalDoc.derivedKnowledge?.keyConcepts && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-purple-300 font-mono">Key Theoretical Concepts</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    {knowledgeModalDoc.derivedKnowledge.keyConcepts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formulas */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-amber-300 font-mono">Extracted Board Formulas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(knowledgeModalDoc.derivedKnowledge?.importantEquations || [
                    { expression: '∮ E · dA = Q_enc / ε₀', description: "Gauss's Law" }
                  ]).map((eq, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px]">
                      <div className="text-cyan-300 font-bold">{eq.expression}</div>
                      {eq.description && <div className="text-slate-400 text-[10px]">{eq.description}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Revision Points */}
              {knowledgeModalDoc.derivedKnowledge?.revisionPoints && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-emerald-300 font-mono">High-Yield Revision Points</h4>
                  <div className="space-y-1">
                    {knowledgeModalDoc.derivedKnowledge.revisionPoints.map((r, i) => (
                      <div key={i} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 text-[11px]">
                        ✓ {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Ask Jarvis About Board Modal */}
      {askJarvisDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-xl w-full flex flex-col max-h-[85vh] overflow-hidden text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Ask Jarvis: {askJarvisDoc.courseCode} Whiteboard
                </h3>
              </div>
              <button onClick={() => setAskJarvisDoc(null)} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <form onSubmit={handleAskBoard} className="space-y-2">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-2.5">
                  <input
                    type="text"
                    placeholder="e.g. 'Explain what sir derived on page 1', 'Which equation did we use?'"
                    value={askQuery}
                    onChange={(e) => setAskQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isAsking || !askQuery.trim()}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold cursor-pointer disabled:opacity-40"
                  >
                    {isAsking ? 'Thinking...' : 'Ask'}
                  </button>
                </div>
              </form>

              {askAnswer && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2.5 text-xs font-sans">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-amber-300 font-bold">Grounded in Whiteboard</span>
                    <span className="text-slate-400">Pages: {askAnswer.relevantPageIndices?.join(', ') || '1'}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{askAnswer.answer}</p>
                  {askAnswer.citedFormulas && askAnswer.citedFormulas.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Board Formulas Referenced:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {askAnswer.citedFormulas.map((f: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-[10px]">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Full-Screen Interactive Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-xl">
          <div className="w-full h-full max-w-6xl rounded-3xl border border-cyan-500/40 bg-slate-950 flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-black/60 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                  {selectedDoc.courseCode}
                </span>
                <div>
                  <h2 className="text-base font-bold text-white">{selectedDoc.title}</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    Instructor: {selectedDoc.teacherName} · {selectedDoc.classroomName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Canvas Surface (Read-Only Viewer) */}
            <div className="flex-1 relative overflow-hidden">
              <SmartBoardCanvas document={selectedDoc} isReadOnly={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
