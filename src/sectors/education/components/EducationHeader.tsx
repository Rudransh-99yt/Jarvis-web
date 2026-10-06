import React, { useState } from 'react';
import type { EducationRole, AcademicInstitution } from '../../../types/education.ts';
import {
  Building2,
  GraduationCap,
  Sparkles,
  Radio,
  Video,
  BookOpen,
  Layers,
  FileCheck2,
  Brain,
  ShieldAlert,
  ChevronDown,
  RefreshCw,
  Search
} from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar.tsx';

export type EducationNavSection = 
  | 'home'
  | 'my_learning'
  | 'classes'
  | 'curriculum'
  | 'classroom'
  | 'videos'
  | 'assignments'
  | 'knowledge'
  | 'study'
  | 'principal_overview';

interface EducationHeaderProps {
  currentRole: EducationRole;
  onChangeRole: (role: EducationRole) => void;
  activeSection: EducationNavSection;
  onSelectSection: (section: EducationNavSection) => void;
  institution?: AcademicInstitution;
  onRefresh: () => void;
  isSyncing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const EducationHeader: React.FC<EducationHeaderProps> = ({
  currentRole,
  onChangeRole,
  activeSection,
  onSelectSection,
  institution,
  onRefresh,
  isSyncing,
  searchQuery,
  onSearchChange
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const roles: Array<{ id: EducationRole; label: string; name: string; icon: any; color: string }> = [
    { id: 'student', label: 'Student', name: 'Alex Chen', icon: GraduationCap, color: 'text-cyan-400' },
    { id: 'teacher', label: 'Instructor', name: 'Dr. Sarah', icon: BookOpen, color: 'text-blue-400' },
    { id: 'principal', label: 'Principal / Admin', name: 'Dean Stark', icon: ShieldAlert, color: 'text-amber-400' }
  ];

  const currentRoleObj = roles.find((r) => r.id === currentRole) || roles[0];

  const getNavItems = (): Array<{ id: EducationNavSection; label: string; icon: any; pulse?: boolean }> => {
    if (currentRole === 'student') {
      return [
        { id: 'home', label: 'Home', icon: Sparkles },
        { id: 'my_learning', label: 'My Learning', icon: Layers },
        { id: 'classroom', label: 'Live Classroom', icon: Radio, pulse: true },
        { id: 'videos', label: 'Video Library', icon: Video },
        { id: 'assignments', label: 'Assignments', icon: FileCheck2 },
        { id: 'knowledge', label: 'NotebookLM Spaces', icon: Brain }
      ];
    } else if (currentRole === 'teacher') {
      return [
        { id: 'home', label: 'Teaching Hub', icon: BookOpen },
        { id: 'classes', label: 'Classes & Batches', icon: Layers },
        { id: 'classroom', label: 'Smart Classroom', icon: Radio, pulse: true },
        { id: 'videos', label: 'Course Videos', icon: Video },
        { id: 'assignments', label: 'Assignments & Grading', icon: FileCheck2 },
        { id: 'knowledge', label: 'Knowledge Base', icon: Brain }
      ];
    } else {
      return [
        { id: 'principal_overview', label: 'Executive Health', icon: ShieldAlert },
        { id: 'classes', label: 'All Grades & Classes', icon: Layers },
        { id: 'classroom', label: 'Live Sessions', icon: Radio },
        { id: 'videos', label: 'Media Repository', icon: Video },
        { id: 'knowledge', label: 'Academic Knowledge', icon: Brain }
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="space-y-3">
      {/* Top Academic Context & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl glass-level-2 border border-white/[0.08]">
        {/* Left: Institution Context (Clean typography, zero pill clutter) */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                {institution?.name || 'Stark Academy of Science & Advanced Engineering'}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline" aria-hidden="true">·</span>
              <span className="hidden sm:inline text-xs font-mono text-cyan-400/80">
                {institution?.currentAcademicYear || '2026–2027'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {institution?.campus || 'Stark Industries R&D Campus • Sector 4'}
            </div>
          </div>
        </div>

        {/* Right: Quick Search, Refresh & Persona */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          {/* Search Box */}
          <div className="relative hidden md:block w-48 lg:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search curriculum..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/[0.08] focus:border-cyan-500/50 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus-ring transition-all"
            />
          </div>

          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            title="Refresh academic data"
            className="p-2 rounded-lg border border-white/[0.08] bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus-ring shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-200 transition-all cursor-pointer focus-ring"
            >
              <Avatar name={currentRoleObj.name} size="sm" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 leading-none">Role Mode</span>
                <span className="text-slate-100 font-semibold leading-tight">{currentRoleObj.label}</span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl glass-level-3 p-1.5 shadow-2xl z-50 space-y-1 text-xs border border-cyan-500/25 animate-scale-in">
                <div className="px-2.5 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                  Active Persona
                </div>
                {roles.map((r) => {
                  const Icon = r.icon;
                  const isSelected = r.id === currentRole;

                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        onChangeRole(r.id);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-white font-semibold border border-white/[0.08]'
                          : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                        <div>
                          <div className="font-medium">{r.label}</div>
                          <div className="text-[10px] text-slate-400">{r.name}</div>
                        </div>
                      </div>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layer 2: Role-Tailored Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-white/[0.06] no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id as EducationNavSection)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer focus-ring ${
                isActive
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-white/[0.08] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{item.label}</span>
              {item.pulse && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
