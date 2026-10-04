import React, { useState } from 'react';
import type { EducationClass, EducationRole } from '../../../types/education.ts';
import {
  Users,
  Calendar,
  MapPin,
  FileText,
  Download,
  Bell,
  PlusCircle,
  UploadCloud,
  Radio,
  ArrowLeft,
  ChevronRight,
  Search,
  BookOpen,
  MessageSquare,
  Shield,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { FileUploadModal } from '../../../components/files/FileUploadModal.tsx';
import { ClassMessagingDeck } from './ClassMessagingDeck.tsx';
import type { FileRecord } from '../../../types/storage.ts';

interface ClassesViewProps {
  classes: EducationClass[];
  currentRole: EducationRole;
  onNavigateWithContext?: (view: string, context?: any) => void;
  onOpenCourse?: (courseId: string) => void;
  onLaunchClassroom?: (classId: string) => void;
}

interface Classmate {
  id: string;
  name: string;
  role: 'Student' | 'TA' | 'Instructor';
  avatarInitials: string;
  status: 'online' | 'in_study' | 'offline';
  specialty?: string;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  currentRole,
  onNavigateWithContext,
  onOpenCourse,
  onLaunchClassroom
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'messages' | 'announcements' | 'materials'>('roster');
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

  // Mock roster data representing cohort members
  const mockRoster: Classmate[] = [
    {
      id: 'usr-prof',
      name: selectedClass?.instructorName || 'Dr. Helen Cho',
      role: 'Instructor',
      avatarInitials: 'HC',
      status: 'online',
      specialty: 'Faculty Lead'
    },
    {
      id: 'usr-ta-1',
      name: 'Samantha Raye',
      role: 'TA',
      avatarInitials: 'SR',
      status: 'online',
      specialty: 'Lab Head & Office Hours'
    },
    {
      id: 'student-1',
      name: 'Alex Chen (You)',
      role: 'Student',
      avatarInitials: 'AC',
      status: 'online',
      specialty: 'Cadet First Class'
    },
    {
      id: 'usr-stu-2',
      name: 'Marcus Vance',
      role: 'Student',
      avatarInitials: 'MV',
      status: 'in_study',
      specialty: 'Study Group Lead'
    },
    {
      id: 'usr-stu-3',
      name: 'Elena Rostova',
      role: 'Student',
      avatarInitials: 'ER',
      status: 'offline',
      specialty: 'Peer Reviewer'
    },
    {
      id: 'usr-stu-4',
      name: 'David Okafor',
      role: 'Student',
      avatarInitials: 'DO',
      status: 'online',
      specialty: 'Theory Notes'
    },
    {
      id: 'usr-stu-5',
      name: 'Priya Patel',
      role: 'Student',
      avatarInitials: 'PP',
      status: 'offline',
      specialty: 'Computational Physics'
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="space-y-1">
          <div className="text-xs font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Academic Social & Organizational Unit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {selectedClass ? `${selectedClass.code} · Cohort Workspace` : 'Classes & Cohorts'}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {selectedClass
              ? `Cohort roster, live sessions, announcements, and communications for ${selectedClass.name}.`
              : 'Classes represent enrolled people, faculty, schedules, and live sessions. Courses represent the academic curriculum.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {selectedClass ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (onLaunchClassroom) {
                    onLaunchClassroom(selectedClass.id);
                  } else if (onNavigateWithContext) {
                    onNavigateWithContext('classroom', { classId: selectedClass.id });
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Launch Classroom</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onOpenCourse) {
                    onOpenCourse(selectedClass.id);
                  } else if (onNavigateWithContext) {
                    onNavigateWithContext('subject_detail', { classId: selectedClass.id });
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono transition-all cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Curriculum & Lessons</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedClassId(null)}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Cohorts</span>
              </button>
            </>
          ) : currentRole === 'teacher' ? (
            <button
              type="button"
              onClick={() => {
                setDownloadedNotice('Class roster management active. Select any course to view or upload materials.');
                setTimeout(() => setDownloadedNotice(null), 3500);
              }}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
            >
              <PlusCircle className="w-4 h-4 text-cyan-300" />
              <span>+ New Cohort</span>
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

      {/* 2. Main Content Surface */}
      {selectedClass ? (
        /* DEDICATED CLASS COHORT WORKSPACE */
        <div className="space-y-6 animate-fade-in">
          {/* Class Cohort Header & Metadata */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 font-bold text-cyan-300">
                    Cohort {selectedClass.code}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{selectedClass.term}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400">{selectedClass.room}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {selectedClass.name}
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed pt-1">
                  {selectedClass.description}
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end gap-3 text-right font-mono shrink-0">
                <div>
                  <div className="text-xs text-cyan-300 font-bold">{selectedClass.instructorName}</div>
                  <div className="text-[11px] text-slate-500">{selectedClass.studentCount} Cadets Enrolled</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenCourse) {
                      onOpenCourse(selectedClass.id);
                    } else if (onNavigateWithContext) {
                      onNavigateWithContext('subject_detail', { classId: selectedClass.id });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View Curriculum Syllabus →</span>
                </button>
              </div>
            </div>

            {/* Quick Cohort Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-3 text-xs font-mono">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Meeting Schedule</div>
                  <div className="text-white font-bold">{selectedClass.schedule}</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-3 text-xs font-mono">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Room / Hall</div>
                  <div className="text-white font-bold">{selectedClass.room}</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-3 text-xs font-mono">
                <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Active Cohort Roster</div>
                  <div className="text-white font-bold">{selectedClass.studentCount} Cadets · 2 Faculty</div>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Tab Bar */}
          <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Classmates & Roster ({mockRoster.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cohort Channel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
                activeTab === 'announcements'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-cyan-400" />
              <span>Announcements ({selectedClass.announcements.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-lg transition-colors cursor-pointer ${
                activeTab === 'materials'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Course Materials ({selectedClass.materials.length})</span>
            </button>
          </div>

          {/* TAB 1: Classmates & Roster */}
          {activeTab === 'roster' && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    Enrolled Cadets & Teaching Staff
                  </h3>
                  <p className="text-xs text-slate-400">
                    Official cohort directory for collaborative study, lab partners, and peer support.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                {mockRoster.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-cyan-300">
                          {member.avatarInitials}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                            member.status === 'online'
                              ? 'bg-emerald-400'
                              : member.status === 'in_study'
                              ? 'bg-purple-400'
                              : 'bg-slate-600'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{member.name}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              member.role === 'Instructor'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : member.role === 'TA'
                                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-slate-500">
                          {member.specialty} · {member.status === 'online' ? 'Online Now' : member.status === 'in_study' ? 'In Deep Focus' : 'Offline'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('messages')}
                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Cohort Channel */}
          {activeTab === 'messages' && (
            <ClassMessagingDeck
              currentClass={selectedClass}
              currentRole={currentRole}
            />
          )}

          {/* TAB 3: Announcements */}
          {activeTab === 'announcements' && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Official Announcements & Broadcasts
              </h3>
              <div className="space-y-3">
                {selectedClass.announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white text-sm">{ann.title}</span>
                      <span className="text-slate-500">{ann.date}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{ann.content}</p>
                    <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-850">
                      Broadcasted by {ann.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Materials */}
          {activeTab === 'materials' && (
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Handouts, Formula Sheets & Syllabi
                  </h3>
                  <p className="text-xs text-slate-400">
                    Shared course files distributed for this cohort.
                  </p>
                </div>
                {currentRole === 'teacher' && (
                  <button
                    type="button"
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
                      type="button"
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
        </div>
      ) : (
        /* SCANABLE COHORT DIRECTORY */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Enrolled Class Cohorts ({classes.length})
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search classes or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClasses.map((cls) => {
              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-900/90 transition-all cursor-pointer group space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 font-bold text-cyan-300">
                        {cls.code}
                      </span>
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
                        <span className="text-slate-500">Room: </span>
                        <span className="text-slate-300">{cls.room}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs font-mono">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {cls.studentCount} cadets enrolled
                      </span>
                      <span className="text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1 font-medium">
                        <span>Cohort Roster & Details</span>
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
