import React, { useState } from 'react';
import type { SectorId, EducationRole } from '../../types/api.ts';
import {
  ShieldAlert,
  GraduationCap,
  FlaskConical,
  BarChart3,
  Home,
  Volume2,
  VolumeX,
  Radio,
  ChevronDown
} from 'lucide-react';
import { glassTokens } from '../../design-system/tokens.ts';

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
  isMuted,
  onToggleMute,
  isApiOnline = true,
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
    <div className={`h-screen h-[100dvh] ${glassTokens.level0} text-slate-100 flex flex-col overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200`}>
      {/* Level 0: Atmospheric ambient diffusion */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-15%] left-[20%] w-[50%] h-[35%] bg-cyan-900/[0.07] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[45%] h-[35%] bg-blue-900/[0.05] rounded-full blur-[140px]" />
      </div>

      {/* Level 1: Primary Shell Top Navigation Bar */}
      <header className="shrink-0 z-40 glass-level-1 border-b border-white/[0.08] h-14 transition-all glass-highlight">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 h-full">
          <div className="flex h-full items-center justify-between gap-3 min-w-0">
            {/* Zone 1: Brand & Sector Context */}
            <div className="flex items-center gap-3 min-w-0 shrink">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)] shrink-0">
                <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold font-mono tracking-widest text-white truncate">
                  J.A.R.V.I.S.
                </span>
                <span className="text-xs text-slate-500" aria-hidden="true">/</span>
                <span className="text-xs font-medium text-slate-300 truncate">
                  {activeSectorDef.name}
                </span>
              </div>
            </div>

            {/* Zone 2: Sector Segmented Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md max-w-lg mx-2">
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm border border-white/[0.08]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-white/[0.08] bg-slate-900/60 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer focus-ring"
                  title="Switch Platform Sector"
                >
                  <activeSectorDef.icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[80px]">{activeSectorDef.shortName}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {isSectorDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl glass-level-3 p-1.5 shadow-2xl z-50 space-y-1 animate-scale-in text-xs border border-cyan-500/25">
                    <div className="px-2 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-mono">
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
                              ? 'bg-slate-800 text-cyan-300 font-semibold border border-white/[0.08]'
                              : isPlanned
                              ? 'opacity-40 text-slate-500 cursor-not-allowed'
                              : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.name}</span>
                          </div>
                          {s.badge && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                              {s.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Uplink Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/[0.06] bg-slate-900/40 text-xs text-slate-300">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isApiOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-mono text-slate-400">{isApiOnline ? 'Online' : 'Auxiliary'}</span>
              </div>

              {/* Audio Synthesizer Mute Toggle */}
              <button
                onClick={onToggleMute}
                title={isMuted ? 'Unmute Jarvis Speech' : 'Mute Jarvis Speech'}
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/[0.08] bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer focus-ring shrink-0"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
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
        <footer className="shrink-0 border-t border-white/[0.06] glass-level-1 py-2 text-center text-xs text-slate-400 relative z-30 min-w-0">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1 min-w-0">
            <div className="truncate text-xs text-slate-400 font-mono">
              JARVIS INTELLIGENT OPERATING SYSTEM
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums truncate">
              Core: <span className="text-cyan-300 font-medium">{activeSectorDef.name}</span> · Gemini 3.8 Flash
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
