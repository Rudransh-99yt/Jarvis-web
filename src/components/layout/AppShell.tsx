import React, { useState, useEffect } from 'react';
import type { SectorId, EducationRole } from '../../types/api.ts';
import { authClient, type AuthClientUser } from '../../services/authClient.ts';
import {
  ShieldAlert,
  GraduationCap,
  FlaskConical,
  BarChart3,
  Home,
  Radio,
  ChevronDown,
  LogOut,
  Building2,
  Shield,
  Compass,
  Check,
  CheckCircle2,
  Plus,
  KeyRound,
  AlertCircle,
  X
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
  onNavigateHome?: () => void;
  currentUser?: AuthClientUser | null;
  onLogout?: () => void;
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
  onNavigateHome,
  currentUser,
  onLogout,
  children
}) => {
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(() => authClient.getActiveWorkspace());
  const [workspaces, setWorkspaces] = useState(() => authClient.getWorkspaces());

  // Invitation Code dialog state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'validating' | 'joining' | 'success' | 'error'>('idle');
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  // Synchronize active workspace and workspaces list
  useEffect(() => {
    return authClient.subscribe(() => {
      setActiveWorkspace(authClient.getActiveWorkspace());
      setWorkspaces(authClient.getWorkspaces());
    });
  }, []);

  const handleSwitchWs = async (wsId: string) => {
    try {
      await authClient.switchWorkspace(wsId);
      setIsWsDropdownOpen(false);
    } catch (err: any) {
      console.error('[AppShell] Failed to switch workspace:', err);
    }
  };

  const handleJoinInstitution = async () => {
    if (!inviteCodeInput.trim()) {
      setInviteStatus('error');
      setInviteFeedback('Please enter an invitation code.');
      return;
    }
    setInviteStatus('joining');
    setInviteFeedback(null);
    try {
      const res = await authClient.joinInstitution(inviteCodeInput.trim().toUpperCase());
      setInviteStatus('success');
      setInviteFeedback(`Successfully joined ${res.institution?.name || 'institution'}!`);
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteCodeInput('');
        setInviteStatus('idle');
        setInviteFeedback(null);
        setIsWsDropdownOpen(false);
      }, 1500);
    } catch (err: any) {
      setInviteStatus('error');
      setInviteFeedback(err?.message || 'Failed to redeem invitation code.');
    }
  };

  const sectors = [
    {
      id: 'personal' as SectorId,
      name: 'Personal Jarvis',
      shortName: 'Personal',
      category: 'Sovereign Core',
      icon: Compass,
      badge: 'SOVEREIGN',
      status: 'active' as const,
      description: 'Sovereign memory, profile calibration & private personal workspace'
    },
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
      <header className="shrink-0 z-30 glass-liquid-bar border-b border-white/[0.10] h-14 transition-all glass-highlight">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 h-full">
          <div className="flex h-full items-center justify-between gap-3 min-w-0">
            {/* Zone 1: Brand & Sector Context */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
              <div
                onClick={onNavigateHome}
                className={`flex items-center gap-2 sm:gap-3 min-w-0 shrink ${onNavigateHome ? 'cursor-pointer group' : ''}`}
                title={onNavigateHome ? 'Return to Public Homepage' : undefined}
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 border border-white/[0.14] shadow-sm shrink-0 overflow-hidden group-hover:border-cyan-400/50 transition-colors">
                  <JarvisMark size={20} variant="default" glow />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-bold font-mono tracking-widest text-white truncate group-hover:text-cyan-200 transition-colors">
                    J.A.R.V.I.S.
                  </span>
                  <span className="text-xs text-neutral-500 hidden sm:inline" aria-hidden="true">/</span>
                  <span className="text-xs font-medium text-neutral-300 truncate hidden sm:inline">
                    {activeSectorDef.name}
                  </span>
                </div>
              </div>

              {/* Active Workspace / Context Switcher */}
              {currentUser && (
                <div className="relative ml-0.5 sm:ml-2">
                  <button
                    onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
                    aria-expanded={isWsDropdownOpen}
                    aria-haspopup="true"
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs text-neutral-200 transition-all cursor-pointer select-none focus-ring shadow-sm"
                    title="Switch Active Workspace or Link Institution"
                  >
                    {activeWorkspace?.institutionId ? (
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    )}
                    <span className="font-medium text-white max-w-[80px] sm:max-w-[130px] md:max-w-[160px] truncate text-[11px] sm:text-xs">
                      {activeWorkspace?.name || 'Personal Workspace'}
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-mono uppercase px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded hidden sm:inline ${
                      activeWorkspace?.institutionId
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {activeWorkspace?.institutionId ? 'Institution' : 'Sovereign'}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-neutral-400 shrink-0 transition-transform duration-200 ${isWsDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isWsDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsWsDropdownOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl glass-level-3 p-2 shadow-2xl z-50 space-y-1.5 animate-slide-down text-xs border border-white/[0.14]">
                        <div className="flex items-center justify-between px-2 py-1 text-[10px] text-neutral-400 uppercase tracking-wider font-mono border-b border-white/[0.06]">
                          <span>Active Workspace</span>
                          <span>{workspaces.length} Authorized</span>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                          {workspaces.map((ws) => {
                            const isPersonal = !ws.institutionId;
                            const isCurrent = ws.id === activeWorkspace?.id;
                            return (
                              <button
                                key={ws.id}
                                onClick={() => handleSwitchWs(ws.id)}
                                className={`w-full flex items-start justify-between p-2 rounded-xl text-left transition-colors cursor-pointer select-none ${
                                  isCurrent
                                    ? 'bg-white/[0.12] border border-white/[0.16] text-white shadow-sm'
                                    : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-start gap-2 min-w-0 pr-2">
                                  {isPersonal ? (
                                    <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white truncate text-xs flex items-center gap-1.5">
                                      <span>{ws.name}</span>
                                      {isCurrent && <Check className="w-3 h-3 text-cyan-300 shrink-0" />}
                                    </div>
                                    <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                                      {isPersonal ? 'Isolated personal memory & goals' : 'Institutional courses & materials'}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                  isPersonal ? 'bg-cyan-500/10 text-cyan-300' : 'bg-indigo-500/10 text-indigo-300'
                                }`}>
                                  {isPersonal ? 'Personal' : 'School'}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-1.5 border-t border-white/[0.08]">
                          <button
                            onClick={() => {
                              setShowInviteModal(true);
                              setIsWsDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer border border-cyan-500/20"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Link Institution with Invitation Code</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Zone 2: Sector Segmented Tabs (Desktop) */}
            <nav className="hidden xl:flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md max-w-lg mx-2">
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
              <div className="relative xl:hidden">
                <button
                  onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
                  aria-expanded={isSectorDropdownOpen}
                  aria-haspopup="true"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs text-neutral-200 hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer focus-ring"
                  title="Switch Platform Sector"
                >
                  <activeSectorDef.icon className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                  <span className="truncate max-w-[80px]">{activeSectorDef.shortName}</span>
                  <ChevronDown className={`w-3 h-3 text-neutral-400 shrink-0 transition-transform duration-200 ${isSectorDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSectorDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSectorDropdownOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-xl glass-level-3 p-1.5 shadow-2xl z-50 space-y-1 animate-slide-down text-xs border border-white/[0.12]">
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
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer select-none ${
                              s.id === currentSector
                                ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.16] shadow-sm'
                                : isPlanned
                                ? 'opacity-40 text-neutral-500 cursor-not-allowed'
                                : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.09]'
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
                  </>
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

              {/* Link back to Public Homepage */}
              {onNavigateHome && (
                <button
                  onClick={onNavigateHome}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-neutral-300 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.14] transition-colors cursor-pointer"
                  title="Return to Public Homepage"
                >
                  <Home className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="text-[11px] font-mono">Home</span>
                </button>
              )}

              {/* Authenticated User Session & Sign Out */}
              {currentUser && (
                <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                  <div className="hidden lg:flex flex-col text-right leading-none">
                    <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                      {currentUser.displayName}
                    </span>
                    <span className="text-[9px] font-mono text-cyan-300 uppercase mt-0.5">
                      {currentUser.role}
                    </span>
                  </div>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-red-300 hover:bg-red-950/20 hover:border-red-500/30 text-xs transition-colors cursor-pointer"
                      title="Sign Out of Session"
                    >
                      <LogOut className="w-3 h-3" />
                      <span className="hidden sm:inline text-[10px] font-mono">Exit</span>
                    </button>
                  )}
                </div>
              )}
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
      {/* Institution Invitation Linking Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-reveal-soft">
          <div className="relative w-full max-w-md rounded-2xl glass-level-3 border border-white/[0.14] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Link Institutional Workspace</h3>
              </div>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteStatus('idle');
                  setInviteFeedback(null);
                }}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Enter an authorized institution code (e.g. <span className="font-mono text-cyan-300">STARK-2026</span>) to join an academic workspace. Your sovereign personal workspace and memories remain private and unshared.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                Invitation Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={18}
                  value={inviteCodeInput}
                  onChange={(e) => {
                    setInviteCodeInput(e.target.value.toUpperCase());
                    setInviteStatus('idle');
                    setInviteFeedback(null);
                  }}
                  placeholder="e.g. STARK-2026 or STARK-FACULTY"
                  className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] text-xs font-mono uppercase text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                />
                <button
                  onClick={handleJoinInstitution}
                  disabled={inviteStatus === 'joining'}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {inviteStatus === 'joining' ? 'Joining...' : 'Verify & Join'}
                </button>
              </div>
            </div>

            {inviteFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                inviteStatus === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/40 border border-red-500/40 text-red-200'
              }`}>
                {inviteStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{inviteFeedback}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
