import React, { useState } from 'react';
import type { SectorId, EducationRole } from '../../types/api.ts';
import {
  ShieldAlert,
  GraduationCap,
  Sparkles,
  FlaskConical,
  BarChart3,
  Home,
  Volume2,
  VolumeX,
  Radio,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

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
  apiProviderName = 'Google Gemini (gemini-3.8-flash)',
  isApiOnline = true,
  educationRole,
  onToggleEducationRole,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <div className="h-screen h-[100dvh] bg-slate-950 text-slate-100 flex flex-col overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Cyber Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[140px]" />
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-blue-900/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Main Top Header Navigation Bar (Fixed at top) */}
      <header className="shrink-0 z-40 border-b border-cyan-500/20 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-4 min-w-0">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
              <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-cyan-500/40 bg-gradient-to-br from-cyan-950/60 to-black p-2 shadow-[0_0_15px_rgba(6,182,212,0.2)] shrink-0">
                <Radio className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 animate-pulse" />
                <div className="absolute -inset-0.5 rounded-lg bg-cyan-500/10 blur-sm -z-10" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-sm sm:text-base font-bold font-mono tracking-widest text-white truncate">
                    J.A.R.V.I.S.
                  </span>
                  <span className="hidden xl:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-950/60 text-cyan-300 shrink-0">
                    PLATFORM OS v1.3
                  </span>
                </div>
                <div className="hidden md:block text-[10px] font-mono tracking-wider text-cyan-400/60 uppercase truncate">
                  Intelligent Operating Environment
                </div>
              </div>
            </div>

            {/* Center: Sector Navigation Pills (Desktop) */}
            <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-1.5 rounded-xl border border-cyan-500/20 bg-black/40 p-1 backdrop-blur-md min-w-0 flex-1 max-w-2xl mx-1 xl:mx-2">
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
                    className={`group relative flex items-center justify-center gap-1.5 px-2 xl:px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all min-w-0 shrink flex-1 ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/60 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : isPlanned
                        ? 'opacity-40 cursor-not-allowed text-slate-500 border border-transparent'
                        : 'text-cyan-400/70 hover:text-cyan-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-cyan-400/60'}`} />
                    <span className="truncate">{sector.shortName}</span>
                    {sector.badge && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 hidden xl:inline-block ${
                          isActive
                            ? 'bg-cyan-400/20 text-cyan-300'
                            : isPlanned
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-cyan-950 text-cyan-400'
                        }`}
                      >
                        {sector.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right: Sector Dropdown (Mobile) & System Status / Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Sector Quick Switcher (Tablet / Mobile) */}
              <div className="relative lg:hidden">
                <button
                  onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-black/60 text-xs font-mono text-cyan-300"
                >
                  <activeSectorDef.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate max-w-[90px] sm:max-w-none">{activeSectorDef.shortName}</span>
                  <ChevronDown className="w-3 h-3 shrink-0" />
                </button>

                {isSectorDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-cyan-500/30 bg-black/95 p-2 shadow-2xl z-50 space-y-1 animate-fade-in font-mono text-xs">
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
                          className={`w-full flex items-center justify-between p-2 rounded text-left ${
                            s.id === currentSector
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40'
                              : isPlanned
                              ? 'opacity-40 text-slate-500'
                              : 'text-cyan-400/80 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.name}</span>
                          </div>
                          {s.badge && <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 shrink-0">{s.badge}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="hidden md:flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-cyan-500/20 bg-black/40 text-xs font-mono text-cyan-400/80 shrink-0">
                <div className={`h-2 w-2 rounded-full shrink-0 ${isApiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="hidden 2xl:inline text-cyan-400/60">Uplink:</span>
                <span className="text-cyan-300">{isApiOnline ? 'ONLINE' : 'AUXILIARY'}</span>
              </div>

              {/* Audio Synthesizer Mute Toggle */}
              <button
                onClick={onToggleMute}
                title={isMuted ? 'Unmute Jarvis Audio Synthesis' : 'Mute Jarvis Audio Synthesis'}
                className="p-2 rounded-lg border border-cyan-500/20 bg-black/40 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-200 transition-all cursor-pointer shrink-0"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Application Content Region - Single Page Scroll Owner */}
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain relative z-10">
        {/* Main App Content Viewport */}
        <main className={`w-full min-w-0 ${currentSector === 'education' ? 'px-0 py-0' : 'mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6'}`}>
          {children}
        </main>
      </div>

      {/* Persistent Status / Footer Bar at Bottom */}
      <footer className="shrink-0 border-t border-cyan-500/10 bg-black/80 py-2.5 text-center text-xs font-mono text-cyan-400/40 backdrop-blur-md relative z-30 min-w-0">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 min-w-0">
          <div className="truncate text-[11px] text-cyan-400/70">
            JARVIS MULTI-SECTOR INTELLIGENT PLATFORM // STARK ENTERPRISES
          </div>
          <div className="text-[10px] sm:text-[11px] text-cyan-400/60 truncate">
            Active Core: <strong className="text-cyan-300">{activeSectorDef.name.toUpperCase()}</strong> • Gemini 3.8 Flash Streaming
          </div>
        </div>
      </footer>
    </div>
  );
};
