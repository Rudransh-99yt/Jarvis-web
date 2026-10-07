import React, { useState } from 'react';
import type { SectorId, EducationRole } from '../../types/api.ts';
import {
  ShieldAlert,
  GraduationCap,
  FlaskConical,
  BarChart3,
  Home,
  Radio,
  ChevronDown
} from 'lucide-react';
import { glassTokens } from '../../design-system/tokens.ts';
import { JarvisMark } from '../brand/JarvisMark.tsx';
import { JarvisCore } from '../brand/JarvisCore.tsx';

interface AppShellProps {
  currentSector: SectorId;
  onSelectSector: (sector: SectorId) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  apiProviderName?: string;
  isApiOnline?: boolean;
  educationRole?: EducationRole;
  onToggleEducationRole?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentSector,
  onSelectSector,
  isMuted: _isMuted,
  onToggleMute: _onToggleMute,
  isApiOnline = true,
  educationRole,
  onToggleEducationRole,
  children
}) => {
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);

  const sectors = [
    {
      id: 'command' as SectorId,
      name: 'Command Deck',
      shortName: 'Command',
      category: 'Core Operations',
      icon: ShieldAlert,
      badge: 'ACTIVE',
      status: 'active' as const,
      description: 'Tactical telemetry, Arc Reactor core, protocols & armor matrix'
    },
    {
      id: 'education' as SectorId,
      name: 'Education Sector',
      shortName: 'Education',
      category: 'Academic Workspace',
      icon: GraduationCap,
      badge: 'EXPANDED',
      status: 'active' as const,
      description: 'Student/Teacher portals, classes, assignments & NotebookLM spaces'
    },
    {
      id: 'research' as SectorId,
      name: 'Research & Labs',
      shortName: 'Research',
      category: 'Scientific Suite',
      icon: FlaskConical,
      badge: 'ONLINE',
      status: 'active' as const,
      description: 'Grounded research projects, evidence locker & synthesis assistant'
    },
    {
      id: 'finance' as SectorId,
      name: 'Finance & Analytics',
      shortName: 'Finance',
      category: 'Intelligence',
      icon: BarChart3,
      badge: 'PLANNED',
      status: 'planned' as const,
      description: 'Market streams, portfolio allocation & capital models'
    },
    {
      id: 'home' as SectorId,
      name: 'Device & Home',
      shortName: 'Home',
      category: 'Automation',
      icon: Home,
      badge: 'PLANNED',
      status: 'planned' as const,
      description: 'IoT mesh controller, security ward & ambient nodes'
    }
  ];

  const activeSectorDef = sectors.find((s) => s.id === currentSector) || sectors[0];

  return (
    <div className={`h-screen h-[100dvh] ${glassTokens.level0} text-neutral-100 flex flex-col overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-100`}>
      {/* Level 0: Living atmospheric lighting environment behind the glass */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Soft muted cyan field in the upper-left */}
        <div className="absolute top-[-12%] left-[10%] w-[50%] h-[40%] bg-cyan-500/[0.035] rounded-full blur-[140px]" />
        {/* Soft subtle violet field in the upper-right */}
        <div className="absolute top-[5%] right-[-5%] w-[45%] h-[38%] bg-violet-500/[0.028] rounded-full blur-[150px]" />
        {/* Soft deep teal field in the lower-center */}
        <div className="absolute bottom-[-15%] left-[30%] w-[50%] h-[35%] bg-teal-500/[0.025] rounded-full blur-[160px]" />
        {/* Extremely subtle warm neutral light field */}
        <div className="absolute bottom-[10%] left-[-8%] w-[35%] h-[28%] bg-amber-500/[0.014] rounded-full blur-[140px]" />
        {/* Gentle specular white diffusion */}
        <div className="absolute top-[25%] left-[40%] w-[30%] h-[25%] bg-white/[0.012] rounded-full blur-[120px]" />
      </div>

      {/* Level 1: Primary Shell Top Navigation Bar */}
      <header className="shrink-0 z-40 glass-level-1 border-b border-white/[0.08] h-14 transition-all glass-highlight">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 h-full">
          <div className="flex h-full items-center justify-between gap-3 min-w-0">
            {/* Zone 1: Brand & Sector Context */}
            <div className="flex items-center gap-3 min-w-0 shrink">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 border border-white/[0.14] shadow-sm shrink-0 overflow-hidden">
                <JarvisMark size={20} variant="default" glow />
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold font-mono tracking-widest text-white truncate">
                  J.A.R.V.I.S.
                </span>
                <span className="text-xs text-neutral-500" aria-hidden="true">/</span>
                <span className="text-xs font-medium text-neutral-300 truncate">
                  {activeSectorDef.name}
                </span>
              </div>
            </div>

            {/* Zone 2: Sector Segmented Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md max-w-lg mx-2">
              {sectors.map((sector) => {
                const Icon = sector.icon;
                const isActive = sector.id === currentSector;
                const isPlanned = sector.status === 'planned';

                return (
                  <button
                    key={sector.id}
                    onClick={() => {
                      if (!isPlanned) onSelectSector(sector.id);
                    }}
                    disabled={isPlanned}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none relative ${
                      isActive
                        ? 'bg-gradient-to-b from-white/[0.12] to-white/[0.06] text-white font-semibold shadow-[0_2px_10px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.25)] border border-white/[0.16]'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                    <span className="truncate">{sector.shortName}</span>
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Sector Switcher, Telemetry Status & Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Sector Quick Switcher (Mobile & Compact) */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-neutral-200 hover:bg-white/[0.08] cursor-pointer focus-ring"
                  title="Switch Platform Sector"
                >
                  <activeSectorDef.icon className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                  <span className="truncate max-w-[80px]">{activeSectorDef.shortName}</span>
                  <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
                </button>

                {isSectorDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl glass-level-3 p-1.5 shadow-2xl z-50 space-y-1 animate-scale-in text-xs border border-white/[0.12]">
                    <div className="px-2 py-1 text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                      Platform Sectors
                    </div>
                    {sectors.map((s) => {
                      const Icon = s.icon;
                      const isPlanned = s.status === 'planned';
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            if (!isPlanned) {
                              onSelectSector(s.id);
                              setIsSectorDropdownOpen(false);
                            }
                          }}
                          disabled={isPlanned}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                            s.id === currentSector
                              ? 'bg-white/[0.1] text-white font-semibold border border-white/[0.14]'
                              : isPlanned
                              ? 'opacity-40 text-neutral-500 cursor-not-allowed'
                              : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.name}</span>
                          </div>
                          {s.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-neutral-400 shrink-0">
                              {s.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* User Role & Profile Switcher (Education Sector) */}
              {currentSector === 'education' && educationRole && (
                <button
                  onClick={onToggleEducationRole}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs text-neutral-200 transition-colors cursor-pointer select-none focus-ring"
                  title={`Current Role: ${educationRole.toUpperCase()} · Click to Switch Persona`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500/30 to-indigo-500/30 border border-white/[0.2] flex items-center justify-center text-[10px] font-mono font-bold text-white shrink-0">
                    {educationRole === 'student' ? 'A' : educationRole === 'teacher' ? 'T' : 'P'}
                  </div>
                  <span className="hidden sm:inline font-mono text-[11px] text-neutral-300">
                    {educationRole === 'student' ? 'Alex Chen' : educationRole === 'teacher' ? 'Dr. Thorne' : 'Dean Vance'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-cyan-300 uppercase font-semibold">
                    {educationRole}
                  </span>
                </button>
              )}

              {/* Status Uplink Indicator with Living Jarvis Neural Core */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-neutral-300">
                <JarvisCore size="xs" state={isApiOnline ? 'idle' : 'warning'} label={`Jarvis Neural Core: ${isApiOnline ? 'Active' : 'Auxiliary'}`} />
                <span className="text-[11px] font-mono text-neutral-300 font-medium">{isApiOnline ? 'Core Online' : 'Auxiliary'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Content Viewport */}
      <div
        id="main-scroll-container"
        data-scroll-owner={currentSector !== 'education' ? 'true' : undefined}
        className={`education-scroll-container flex-1 min-h-0 min-w-0 ${
          currentSector === 'education'
            ? 'overflow-hidden flex flex-col'
            : 'overflow-y-auto overscroll-contain'
        } relative z-10`}
      >
        <main className={`w-full min-w-0 ${currentSector === 'education' ? 'px-0 py-0 flex-1 min-h-0 flex flex-col' : 'mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5'}`}>
          {children}
        </main>
      </div>

      {/* Bottom Status Bar for non-education sectors */}
      {currentSector !== 'education' && (
        <footer className="shrink-0 border-t border-white/[0.06] glass-level-1 py-2 text-center text-xs text-neutral-400 relative z-30 min-w-0">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1 min-w-0">
            <div className="truncate text-xs text-neutral-400 font-mono">
              JARVIS INTELLIGENT OPERATING SYSTEM
            </div>
            <div className="text-xs text-neutral-400 font-mono tabular-nums truncate">
              Core: <span className="text-neutral-200 font-medium">{activeSectorDef.name}</span> · Gemini 3.8 Flash
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
