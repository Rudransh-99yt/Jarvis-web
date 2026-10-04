import React, { useState } from 'react';
import type { EducationRole, AcademicInstitution, EducationClass } from '../../../types/education.ts';
import {
  Home,
  Layers,
  BookOpen,
  FileCheck2,
  Calendar,
  Flame,
  MessageSquare,
  FileText,
  Brain,
  Video,
  Radio,
  Building2,
  ChevronDown,
  GraduationCap,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  X,
  Plus,
  User,
  LogOut,
  Settings,
  ShieldCheck,
  Timer
} from 'lucide-react';

export type EducationSidebarSection =
  | 'home'
  | 'my_learning'
  | 'classes'
  | 'assignments'
  | 'calendar'
  | 'focus'
  | 'workspace'
  | 'community'
  | 'knowledge'
  | 'videos'
  | 'classroom'
  | 'principal_overview'
  | 'teacher_prep';

interface EducationSidebarProps {
  currentRole: EducationRole;
  onChangeRole: (role: EducationRole) => void;
  activeSection: EducationSidebarSection;
  onSelectSection: (section: EducationSidebarSection) => void;
  activeCourseId?: string;
  onSelectCourse: (courseId: string) => void;
  classes: EducationClass[];
  institution?: AcademicInstitution;
  isSyncing: boolean;
  onRefresh: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const EducationSidebar: React.FC<EducationSidebarProps> = ({
  currentRole,
  onChangeRole,
  activeSection,
  onSelectSection,
  activeCourseId,
  onSelectCourse,
  classes,
  institution,
  isSyncing,
  onRefresh,
  isOpenMobile,
  onCloseMobile
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const roles: Array<{ id: EducationRole; label: string; name: string; icon: any; color: string; department: string }> = [
    { id: 'student', label: 'Student', name: 'Alex Mercer', icon: GraduationCap, color: 'text-cyan-400', department: 'Class 12 Physics' },
    { id: 'teacher', label: 'Instructor', name: 'Dr. Helen Cho', icon: BookOpen, color: 'text-blue-400', department: 'Faculty of Physics' },
    { id: 'principal', label: 'Principal / Dean', name: 'Dean Stark', icon: ShieldAlert, color: 'text-amber-400', department: 'Academic Directorate' }
  ];

  const currentRoleObj = roles.find((r) => r.id === currentRole) || roles[0];

  const handleNavClick = (section: EducationSidebarSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const handleCourseClick = (courseId: string) => {
    onSelectCourse(courseId);
    onCloseMobile();
  };

  const renderNavButton = (
    id: EducationSidebarSection,
    label: string,
    Icon: any,
    badge?: string | number,
    isPulse?: boolean
  ) => {
    const isActive = activeSection === id;
    return (
      <button
        key={id}
        onClick={() => handleNavClick(id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all text-left group cursor-pointer ${
          isActive
            ? 'bg-cyan-500/15 text-white font-bold border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
            : 'text-cyan-300/70 hover:text-white hover:bg-cyan-500/10'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive ? 'text-cyan-300' : 'text-cyan-400/60 group-hover:text-cyan-300'
            } ${isPulse ? 'animate-pulse text-emerald-400' : ''}`}
          />
          <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
              isActive ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40' : 'text-cyan-400/50'
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#080d16]/95 border-r border-cyan-500/20 text-cyan-100 select-none">
      {/* 1. Top-Left Profile & Identity Switcher */}
      <div className="p-3.5 border-b border-cyan-500/15 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold text-white truncate">
                {institution?.name || 'Stark Academy'}
              </div>
              <div className="text-[9px] font-mono text-cyan-400/50 truncate">
                {institution?.currentAcademicYear || '2026–2027'} · Education OS
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              title="Sync Academic State"
              className="p-1 rounded hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 rounded hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Polished User Profile & Role Dropdown Card */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl border border-cyan-500/25 bg-black/60 hover:border-cyan-400/50 hover:bg-cyan-950/30 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-cyan-900/80 border border-cyan-400/40 flex items-center justify-center font-bold text-cyan-200 text-xs shrink-0">
                {currentRoleObj.name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold text-white truncate">
                  {currentRoleObj.name}
                </div>
                <div className="text-[10px] font-mono text-cyan-400/70 flex items-center gap-1 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{currentRoleObj.label}</span>
                </div>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-cyan-400/60 shrink-0 ml-1 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-cyan-500/30 bg-slate-950/98 backdrop-blur-xl shadow-2xl p-2 z-50 animate-fade-in space-y-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/10 space-y-0.5">
                <div className="text-[10px] text-cyan-400/50 uppercase">Active School</div>
                <div className="font-bold text-white">{institution?.name || 'Stark Academy'}</div>
                <div className="text-[10px] text-cyan-300">{currentRoleObj.department}</div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-cyan-400/60 px-1">
                  Switch Authorized Context
                </div>
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isCurrent = r.id === currentRole;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        onChangeRole(r.id);
                        setProfileDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500/20 text-white font-bold border border-cyan-400/40'
                          : 'text-cyan-300/80 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{r.name}</div>
                        <div className="text-[9px] text-cyan-400/60">{r.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1 border-t border-cyan-500/15 flex items-center justify-between text-[11px] text-cyan-400/70 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Authenticated</span>
                </span>
                <span className="text-[10px] text-cyan-500">v2.4 Pro</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Scrollable Navigation Hierarchy */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {/* Primary Workspace Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/50 px-3 mb-1.5">
            {currentRole === 'student' ? 'Primary' : currentRole === 'teacher' ? 'Faculty Command' : 'Executive'}
          </div>

          {currentRole === 'student' && (
            <>
              {renderNavButton('home', 'Home', Home)}
              {renderNavButton('my_learning', 'My Learning', Layers)}
              {renderNavButton('classes', 'Classes & Cohorts', BookOpen, classes.length)}
              {renderNavButton('assignments', 'Assignments', FileCheck2, '3 due')}
              {renderNavButton('calendar', 'Academic Calendar', Calendar)}
            </>
          )}

          {currentRole === 'teacher' && (
            <>
              {renderNavButton('home', 'Teaching Hub', Home)}
              {renderNavButton('teacher_prep', 'AI Session Prep', Sparkles, 'AI')}
              {renderNavButton('classes', 'Managed Classes', BookOpen, classes.length)}
              {renderNavButton('assignments', 'Assignments & Grading', FileCheck2, '2 pending')}
              {renderNavButton('calendar', 'Class Schedule', Calendar)}
            </>
          )}

          {currentRole === 'principal' && (
            <>
              {renderNavButton('principal_overview', 'Executive Overview', ShieldAlert)}
              {renderNavButton('teacher_prep', 'Lesson Prep Hub', Sparkles)}
              {renderNavButton('classes', 'All School Classes', BookOpen, classes.length)}
              {renderNavButton('assignments', 'Assessment Health', FileCheck2)}
              {renderNavButton('calendar', 'Institution Calendar', Calendar)}
            </>
          )}
        </div>

        {/* Productivity & Community Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/50 px-3 mb-1.5">
            Productivity & Network
          </div>

          {renderNavButton('focus', 'Focus OS / Pomodoro', Timer, 'Lock')}
          {renderNavButton('workspace', 'My Workspace', FileText, 'Notion')}
          {renderNavButton('community', 'Academic Community', MessageSquare, 'Live')}
        </div>

        {/* Research & Media Tools */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/50 px-3 mb-1.5">
            Knowledge & Facilities
          </div>

          {renderNavButton('knowledge', 'Knowledge Spaces (RAG)', Brain)}
          {renderNavButton('videos', 'Video Library', Video)}
          {renderNavButton('classroom', 'Smart Classroom', Radio, 'Live', true)}
        </div>

        {/* Course Directory Quick Access */}
        <div className="space-y-1 pt-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/50 px-3 mb-1.5 flex items-center justify-between">
            <span>Enrolled Courses</span>
            <span className="text-[9px] text-cyan-400/60 font-mono">{classes.length}</span>
          </div>

          <div className="space-y-0.5">
            {classes.map((cls) => {
              const isSelectedCourse = cls.id === activeCourseId;
              return (
                <button
                  key={cls.id}
                  onClick={() => handleCourseClick(cls.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono transition-all text-left group cursor-pointer ${
                    isSelectedCourse
                      ? 'bg-cyan-500/20 text-cyan-200 font-bold border border-cyan-400/30'
                      : 'text-cyan-300/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 group-hover:bg-cyan-300 shrink-0" />
                    <span className="truncate">{cls.code}</span>
                  </div>
                  <span className="text-[10px] text-cyan-400/50 font-mono shrink-0">
                    {cls.units?.length || 0} units
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Fixed width 260px) */}
      <aside className="hidden lg:block w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
