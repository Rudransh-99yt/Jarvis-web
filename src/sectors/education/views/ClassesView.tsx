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
  Radio,
  ArrowLeft,
  ChevronRight,
  Search,
  CheckCircle2
} from 'lucide-react';
import { FileUploadModal } from '../../../components/files/FileUploadModal.tsx';
import { ClassMessagingDeck } from './ClassMessagingDeck.tsx';
import type { FileRecord } from '../../../types/storage.ts';

interface ClassesViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ classes, currentRole }) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeDetailSection, setActiveDetailSection] = useState<'messages' | 'materials' | 'announcements'>('messages');
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;

  const handleDownload = (fileName: string) => {
    setDownloadedNotice(`Downloaded '${fileName}' to local session.`);
    setTimeout(() => setDownloadedNotice(null), 3500);
  };

  const filteredClasses = classes.filter((cls) => {
    return (
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.instructorName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
            Jarvis Academic · Courses & Cohorts
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Academic Courses & Syllabi
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {selectedClass
              ? `Viewing active course workspace for ${selectedClass.code}.`
              : 'Browse active enrolled cohorts, lecture materials, and syllabus outlines.'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedClassId ? (
            <button
              onClick={() => setSelectedClassId(null)}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Courses</span>
            </button>
          ) : currentRole === 'teacher' ? (
            <button
              onClick={() => {
                setDownloadedNotice('Class roster management active. Select any course to view or upload materials.');
                setTimeout(() => setDownloadedNotice(null), 3500);
              }}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <PlusCircle className="w-4 h-4 text-cyan-300" />
              <span>+ New Course Roster</span>
            </button>
          ) : null}
        </div>
      </div>

      {downloadedNotice && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{downloadedNotice}</span>
        </div>
      )}

      {/* 2. Primary Surface: Dedicated Course Workspace OR Scanable Course Index */}
      {selectedClass ? (
        /* DEDICATED COURSE WORKSPACE */
        <div className="space-y-6 animate-fade-in">
          {/* Course Summary Card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="font-bold text-cyan-300">{selectedClass.code}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{selectedClass.term}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{selectedClass.room}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {selectedClass.name}
                </h2>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-cyan-300 font-bold">{selectedClass.instructorName}</div>
                <div className="text-[11px] text-slate-500">{selectedClass.studentCount} Students Enrolled</div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              {selectedClass.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center gap-3 text-xs font-mono">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Schedule</div>
                  <div className="text-white font-bold">{selectedClass.schedule}</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center gap-3 text-xs font-mono">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Location</div>
                  <div className="text-white font-bold">{selectedClass.room}</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center gap-3 text-xs font-mono">
                <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Enrolled Cohort</div>
                  <div className="text-white font-bold">{selectedClass.studentCount} Active Cadets</div>
                </div>
              </div>
            </div>
          </div>

          {/* Course Detail Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveDetailSection('messages')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
                activeDetailSection === 'messages'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Course Comm Link</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDetailSection('materials')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
                activeDetailSection === 'materials'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Materials & Syllabi ({selectedClass.materials.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDetailSection('announcements')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
                activeDetailSection === 'announcements'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Announcements ({selectedClass.announcements.length})</span>
            </button>
          </div>

          {/* Sub-Section 1: Real-Time Messaging Deck */}
          {activeDetailSection === 'messages' && (
            <ClassMessagingDeck
              currentClass={selectedClass}
              currentRole={currentRole}
            />
          )}

          {/* Sub-Section 2: Materials & Syllabi Table */}
          {activeDetailSection === 'materials' && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  Course Documents & Formula Sheets
                </h3>
                {currentRole === 'teacher' && (
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Material</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                {selectedClass.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{mat.title}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {mat.type} · {mat.size}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(mat.title)}
                      className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors self-start sm:self-center cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Section 3: Announcements */}
          {activeDetailSection === 'announcements' && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Course Notices & Updates
              </h3>
              <div className="space-y-3">
                {selectedClass.announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">{ann.title}</span>
                      <span className="text-slate-500">{ann.date}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{ann.content}</p>
                    <div className="text-[11px] font-mono text-slate-500 pt-1">
                      Posted by {ann.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SCANABLE COURSE DIRECTORY INDEX */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Enrolled Courses ({classes.length})
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* Course Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClasses.map((cls) => {
              const units = cls.units || [];
              const totalLessons = units.reduce((acc, u) => acc + (u.lessons?.length || 0), 0);
              const completedLessons = units.reduce(
                (acc, u) => acc + (u.lessons?.filter((l) => l.isCompleted)?.length || 0),
                0
              );
              const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-900/90 transition-all cursor-pointer group space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-cyan-300 group-hover:text-cyan-200">{cls.code}</span>
                      <span className="text-slate-500">{cls.term}</span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-100 transition-colors">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {cls.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                      <div className="truncate">
                        <span className="text-slate-500">Instructor: </span>
                        <span className="text-slate-300">{cls.instructorName}</span>
                      </div>
                      <div className="text-right truncate">
                        <span className="text-slate-500">Schedule: </span>
                        <span className="text-slate-300">{cls.schedule.split(' ')[0]}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Progress</span>
                        <span className="font-bold text-cyan-300">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs font-mono">
                      <span className="text-slate-500">
                        {cls.studentCount} students · {cls.materials.length} files
                      </span>
                      <span className="text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1 font-medium">
                        <span>Open Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {selectedClass && (
        <FileUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={(file: FileRecord) => {
            setDownloadedNotice(`Uploaded '${file.originalName}' to course materials.`);
            setIsUploadOpen(false);
            setTimeout(() => setDownloadedNotice(null), 3500);
          }}
          defaultAssociations={{ classId: selectedClass.id }}
        />
      )}
    </div>
  );
};
