import React, { useState } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import {
  BookOpen,
  Calendar,
  MapPin,
  Users,
  FileText,
  Download,
  Bell,
  PlusCircle,
  UploadCloud,
  MessageSquare,
  Radio
} from 'lucide-react';
import { FileUploadModal } from '../../../components/files/FileUploadModal.tsx';
import { ClassMessagingDeck } from './ClassMessagingDeck.tsx';
import type { FileRecord } from '../../../types/storage.ts';

interface ClassesViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ classes, currentRole }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [activeDetailSection, setActiveDetailSection] = useState<'messages' | 'materials' | 'announcements'>('messages');
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const handleDownload = (fileName: string) => {
    setDownloadedNotice(`Downloaded '${fileName}' to local session.`);
    setTimeout(() => setDownloadedNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-cyan-500/20 bg-black/40 p-4 rounded-xl backdrop-blur-md">
        <div>
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase mb-1">
            Jarvis Academic · Classes & Syllabi
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Academic Courses & Course Materials
          </h1>
        </div>

        {currentRole === 'teacher' && (
          <button
            onClick={() => {
              setDownloadedNotice('Class roster management active. Select any course to view or upload materials.');
              setTimeout(() => setDownloadedNotice(null), 3500);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono tracking-wider transition-all self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            + New Course Roster
          </button>
        )}
      </div>

      {downloadedNotice && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          {downloadedNotice}
        </div>
      )}

      {/* Main Grid: Class Selector & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column (4 cols): Course List */}
        <div className="space-y-3 lg:col-span-4 min-w-0">
          <h2 className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase px-1">
            Available Courses ({classes.length})
          </h2>

          {classes.map((cls) => {
            const isSelected = cls.id === selectedClassId;

            return (
              <div
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-gradient-to-r from-cyan-950/50 to-black/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-cyan-500/15 bg-black/30 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold font-mono text-cyan-300">{cls.code}</span>
                  <span className="text-[10px] font-mono text-cyan-400/60">{cls.term}</span>
                </div>
                <h3 className="text-sm font-semibold text-white">{cls.name}</h3>
                <div className="text-xs text-cyan-100/60 mt-1">{cls.instructorName}</div>
                <div className="pt-2 mt-2 border-t border-cyan-500/10 flex items-center justify-between text-[11px] font-mono text-cyan-400/70">
                  <span>{cls.studentCount} Students</span>
                  <span>{cls.materialsCount} Materials</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column (8 cols): Selected Course Detail */}
        {selectedClass && (
          <div className="space-y-6 lg:col-span-8 min-w-0">
            {/* Course Summary Card */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/10 pb-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{selectedClass.code}</span>
                  <h2 className="text-xl font-bold text-white mt-0.5">{selectedClass.name}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-cyan-300 font-bold">{selectedClass.instructorName}</span>
                  <div className="text-[11px] text-cyan-400/50 font-mono">{selectedClass.term}</div>
                </div>
              </div>

              <p className="text-sm text-cyan-100/80 leading-relaxed">
                {selectedClass.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-cyan-500/10 bg-cyan-950/20 flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="text-xs font-mono">
                    <div className="text-cyan-400/60 text-[10px]">SCHEDULE</div>
                    <div className="text-white font-bold text-[11px]">{selectedClass.schedule}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-cyan-500/10 bg-cyan-950/20 flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="text-xs font-mono">
                    <div className="text-cyan-400/60 text-[10px]">LOCATION</div>
                    <div className="text-white font-bold text-[11px]">{selectedClass.room}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-cyan-500/10 bg-cyan-950/20 flex items-center gap-3">
                  <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="text-xs font-mono">
                    <div className="text-cyan-400/60 text-[10px]">ENROLLMENT</div>
                    <div className="text-white font-bold text-[11px]">{selectedClass.studentCount} Students Active</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Sub-Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-cyan-500/20 pb-2">
              <button
                type="button"
                onClick={() => setActiveDetailSection('messages')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeDetailSection === 'messages'
                    ? 'border border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border border-cyan-500/20 bg-black/40 text-cyan-400 hover:border-cyan-500/40 hover:text-cyan-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                <span className="font-bold">Course Comm Link (M11)</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailSection('materials')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeDetailSection === 'materials'
                    ? 'border border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border border-cyan-500/20 bg-black/40 text-cyan-400 hover:border-cyan-500/40 hover:text-cyan-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Materials & Syllabi ({selectedClass.materials.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailSection('announcements')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeDetailSection === 'announcements'
                    ? 'border border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border border-cyan-500/20 bg-black/40 text-cyan-400 hover:border-cyan-500/40 hover:text-cyan-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Announcements ({selectedClass.announcements.length})</span>
              </button>
            </div>

            {/* Section 1: Real-Time Messaging Deck (Milestone 11) */}
            {activeDetailSection === 'messages' && (
              <ClassMessagingDeck
                currentClass={selectedClass}
                currentRole={currentRole}
                workspaceId="ws-stark-core"
              />
            )}

            {/* Section 2: Announcements Feed */}
            {activeDetailSection === 'announcements' && (
              <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                    Class Announcements ({selectedClass.announcements.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {selectedClass.announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-4 rounded-lg border border-cyan-500/15 bg-black/30 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-white">{ann.title}</span>
                        <span className="text-cyan-400/60">{ann.date}</span>
                      </div>
                      <p className="text-xs text-cyan-100/70">{ann.content}</p>
                      <div className="text-[10px] font-mono text-cyan-400/40 pt-1">— Posted by {ann.author}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Course Materials & Syllabi */}
            {activeDetailSection === 'materials' && (
              <div className="p-5 rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                      Course Documents & Lecture Materials ({selectedClass.materials.length})
                    </h3>
                  </div>

                  {currentRole === 'teacher' && (
                    <button
                      onClick={() => setIsUploadOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Upload Material
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {selectedClass.materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-3.5 rounded-lg border border-cyan-500/10 bg-black/30 hover:border-cyan-500/30 transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white font-mono">{mat.title}</div>
                          <div className="text-[10px] text-cyan-400/60 font-mono">
                            Size: {mat.size} • Uploaded: {mat.uploadedAt}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(mat.title)}
                        className="px-3 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* File Upload Modal for Teachers */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(fileRecord: FileRecord) => {
          selectedClass.materials.push({
            id: fileRecord.id,
            title: fileRecord.originalName,
            type: fileRecord.extension === 'pdf' ? 'pdf' : 'notes',
            url: `/api/files/${fileRecord.id}/download`,
            uploadedAt: 'Just now',
            size: `${(fileRecord.sizeBytes / 1024).toFixed(1)} KB`
          });
          setDownloadedNotice(`Uploaded '${fileRecord.originalName}' to ${selectedClass.name}.`);
          setTimeout(() => setDownloadedNotice(null), 4000);
        }}
        workspaceId="ws-stark-core"
        defaultAssociations={{ classId: selectedClass?.id }}
        title={`Upload Material for ${selectedClass?.code || 'Course'}`}
        description="Attach PDFs, lecture notes, or reference worksheets to this course syllabus."
      />
    </div>
  );
};
