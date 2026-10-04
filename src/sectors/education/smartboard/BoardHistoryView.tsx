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
  Filter
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
  const [selectedDoc, setSelectedDoc] = useState<BoardDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isTeacher = currentRole === 'teacher';

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl border border-cyan-500/20 bg-slate-950/80 backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5" />
            <span>SmartBoard Archive · Board History</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {isTeacher ? 'Delivered Board Notes & Sessions' : 'Classroom Board History'}
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            {isTeacher
              ? 'Access, review, and release structured board documents and formulas taught across lectures.'
              : 'Browse verified classroom board notes, derivations, and worked examples released by your instructors.'}
          </p>
        </div>

        {/* Course Filter */}
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

      {/* 2. Documents Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Loading board history documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-950/50 space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300 font-mono">No Board History Found</h3>
          <p className="text-xs text-slate-500 font-sans max-w-sm mx-auto">
            {isTeacher
              ? 'Complete a SmartBoard class session to archive and release board notes here.'
              : 'Your instructor has not yet released any board documents for this course.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const formulaCount = doc.pages.reduce(
              (acc, p) => acc + p.elements.filter((e) => e.semanticTag === 'formula').length,
              0
            );
            const totalElements = doc.pages.reduce((acc, p) => acc + p.elements.length, 0);

            return (
              <div
                key={doc.id}
                className="p-5 rounded-3xl border border-slate-800 bg-slate-950/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-cyan-300">{doc.courseCode}</span>
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

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(doc.timestamps.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>

                  <button
                    onClick={() => {
                      if (onSelectDocument) {
                        onSelectDocument(doc);
                      } else {
                        setSelectedDoc(doc);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Notes</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Full-Screen Interactive Document Viewer Modal */}
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
