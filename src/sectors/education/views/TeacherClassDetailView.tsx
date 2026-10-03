import React, { useState } from 'react';
import type { EducationClass, Assignment, CourseUnit } from '../../../types/education.ts';
import {
  Layers,
  Users,
  Clock,
  Radio,
  PlusCircle,
  FileText,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { ClassMessagingDeck } from './ClassMessagingDeck.tsx';
import { FileUploadModal } from '../../../components/files/FileUploadModal.tsx';
import type { FileRecord } from '../../../types/storage.ts';

interface TeacherClassDetailViewProps {
  course: EducationClass;
  assignments: Assignment[];
  onBackToClasses: () => void;
  onOpenUnit: (unitId: string) => void;
  onOpenCreateUnitModal: () => void;
  onOpenCreateLessonModal: (unitId: string) => void;
  onNavigateTab: (tab: 'classroom' | 'videos' | 'assignments') => void;
}

export const TeacherClassDetailView: React.FC<TeacherClassDetailViewProps> = ({
  course,
  assignments,
  onBackToClasses,
  onOpenUnit,
  onOpenCreateUnitModal,
  onOpenCreateLessonModal,
  onNavigateTab
}) => {
  const [activeSection, setActiveSection] = useState<'curriculum' | 'messages' | 'roster' | 'materials'>('curriculum');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const units = course.units || [];
  const courseAssignments = assignments.filter((a) => a.classId === course.id);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToClasses}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Managed Classes</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('classroom')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Live Classroom Session
          </button>
        </div>
      </div>

      {/* Class Meta Card */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black/70 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-300 px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-500/30">
                {course.code}
              </span>
              <span className="text-xs font-mono text-cyan-400/60">{course.term} • {course.room}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">{course.name}</h1>
            <p className="text-xs sm:text-sm text-cyan-100/70 max-w-2xl mt-1">{course.description}</p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={onOpenCreateUnitModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              ADD UNIT / CHAPTER
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-cyan-500/15 text-xs font-mono">
          <div>
            <div className="text-[10px] text-cyan-400/50">SCHEDULE</div>
            <div className="text-white font-bold">{course.schedule}</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">STUDENTS ENROLLED</div>
            <div className="text-cyan-300 font-bold">{course.studentCount} Cadets Active</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">CURRICULUM UNITS</div>
            <div className="text-cyan-300 font-bold">{units.length} Chapters Published</div>
          </div>
          <div>
            <div className="text-[10px] text-cyan-400/50">ASSIGNMENTS</div>
            <div className="text-cyan-300 font-bold">{courseAssignments.length} Active</div>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          {notice}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/15 pb-2">
        <button
          onClick={() => setActiveSection('curriculum')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeSection === 'curriculum'
              ? 'border border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'border border-cyan-500/15 bg-black/40 text-cyan-400/70 hover:text-cyan-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Curriculum & Lessons ({units.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('messages')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeSection === 'messages'
              ? 'border border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'border border-cyan-500/15 bg-black/40 text-cyan-400/70 hover:text-cyan-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Class Comm Link</span>
        </button>

        <button
          onClick={() => setActiveSection('roster')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeSection === 'roster'
              ? 'border border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'border border-cyan-500/15 bg-black/40 text-cyan-400/70 hover:text-cyan-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Cadet Roster ({course.studentCount})</span>
        </button>

        <button
          onClick={() => setActiveSection('materials')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
            activeSection === 'materials'
              ? 'border border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'border border-cyan-500/15 bg-black/40 text-cyan-400/70 hover:text-cyan-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Course Materials ({course.materials?.length || 0})</span>
        </button>
      </div>

      {/* Section 1: Curriculum Management & Units */}
      {activeSection === 'curriculum' && (
        <div className="space-y-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300">UNIT {unit.number}</span>
                    <span className="text-xs font-mono text-cyan-400/50">• {unit.lessons?.length || 0} Lessons</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">{unit.title}</h3>
                  <p className="text-xs text-cyan-100/60 mt-0.5">{unit.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onOpenCreateLessonModal(unit.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    + Add Topic
                  </button>
                </div>
              </div>

              {/* Lessons List in Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {unit.lessons?.map((les) => (
                  <div
                    key={les.id}
                    className="p-3 rounded-lg border border-cyan-500/10 bg-black/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-white truncate">
                        {unit.number}.{les.number}: {les.title}
                      </div>
                      <div className="text-[10px] text-cyan-400/60 font-mono">
                        {les.durationMinutes} mins {les.videoId && '• Video Attached'}
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenUnit(unit.id)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-200 p-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {units.length === 0 && (
            <div className="p-8 rounded-xl border border-cyan-500/20 bg-black/30 text-center space-y-3">
              <Layers className="w-8 h-8 text-cyan-400/50 mx-auto" />
              <div className="text-sm font-bold text-white font-mono">No Curriculum Units Created Yet</div>
              <p className="text-xs text-cyan-100/60 max-w-md mx-auto">
                Build your course hierarchy by creating chapters and adding lesson topics with attached videos and notes.
              </p>
              <button
                onClick={onOpenCreateUnitModal}
                className="px-4 py-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                + Create First Unit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Real-time Messaging Deck */}
      {activeSection === 'messages' && (
        <ClassMessagingDeck
          currentClass={course}
          currentRole="teacher"
          workspaceId="ws-stark-core"
        />
      )}

      {/* Section 3: Cadet Roster */}
      {activeSection === 'roster' && (
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Enrolled Cadet Roster ({course.studentCount})
            </h3>
            <span className="text-xs font-mono text-cyan-400/60">Cohort: Fall 2026</span>
          </div>

          <div className="space-y-2.5">
            {course.studentIds.map((sid, idx) => (
              <div
                key={sid}
                className="p-3.5 rounded-lg border border-cyan-500/15 bg-black/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center font-mono text-cyan-300 text-xs font-bold">
                    {idx === 0 ? 'AC' : 'ML'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white font-mono">
                      {idx === 0 ? 'Alex Chen' : 'Maya Lin'}
                    </div>
                    <div className="text-[10px] text-cyan-400/50 font-mono">
                      ID: {sid} • Department: Applied Physics
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Active & Enrolled
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Course Materials */}
      {activeSection === 'materials' && (
        <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
              Course Syllabi & Lecture Notes ({course.materials?.length || 0})
            </h3>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Material
            </button>
          </div>

          <div className="space-y-2.5">
            {course.materials?.map((mat) => (
              <div
                key={mat.id}
                className="p-3.5 rounded-lg border border-cyan-500/10 bg-black/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-mono font-bold text-white">{mat.title}</div>
                    <div className="text-[10px] text-cyan-400/60 font-mono">Size: {mat.size} • Uploaded: {mat.uploadedAt}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(fileRecord: FileRecord) => {
          course.materials.push({
            id: fileRecord.id,
            title: fileRecord.originalName,
            type: fileRecord.extension === 'pdf' ? 'pdf' : 'notes',
            url: `/api/files/${fileRecord.id}/download`,
            uploadedAt: 'Just now',
            size: `${(fileRecord.sizeBytes / 1024).toFixed(1)} KB`
          });
          setNotice(`Uploaded '${fileRecord.originalName}' to course materials.`);
          setTimeout(() => setNotice(null), 3500);
        }}
        workspaceId="ws-stark-core"
        defaultAssociations={{ classId: course.id }}
        title={`Upload Material for ${course.code}`}
        description="Attach PDFs, notes, or reference problem sets to this syllabus."
      />
    </div>
  );
};
