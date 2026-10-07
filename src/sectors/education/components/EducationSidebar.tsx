import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { EducationRole, AcademicInstitution, EducationClass } from '../../../types/education.ts';
import {
  Home,
  Layers,
  BookOpen,
  FileCheck2,
  Calendar,
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
  Users,
  Bookmark,
  Trophy,
  AlertTriangle,
  FileSpreadsheet,
  Heart,
  Tv,
  Timer
} from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar.tsx';

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

  // macOS Dock-style magnification tracking
  const navContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const rafId = useRef<number | null>(null);

  const roles: Array<{ id: EducationRole; label: string; name: string; icon: any; color: string; department: string }> = [
    { id: 'student', label: 'Student', name: 'Alex Chen', icon: GraduationCap, color: 'text-neutral-200', department: 'Class 12 Physics' },
    { id: 'teacher', label: 'Instructor', name: 'Dr. Sarah', icon: BookOpen, color: 'text-neutral-200', department: 'Faculty of Physics' },
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

  // Reset Dock magnification variables for all registered items
  const resetDockMagnification = useCallback(() => {
    itemRefs.current.forEach((el) => {
      if (el) {
        el.style.setProperty('--dock-scale', '1');
        el.style.setProperty('--dock-translate-y', '0px');
        el.style.setProperty('--dock-brightness', '1');
        el.style.setProperty('--dock-specular', '0');
      }
    });
  }, []);

  // Pointer Move Handler for macOS Dock Spatial Curve
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    const pointerY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      const R = 120; // 120px influence radius for smooth proximity curve across 2-3 items

      itemRefs.current.forEach((el) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const itemCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(pointerY - itemCenterY);

        if (dist < R) {
          const t = 1 - dist / R;
          // Smooth bell-curve factor
          const factor = Math.pow(t, 1.8);
          // Scale: 1.09 directly hovered (1.06–1.10 target), 1.04 neighbor (1.02–1.05 target)
          const scale = 1.0 + 0.09 * factor;
          // TranslateY: -3.5px directly hovered (-2px to -4px target), -1.7px neighbor
          const translateY = -3.5 * factor;
          // Noticeable brightness boost & specular refraction
          const brightness = 1.0 + 0.16 * factor;
          const specular = 0.35 * factor;

          el.style.setProperty('--dock-scale', scale.toFixed(3));
          el.style.setProperty('--dock-translate-y', `${translateY.toFixed(1)}px`);
          el.style.setProperty('--dock-brightness', brightness.toFixed(3));
          el.style.setProperty('--dock-specular', specular.toFixed(3));
        } else {
          el.style.setProperty('--dock-scale', '1');
          el.style.setProperty('--dock-translate-y', '0px');
          el.style.setProperty('--dock-brightness', '1');
          el.style.setProperty('--dock-specular', '0');
        }
      });
    });
  };

  const handlePointerLeave = () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    resetDockMagnification();
  };

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const registerItemRef = (id: string) => (el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(id, el);
    } else {
      itemRefs.current.delete(id);
    }
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const renderNavButton = (
      id: EducationSidebarSection,
      label: string,
      Icon: any,
      badge?: string | number,
      isPulse?: boolean
    ) => {
      const isActive = activeSection === id;
      return (
        <div
          key={id}
          ref={!isMobile ? registerItemRef(`nav-${id}`) : undefined}
          className={`w-full relative select-none ${
            !isMobile ? 'transition-[transform,filter] duration-75 ease-out origin-left' : 'transition-colors'
          }`}
          style={
            !isMobile
              ? {
                  transform: 'translateY(var(--dock-translate-y, 0px)) scale(var(--dock-scale, 1))',
                  filter: 'brightness(var(--dock-brightness, 1))',
                  transformOrigin: '20px center',
                  willChange: 'transform, filter'
                }
              : undefined
          }
        >
          <button
            onClick={() => handleNavClick(id)}
            className={`w-full flex items-center justify-between px-3 py-2 min-h-[38px] rounded-lg text-xs font-medium transition-colors text-left group cursor-pointer focus-ring relative select-none ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500/12 via-white/[0.08] to-white/[0.03] text-white font-semibold border border-cyan-500/35 shadow-[0_4px_16px_-2px_rgba(6,182,212,0.18),inset_0_1px_0_0_rgba(255,255,255,0.22)] backdrop-blur-md pl-4.5'
                : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            {/* Active Jarvis Cyan System Indicator Bar */}
            {isActive && (
              <span
                className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.85)]"
                aria-hidden="true"
              />
            )}

            {/* Dynamic macOS Dock Specular Top-Edge Refraction & Cyan Energy (Desktop only) */}
            {!isMobile && (
              <div
                className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-100 overflow-hidden"
                style={{
                  opacity: 'var(--dock-specular, 0)'
                }}
                aria-hidden="true"
              >
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-cyan-500/[0.04] to-transparent" />
                <div className="absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_2px_12px_rgba(6,182,212,0.22)]" />
              </div>
            )}

            <div className="flex items-center gap-2.5 truncate min-w-0">
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]' : 'text-neutral-400 group-hover:text-neutral-200'
                } ${isPulse ? 'animate-pulse text-emerald-400' : ''}`}
              />
              <span className="truncate">{label}</span>
            </div>
            {badge !== undefined && (
              <span
                className={`text-[11px] font-mono tabular-nums shrink-0 ${
                  isActive ? 'text-cyan-200 font-medium' : 'text-neutral-400'
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        </div>
      );
    };

    return (
      <div className="flex flex-col h-full glass-level-1 border-r border-white/[0.08] text-neutral-200 select-none">
        {/* 1. Header: Academic Institution & Sync */}
        <div className="p-3.5 border-b border-white/[0.08] space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-white/[0.06] border border-white/[0.12] flex items-center justify-center shrink-0 shadow-sm">
                <Building2 className="w-3.5 h-3.5 text-neutral-200" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-100 truncate">
                  {institution?.name || 'Stark Academy'}
                </div>
                <div className="text-[11px] text-neutral-400 truncate">
                  {institution?.currentAcademicYear || '2026–2027'} · Education OS
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onRefresh}
                disabled={isSyncing}
                title="Sync Academic State"
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer focus-ring"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-white' : ''}`} />
              </button>
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-neutral-400 hover:text-neutral-200 cursor-pointer focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Persona & Role Selector */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14] hover:bg-white/[0.07] transition-all text-left cursor-pointer focus-ring"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar name={currentRoleObj.name} size="sm" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-neutral-100 truncate">
                    {currentRoleObj.name}
                  </div>
                  <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{currentRoleObj.label}</span>
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 shrink-0 ml-1 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl glass-level-3 shadow-2xl p-2 z-50 animate-scale-in space-y-2 text-xs border border-white/[0.12]">
                <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] space-y-0.5">
                  <div className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider">Active School</div>
                  <div className="font-semibold text-neutral-100">{institution?.name || 'Stark Academy'}</div>
                  <div className="text-[11px] text-neutral-300">{currentRoleObj.department}</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-neutral-400 px-1">
                    <span>Switch Role</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-neutral-300 border border-white/[0.1] font-mono">RBAC</span>
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
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-white/[0.1] text-white font-semibold border border-white/[0.14]'
                            : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${r.color} shrink-0`} />
                        <div className="min-w-0">
                          <div className="font-semibold text-xs truncate">{r.name}</div>
                          <div className="text-[10px] text-neutral-400">{r.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Scrollable Navigation Hierarchy with Dock Magnification Engine */}
        <div
          ref={!isMobile ? navContainerRef : undefined}
          onPointerMove={!isMobile ? handlePointerMove : undefined}
          onPointerLeave={!isMobile ? handlePointerLeave : undefined}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-5 custom-scrollbar overscroll-contain"
        >
          {/* Primary Role Workflow Section */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
              {currentRole === 'principal' ? 'Institution' :
               currentRole === 'teacher' ? 'Teach' :
               currentRole === 'parent' ? 'Family' : 'Learn'}
            </div>

            {/* Student Hub Workflows */}
            {currentRole === 'student' && (
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
            {currentRole === 'teacher' && (
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
            {currentRole === 'principal' && (
              <>
                {renderNavButton('principal_overview', 'Executive Overview', ShieldAlert)}
                {renderNavButton('principal_grade', 'Grade Intelligence', Layers)}
                {renderNavButton('principal_teachers', 'Faculty Intelligence', Users)}
                {renderNavButton('principal_audit', 'Interventions & Audit', FileCheck2)}
                {renderNavButton('classes', 'All School Classes', BookOpen, classes.length)}
                {renderNavButton('calendar', 'Institutional Calendar', Calendar)}
              </>
            )}

            {/* Parent Family Workflows */}
            {currentRole === 'parent' && (
              <>
                {renderNavButton('home', 'Family Portal', Heart)}
                {renderNavButton('calendar', 'School Calendar', Calendar)}
                {renderNavButton('community', 'School Updates', MessageSquare)}
              </>
            )}
          </div>

          {/* FOCUS & WORKSPACE Section — Student-Only */}
          {currentRole === 'student' && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
                Focus & Workspace
              </div>

              {renderNavButton('focus', 'Focus Room', Timer)}
              {renderNavButton('workspace', 'My Workspace', FileText)}
            </div>
          )}

          {/* CONNECT Section — Sole destination is Community */}
          {(currentRole === 'student' || currentRole === 'teacher') && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
                Connect
              </div>

              {renderNavButton('community', 'Community', MessageSquare)}
            </div>
          )}

          {/* KNOWLEDGE & SMART SURFACES Section */}
          {(currentRole === 'student' || currentRole === 'teacher') && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 font-semibold">
                Knowledge & Surfaces
              </div>

              {currentRole === 'student' && renderNavButton('notes', 'Notes & Formulas', Bookmark)}
              {currentRole === 'student' && renderNavButton('board_history', 'Board History', FileCheck2)}
              {currentRole === 'teacher' && renderNavButton('smartboard_os', 'SmartBoard OS', Tv)}
              {currentRole === 'teacher' && renderNavButton('board_history', 'Board Archive', FileCheck2)}
              {renderNavButton('knowledge', 'Knowledge Spaces', Brain)}
              {renderNavButton('videos', 'Video Library', Video)}
              {renderNavButton('classroom', currentRole === 'teacher' ? 'Smart Classroom' : 'Live Classroom', Radio)}
            </div>
          )}

          {/* Course Directory Quick Access */}
          {(currentRole === 'student' || currentRole === 'teacher') && (
            <div className="space-y-1 pt-2 border-t border-white/[0.06]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 px-3 mb-1.5 flex items-center justify-between font-semibold">
                <span>{currentRole === 'teacher' ? 'Assigned Courses' : 'Enrolled Courses'}</span>
                <span className="text-[10px] text-neutral-400 font-mono tabular-nums">{classes.length}</span>
              </div>

              <div className="space-y-0.5">
                {classes.map((cls) => {
                  const isSelectedCourse = activeSection === 'classes' && cls.id === activeCourseId;
                  return (
                    <div
                      key={cls.id}
                      ref={!isMobile ? registerItemRef(`course-${cls.id}`) : undefined}
                      className={`w-full relative select-none ${
                        !isMobile ? 'transition-[transform,filter] duration-75 ease-out origin-left' : 'transition-colors'
                      }`}
                      style={
                        !isMobile
                          ? {
                              transform: 'translateY(var(--dock-translate-y, 0px)) scale(var(--dock-scale, 1))',
                              filter: 'brightness(var(--dock-brightness, 1))',
                              transformOrigin: '20px center',
                              willChange: 'transform, filter'
                            }
                          : undefined
                      }
                    >
                      <button
                        onClick={() => handleCourseClick(cls.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono transition-colors text-left group cursor-pointer focus-ring select-none relative ${
                          isSelectedCourse
                            ? 'bg-gradient-to-r from-cyan-500/12 via-white/[0.08] to-white/[0.03] text-white font-semibold border border-cyan-500/35 shadow-[0_2px_12px_-2px_rgba(6,182,212,0.15),inset_0_1px_0_0_rgba(255,255,255,0.2)] pl-3.5'
                            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        {/* Dynamic macOS Dock Specular Top-Edge Refraction & Cyan Energy (Desktop only) */}
                        {!isMobile && (
                          <div
                            className="absolute inset-0 rounded-lg pointer-events-none transition-opacity duration-100 overflow-hidden"
                            style={{
                              opacity: 'var(--dock-specular, 0)'
                            }}
                            aria-hidden="true"
                          >
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-cyan-500/[0.04] to-transparent" />
                            <div className="absolute inset-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_2px_12px_rgba(6,182,212,0.22)]" />
                          </div>
                        )}

                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${
                              isSelectedCourse ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.85)]' : 'bg-neutral-400 group-hover:bg-neutral-200'
                            }`}
                          />
                          <span className="truncate">{cls.code}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono tabular-nums shrink-0 ${
                            isSelectedCourse ? 'text-cyan-200 font-medium' : 'text-neutral-400'
                          }`}
                        >
                          {cls.units?.length || 0} units
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar (Fixed width 260px) */}
      <aside className="hidden lg:block w-64 shrink-0 h-full z-20">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent(true)}
      </div>
    </>
  );
};
