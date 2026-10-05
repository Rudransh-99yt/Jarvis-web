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
  Timer,
  Users,
  Bookmark,
  Trophy,
  AlertTriangle,
  FileSpreadsheet,
  Heart,
  Tv
} from 'lucide-react';

import { can } from '../../../services/authClient.ts';

export type EducationSidebarSection =
  | 'home'
  | 'my_learning'
  | 'classes'
  | 'assignments'
  | 'calendar'
  | 'engagement'
  | 'focus'
  | 'workspace'
  | 'community'
  | 'study_groups'
  | 'notes'
  | 'knowledge'
  | 'videos'
  | 'classroom'
  | 'smartboard_os'
  | 'board_history'
  | 'principal_overview'
  | 'principal_grade'
  | 'principal_teachers'
  | 'principal_audit'
  | 'teacher_prep'
  | 'teacher_review'
  | 'teacher_attention'
  | 'teacher_post_class_review';

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
    { id: 'student', label: 'Student', name: 'Alex Chen', icon: GraduationCap, color: 'text-cyan-400', department: 'Class 12 Physics' },
    { id: 'teacher', label: 'Instructor', name: 'Dr. Sarah', icon: BookOpen, color: 'text-blue-400', department: 'Faculty of Physics' },
    { id: 'principal', label: 'Principal / Dean', name: 'Dean Alistair Vance', icon: ShieldAlert, color: 'text-amber-400', department: 'Academic Directorate' },
    { id: 'parent', label: 'Parent / Family', name: 'Maria Chen', icon: Heart, color: 'text-rose-400', department: 'Family & Guardian Council' }
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
        className={`w-full flex items-center justify-between px-3 py-2.5 min-h-[40px] rounded-xl text-xs font-mono transition-all text-left group cursor-pointer ${
          isActive
            ? 'bg-slate-800/90 text-white font-semibold border border-cyan-500/40 shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
            } ${isPulse ? 'animate-pulse text-emerald-400' : ''}`}
          />
          <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && (
          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            {badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 text-slate-200 select-none">
      {/* 1. Top-Left Profile & Identity Switcher */}
      <div className="p-3.5 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold text-white truncate">
                {institution?.name || 'Stark Academy'}
              </div>
              <div className="text-[9px] font-mono text-slate-400 truncate">
                {institution?.currentAcademicYear || '2026–2027'} · Education OS
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              title="Sync Academic State"
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Polished User Profile & Role Dropdown Card */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 min-h-[44px] rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-300 text-xs shrink-0">
                {currentRoleObj.name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-mono font-bold text-white truncate">
                  {currentRoleObj.name}
                </div>
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{currentRoleObj.label}</span>
                </div>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 shrink-0 ml-1 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-cyan-500/30 bg-slate-950/98 backdrop-blur-xl shadow-2xl p-2 z-50 animate-fade-in space-y-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-black/40 border border-cyan-500/10 space-y-0.5">
                <div className="text-[10px] text-cyan-400/50 uppercase">Active School</div>
                <div className="font-bold text-white">{institution?.name || 'Stark Academy'}</div>
                <div className="text-[10px] text-cyan-300">{currentRoleObj.department}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-cyan-400/60 px-1">
                  <span>Switch Persona</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">DEV ONLY</span>
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
                  <span>Server Verified</span>
                </span>
                <span className="text-[10px] text-cyan-500">RBAC Claims</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Scrollable Navigation Hierarchy */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
        {/* Role-Specific Primary Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 mb-1.5 font-semibold">
            {can('principal.institution.view') ? 'Institution' :
             can('teacher.classes.manage') ? 'Teach' :
             can('parent.family_intelligence.view') ? 'Family' : 'Learn'}
          </div>

          {/* Student Hub Workflows */}
          {can('student.learning.view') && !can('teacher.classes.manage') && !can('principal.institution.view') && !can('parent.family_intelligence.view') && (
            <>
              {renderNavButton('home', 'Home', Home)}
              {renderNavButton('my_learning', 'My Learning', Layers)}
              {renderNavButton('classes', 'Classes & Cohorts', BookOpen, classes.length)}
              {renderNavButton('assignments', 'Assignments', FileCheck2, '3 due')}
              {renderNavButton('calendar', 'Academic Calendar', Calendar)}
              {renderNavButton('engagement', 'Standings & Consistency', Trophy, 'Rank #5')}
            </>
          )}

          {/* Teacher Hub Workflows */}
          {can('teacher.classes.manage') && (
            <>
              {renderNavButton('home', 'Command Center', Home)}
              {renderNavButton('teacher_review', 'Review Queue', FileSpreadsheet, '2 pending')}
              {renderNavButton('teacher_attention', 'Needs Attention', AlertTriangle, '4 signals')}
              {renderNavButton('teacher_prep', 'Session Prep', Sparkles)}
              {renderNavButton('teacher_post_class_review', 'Post-Class Review', FileCheck2)}
              {renderNavButton('classes', 'Managed Classes', BookOpen, classes.length)}
              {renderNavButton('assignments', 'Assignments', FileCheck2)}
              {renderNavButton('calendar', 'Schedule', Calendar)}
            </>
          )}

          {/* Principal Executive Workflows */}
          {can('principal.institution.view') && (
            <>
              {renderNavButton('principal_overview', 'Executive Overview', ShieldAlert)}
              {renderNavButton('principal_grade', 'Grade Intelligence', Layers)}
              {renderNavButton('principal_teachers', 'Faculty Intelligence', Users)}
              {renderNavButton('principal_audit', 'Interventions & Audit', ShieldCheck)}
              {renderNavButton('classes', 'All School Classes', BookOpen, classes.length)}
              {renderNavButton('calendar', 'Institutional Calendar', Calendar)}
            </>
          )}

          {/* Parent Family Workflows */}
          {can('parent.family_intelligence.view') && (
            <>
              {renderNavButton('home', 'Family Portal', Heart)}
              {renderNavButton('calendar', 'School Calendar', Calendar)}
              {renderNavButton('community', 'School Updates', MessageSquare)}
            </>
          )}
        </div>

        {/* FOCUS & WORKSPACE Section — Strictly Student-Only */}
        {can('student.focus.manage') && !can('principal.institution.view') && !can('parent.family_intelligence.view') && (
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 mb-1.5 font-semibold">
              Focus & Workspace
            </div>

            {renderNavButton('focus', 'Focus Room', Timer)}
            {renderNavButton('workspace', 'My Workspace', FileText)}
          </div>
        )}

        {/* CONNECT Section */}
        {(can('student.community.view') || can('teacher.community.moderate') || can('parent.community.view')) && (
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 mb-1.5 font-semibold">
              Connect
            </div>

            {renderNavButton('community', 'Community', MessageSquare)}
            {can('student.community.participate') && renderNavButton('study_groups', 'Study Groups', Users)}
          </div>
        )}

        {/* KNOWLEDGE & SMART SURFACES Section — Only for Student & Teacher */}
        {(can('student.learning.view') || can('teacher.smartboard.control') || can('teacher.curriculum.manage')) &&
         !can('parent.family_intelligence.view') && !can('principal.institution.view') && (
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 mb-1.5 font-semibold">
              Knowledge & Smart Surfaces
            </div>

            {can('student.learning.view') && renderNavButton('notes', 'Notes & Formulas', Bookmark)}
            {can('student.smartboard.view_released') && renderNavButton('board_history', 'Board History', FileCheck2)}
            {can('teacher.smartboard.control') && renderNavButton('smartboard_os', 'SmartBoard OS', Tv)}
            {can('teacher.smartboard.control') && renderNavButton('board_history', 'Board Archive', FileCheck2)}
            {(can('student.learning.view') || can('teacher.curriculum.manage')) && renderNavButton('knowledge', 'Knowledge Spaces', Brain)}
            {(can('student.videos.view') || can('teacher.videos.manage')) && renderNavButton('videos', 'Video Library', Video)}
            {(can('student.classroom.participate') || can('teacher.classroom.host')) && renderNavButton('classroom', 'Smart Classroom', Radio)}
          </div>
        )}

        {/* Course Directory Quick Access — Scoped strictly to Students and Instructors */}
        {(can('student.learning.view') || can('teacher.classes.manage')) &&
         !can('parent.family_intelligence.view') && !can('principal.institution.view') && (
          <div className="space-y-1 pt-1 border-t border-slate-800/80">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 mb-1.5 flex items-center justify-between font-semibold">
              <span>{can('teacher.classes.manage') ? 'Assigned Courses' : 'Enrolled Courses'}</span>
              <span className="text-[9px] text-slate-500 font-mono">{classes.length}</span>
            </div>

            <div className="space-y-0.5">
              {classes.map((cls) => {
                const isSelectedCourse = cls.id === activeCourseId;
                return (
                  <button
                    key={cls.id}
                    onClick={() => handleCourseClick(cls.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 min-h-[38px] rounded-lg text-xs font-mono transition-all text-left group cursor-pointer ${
                      isSelectedCourse
                        ? 'bg-slate-800 text-white font-bold border border-slate-700'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80 group-hover:bg-cyan-300 shrink-0" />
                      <span className="truncate">{cls.code}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                      {cls.units?.length || 0} units
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Fixed width 260px) */}
      <aside className="hidden lg:block w-64 shrink-0 h-full z-20">
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
