import React from 'react';
import type { EducationRole, AcademicInstitution } from '../../../types/education.ts';
import {
  Building2,
  GraduationCap,
  Sparkles,
  Radio,
  Video,
  UserCheck,
  RefreshCw,
  Search,
  BookOpen,
  Layers,
  FileCheck2,
  Brain,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

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
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);

  const roles: Array<{ id: EducationRole; label: string; name: string; icon: any; color: string }> = [
    { id: 'student', label: 'Student', name: 'Alex Chen', icon: GraduationCap, color: 'text-cyan-400' },
    { id: 'teacher', label: 'Instructor', name: 'Dr. Sarah', icon: BookOpen, color: 'text-blue-400' },
    { id: 'principal', label: 'Principal / Admin', name: 'Dean Stark', icon: ShieldAlert, color: 'text-amber-400' }
  ];

  const currentRoleObj = roles.find((r) => r.id === currentRole) || roles[0];

  // Role-specific primary tabs
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
      {/* Top Academic Context & Role Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-black/60 backdrop-blur-md">
        {/* Left: Institution Context */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg border border-cyan-500/30 bg-cyan-950/60 p-2 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Building2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white truncate">
                {institution?.name || 'Stark Academy of Science & Advanced Engineering'}
              </span>
              <span className="hidden md:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 shrink-0">
                {institution?.currentAcademicYear || '2026–2027'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-cyan-400/60 truncate">
              {institution?.campus || 'Stark Industries R&D Campus • Sector 4'}
            </div>
          </div>
        </div>

        {/* Right: Quick Search & Role Selector */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          {/* Search Box */}
          <div className="relative hidden md:block w-48 lg:w-64">
            <Search className="w-3.5 h-3.5 text-cyan-400/50 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search subjects, topics, videos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-black/60 border border-cyan-500/20 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono text-cyan-100 placeholder-cyan-400/40 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isSyncing}
            title="Refresh academic data from server"
            className="p-2 rounded-lg border border-cyan-500/20 bg-black/40 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-200 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black/70 hover:border-cyan-400/60 text-xs font-mono text-cyan-200 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <div className="flex flex-col text-left">
                <span className="text-[9px] text-cyan-400/60 uppercase leading-none">Role Mode</span>
                <span className="text-cyan-300 font-bold leading-tight">{currentRoleObj.label}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-cyan-400/60" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-cyan-500/30 bg-black/95 p-1.5 shadow-2xl z-50 space-y-1 font-mono text-xs animate-fade-in">
                <div className="px-2.5 py-1 text-[10px] text-cyan-400/50 uppercase border-b border-cyan-500/15">
                  Select Active Persona
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
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40'
                          : 'text-cyan-400/70 hover:bg-white/5 hover:text-cyan-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${r.color}`} />
                        <div>
                          <div>{r.label}</div>
                          <div className="text-[10px] text-cyan-400/50">{r.name}</div>
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

      {/* Layer 2: Role-Tailored Section Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-cyan-500/15">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id as EducationNavSection)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono tracking-wider transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-cyan-400/60'} ${item.pulse ? 'animate-pulse text-cyan-400' : ''}`} />
              <span>{item.label}</span>
              {item.pulse && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
