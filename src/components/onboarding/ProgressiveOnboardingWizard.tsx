import React, { useState, useEffect } from 'react';
import { useRouter } from '../../services/router.ts';
import { authClient, AuthApiError } from '../../services/authClient.ts';
import { GlassCard } from '../ui/GlassCard.tsx';
import { Button } from '../ui/Button.tsx';
import { JarvisCore } from '../brand/JarvisCore.tsx';
import type { EducationRole } from '../../types/api.ts';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Building2,
  Compass,
  GraduationCap,
  Users,
  FlaskConical,
  Briefcase,
  BookOpen,
  Check,
  AlertCircle,
  Mail,
  RefreshCw
} from 'lucide-react';

interface ProgressiveOnboardingWizardProps {
  onComplete?: (destination: string) => void;
}

interface OnboardingState {
  step: number;
  pathChoice: 'personal' | 'institution';
  displayName: string;
  preferredName: string;
  email: string;
  ageRange: string;
  language: string;
  roles: string[];
  studyLevel: string;
  subjects: string[];
  explanationStyle: 'first_principles' | 'concise_tactical' | 'socratic' | 'intuitive_visual';
  goals: string[];
  institutionCode: string;
  invitationStatus: 'idle' | 'validating' | 'valid' | 'invalid';
  invitationDetails?: {
    institutionName: string;
    role: string;
  };
  invitationError?: string;
  // OTP verification state for guests
  otpRequested?: boolean;
  resendAvailableAt?: string | null;
}

const STORAGE_KEY = 'jarvis_onboarding_state';

export const ProgressiveOnboardingWizard: React.FC<ProgressiveOnboardingWizardProps> = ({
  onComplete
}) => {
  const { navigate } = useRouter();
  const existingUser = authClient.getCurrentUser();

  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          delete parsed.otpCode;
          return {
            ...parsed,
            step: Math.min(Math.max(parsed.step || 1, 1), 7)
          };
        }
      } catch {}
    }

    return {
      step: 1,
      pathChoice: 'personal',
      displayName: existingUser?.displayName || '',
      preferredName: existingUser?.displayName?.split(' ')[0] || '',
      email: existingUser?.email || '',
      ageRange: '19-24',
      language: 'English',
      roles: [existingUser?.role || 'student'],
      studyLevel: 'Undergraduate',
      subjects: ['Physics', 'Computer Science'],
      explanationStyle: 'first_principles',
      goals: ['Deep conceptual mastery', 'Research & project synthesis'],
      institutionCode: '',
      invitationStatus: 'idle'
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [otpFeedback, setOtpFeedback] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [otpCode, setOtpCode] = useState('');

  // Sync cooldown timer derived from resendAvailableAt
  useEffect(() => {
    if (!state.resendAvailableAt) {
      setCooldownSeconds(0);
      return;
    }
    const update = () => {
      const remainingMs = new Date(state.resendAvailableAt!).getTime() - Date.now();
      setCooldownSeconds(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [state.resendAvailableAt]);

  // Synchronize state to localStorage for persistence across reloads
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
    setErrorMessage(null);
  };

  const handleNextStep = () => {
    if (state.step === 2) {
      if (!state.displayName.trim()) {
        setErrorMessage('Please enter your display name or callsign.');
        return;
      }
      if (!existingUser && (!state.email.trim() || !state.email.includes('@'))) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
    }
    updateState({ step: Math.min(state.step + 1, 7) });
  };

  const handlePrevStep = () => {
    updateState({ step: Math.max(state.step - 1, 1) });
  };

  const handleValidateCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || state.institutionCode).trim();
    if (!code) {
      updateState({
        invitationStatus: 'invalid',
        invitationError: 'Please enter an invitation code.'
      });
      return;
    }

    updateState({ invitationStatus: 'validating', invitationError: undefined });
    try {
      const res = await authClient.validateInvitationCode(code);
      if (res.valid && res.institutionName) {
        updateState({
          invitationStatus: 'valid',
          invitationDetails: {
            institutionName: res.institutionName,
            role: res.role || 'student'
          },
          invitationError: undefined
        });
      } else {
        updateState({
          invitationStatus: 'invalid',
          invitationError: res.error || 'Invalid or expired invitation code.'
        });
      }
    } catch (err: any) {
      updateState({
        invitationStatus: 'invalid',
        invitationError: err?.message || 'Verification failed.'
      });
    }
  };

  const handleRequestOnboardingOtp = async () => {
    const cleanEmail = state.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || cleanEmail.length > 254 || !emailPattern.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setOtpFeedback(null);
    setIsDuplicate(false);
    try {
      const primaryRole = (state.roles[0] || 'student') as EducationRole;
      const res = await authClient.requestOtp(cleanEmail, 'register', {
        displayName: state.displayName.trim(),
        role: primaryRole,
        institutionCode: state.pathChoice === 'institution' && state.invitationStatus === 'valid'
          ? state.institutionCode.trim()
          : undefined,
        ageRange: state.ageRange,
        country: 'United States'
      });
      updateState({
        otpRequested: true,
        resendAvailableAt: res.resendAvailableAt || new Date(Date.now() + 60000).toISOString()
      });
      setOtpFeedback({
        type: 'info',
        text: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox.`
      });
    } catch (err: any) {
      if (err instanceof AuthApiError) {
        if (err.code === 'USER_EXISTS' || err.status === 409) {
          setErrorMessage('An account with this email address already exists. Please sign in instead.');
          setIsDuplicate(true);
        } else if (err.code === 'RESEND_COOLDOWN_ACTIVE') {
          const secs = err.retryAfterMs ? Math.ceil(err.retryAfterMs / 1000) : 60;
          setErrorMessage(`Please wait ${secs} seconds before requesting another code.`);
        } else if (err.code === 'EMAIL_DELIVERY_FAILED' || err.status === 502) {
          setErrorMessage('Unable to deliver verification code. Please check that your email address is valid or try again later.');
        } else if (err.status === 429) {
          setErrorMessage(err.message || 'Too many verification attempts. Please try again later.');
        } else {
          setErrorMessage(err.message || 'Failed to request verification code.');
        }
      } else {
        setErrorMessage(err?.message || 'Unable to connect to authentication service.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setIsDuplicate(false);

    try {
      const primaryRole = (state.roles[0] || 'student') as EducationRole;

      // If user is not yet authenticated, verify OTP registration first
      if (!authClient.isAuthenticated()) {
        const cleanCode = otpCode.trim();
        if (!cleanCode || cleanCode.length !== 6) {
          setErrorMessage('Please enter the 6-digit verification code sent to your email.');
          setIsSubmitting(false);
          return;
        }

        try {
          await authClient.verifyOtp(state.email.trim().toLowerCase(), cleanCode, 'register', {
            displayName: state.displayName.trim(),
            role: primaryRole,
            institutionCode: state.pathChoice === 'institution' && state.invitationStatus === 'valid'
              ? state.institutionCode.trim()
              : undefined,
            ageRange: state.ageRange,
            country: 'United States'
          });
        } catch (otpErr: any) {
          if (otpErr instanceof AuthApiError) {
            if (otpErr.code === 'USER_EXISTS' || otpErr.status === 409) {
              setErrorMessage('An account with this email address already exists. Please sign in instead.');
              setIsDuplicate(true);
            } else if (otpErr.code === 'INVALID_CODE') {
              const remaining = otpErr.attemptsRemaining !== undefined ? ` (${otpErr.attemptsRemaining} attempts remaining)` : '';
              setErrorMessage(`Invalid verification code. Please check your inbox and try again${remaining}.`);
            } else if (otpErr.code === 'LOCKED' || otpErr.status === 423) {
              setErrorMessage('Verification locked due to too many failed attempts. Please request a new code.');
            } else if (otpErr.status === 429) {
              setErrorMessage(otpErr.message || 'Too many attempts. Please try again later.');
            } else {
              setErrorMessage(otpErr.message || 'Verification failed. Please check your code.');
            }
          } else {
            setErrorMessage(otpErr?.message || 'Verification failed.');
          }
          setIsSubmitting(false);
          return;
        }
      } else if (state.pathChoice === 'institution' && state.invitationStatus === 'valid') {
        // If already logged in and entered a valid institution code, redeem it
        try {
          await authClient.joinInstitution(state.institutionCode.trim());
        } catch (e: any) {
          console.warn('[Onboarding] Could not join institution:', e);
        }
      }

      // Update personal identity profile calibration on server
      try {
        await fetch('/api/personal/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authClient.getAuthHeaders()
          },
          body: JSON.stringify({
            name: state.displayName,
            preferredName: state.preferredName || state.displayName.split(' ')[0],
            pathChoice: state.pathChoice,
            ageRange: state.ageRange,
            primaryRole: state.roles[0] === 'teacher' ? 'teacher' :
                         state.roles[0] === 'researcher' ? 'researcher' :
                         state.roles[0] === 'professional' ? 'professional' : 'student',
            educationInfo: {
              gradeLevel: state.studyLevel,
              curriculum: state.subjects.join(', '),
              subjects: state.subjects,
              academicGoals: state.goals
            },
            preferences: {
              explanationStyle: state.explanationStyle
            }
          })
        });
      } catch {}

      // Clear cached onboarding state on completion
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}

      // Determine destination based on verified identity & path choice
      let destination = '/app/personal';
      if (state.pathChoice === 'institution') {
        if (primaryRole === 'student' || primaryRole === 'teacher' || primaryRole === 'principal') {
          destination = '/app/education';
        } else if ((primaryRole as string) === 'commander') {
          destination = '/app/command';
        }
      }

      if (onComplete) {
        onComplete(destination);
      } else {
        navigate(destination);
      }
    } catch (err: any) {
      const rawMsg = err?.message || '';
      if (rawMsg.includes('Failed to fetch') || rawMsg.includes('Unable to connect')) {
        setErrorMessage('Unable to connect to J.A.R.V.I.S. backend service. Please ensure the server is running on http://localhost:3000 and try again.');
      } else {
        setErrorMessage(rawMsg || 'Failed to complete onboarding. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsTotal = 7;
  const progressPercent = Math.round((state.step / stepsTotal) * 100);

  return (
    <div className="max-w-xl mx-auto w-full animate-reveal-soft space-y-6">
      <GlassCard level="elevated" className="p-6 sm:p-8 space-y-6 border-t border-t-white/[0.2] relative overflow-hidden">

        {/* Progress Bar & Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-semibold">STAGE 0{state.step}</span>
              <span>/</span>
              <span>0{stepsTotal}</span>
            </div>
            <span className="text-[11px] text-neutral-400">{progressPercent}% Calibrated</span>
          </div>

          <div className="w-full bg-white/[0.06] rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-1 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* =========================================================================
            STEP 1: WELCOME & STARTING PATH
           ========================================================================= */}
        {state.step === 1 && (
          <div className="space-y-6 animate-reveal-soft">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-[11px] font-mono text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>One Identity · Multiple Contexts</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome to J.A.R.V.I.S.
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
                Jarvis adapts to you as an individual. Your private memories, preferences, and learning history remain under your personal control across school, work, and life.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs font-mono text-neutral-300 block">
                Select Your Starting Environment
              </label>

              {/* Path 1: Personal Jarvis */}
              <button
                type="button"
                onClick={() => updateState({ pathChoice: 'personal' })}
                className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  state.pathChoice === 'personal'
                    ? 'bg-cyan-950/30 border-cyan-400/60 shadow-lg shadow-cyan-950/30'
                    : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${state.pathChoice === 'personal' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/[0.04] text-neutral-400'}`}>
                  <Compass className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white">Personal Jarvis</span>
                    {state.pathChoice === 'personal' && (
                      <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Personal intelligence for independent learning, personal knowledge spaces, private goals, and project workspaces.
                  </p>
                </div>
              </button>

              {/* Path 2: Institution Workspace */}
              <button
                type="button"
                onClick={() => updateState({ pathChoice: 'institution' })}
                className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  state.pathChoice === 'institution'
                    ? 'bg-indigo-950/30 border-indigo-400/60 shadow-lg shadow-indigo-950/30'
                    : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${state.pathChoice === 'institution' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.04] text-neutral-400'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-white">Institution Workspace</span>
                    {state.pathChoice === 'institution' && (
                      <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Join an affiliated school, university, lab, or organization using an invitation token. Grants access to shared classrooms, syllabi, and cohort tools.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: BASIC PROFILE
           ========================================================================= */}
        {state.step === 2 && (
          <div className="space-y-5 animate-reveal-soft">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Establish Basic Identity
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Only essential identifiers are required. We never collect dates of birth or home addresses.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block">
                  Full Name or Callsign *
                </label>
                <input
                  type="text"
                  value={state.displayName}
                  onChange={(e) => updateState({ displayName: e.target.value })}
                  placeholder="e.g. Maya Lin or Alex Chen"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                />
              </div>

              {!existingUser && (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-300 block">
                    Account Email Address *
                  </label>
                  <input
                    type="email"
                    value={state.email}
                    onChange={(e) => updateState({ email: e.target.value })}
                    placeholder="e.g. learner@autonomous.org"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-300 block">
                    Age Group (Optional)
                  </label>
                  <select
                    value={state.ageRange}
                    onChange={(e) => updateState({ ageRange: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d121f] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400/60"
                  >
                    <option value="under_16">Under 16</option>
                    <option value="16-18">16 – 18 (Secondary)</option>
                    <option value="19-24">19 – 24 (Higher Ed)</option>
                    <option value="25_plus">25+ (Professional / Adult)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-neutral-300 block">
                    Preferred Language
                  </label>
                  <select
                    value={state.language}
                    onChange={(e) => updateState({ language: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d121f] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400/60"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Español</option>
                    <option value="French">Français</option>
                    <option value="German">Deutsch</option>
                    <option value="Japanese">日本語</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: ROLE & PURPOSE (Multi-role support)
           ========================================================================= */}
        {state.step === 3 && (
          <div className="space-y-5 animate-reveal-soft">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                How Will You Use J.A.R.V.I.S.?
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Select your primary roles. A person can be a teacher who also studies independently, or a researcher with personal projects.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'student', label: 'Student / Learner', desc: 'Study, focus, curriculum & practice', icon: GraduationCap },
                { id: 'teacher', label: 'Teacher / Educator', desc: 'Lesson prep, SmartBoard, review & grading', icon: Users },
                { id: 'researcher', label: 'Researcher / Scholar', desc: 'Hypotheses, PDF RAG & evidence locker', icon: FlaskConical },
                { id: 'professional', label: 'Working Professional', desc: 'Projects, deep work & knowledge base', icon: Briefcase },
                { id: 'lifelong_learner', label: 'Lifelong Learner', desc: 'Curiosity, books, science & self-mastery', icon: BookOpen }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = state.roles.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (state.roles.length > 1) {
                          updateState({ roles: state.roles.filter((r) => r !== item.id) });
                        }
                      } else {
                        updateState({ roles: [...state.roles, item.id] });
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-sm'
                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-neutral-400'}`} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="font-semibold text-xs text-white">{item.label}</span>
                    <span className="text-[10px] text-neutral-400 leading-tight">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: CALIBRATION & LEARNING STYLE
           ========================================================================= */}
        {state.step === 4 && (
          <div className="space-y-5 animate-reveal-soft">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Pedagogical & Cognitive Calibration
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Tune Jarvis's analytical cadence and explanation methodology. You can adjust this at any time in preferences.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block">
                  Preferred Explanation Style
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'first_principles', label: 'First Principles', desc: 'Fundamental physics & logical derivations' },
                    { id: 'concise_tactical', label: 'Concise & Tactical', desc: 'Direct, rapid-scan executive summaries' },
                    { id: 'socratic', label: 'Socratic Dialogue', desc: 'Guided inquiry through thoughtful questions' },
                    { id: 'intuitive_visual', label: 'Intuitive & Visual', desc: 'Conceptual analogies, geometry & diagrams' }
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => updateState({ explanationStyle: style.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        state.explanationStyle === style.id
                          ? 'bg-cyan-500/15 border-cyan-400/60 text-white'
                          : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:bg-white/[0.05]'
                      }`}
                    >
                      <span className="font-semibold text-xs text-white">{style.label}</span>
                      <span className="text-[10px] text-neutral-400 leading-tight">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-neutral-300 block">
                  Focus Subjects / Disciplines
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Physics', 'Mathematics', 'Computer Science', 'Chemistry', 'Biology', 'Engineering', 'Philosophy', 'Economics'].map((subj) => {
                    const isSelected = state.subjects.includes(subj);
                    return (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            updateState({ subjects: state.subjects.filter((s) => s !== subj) });
                          } else {
                            updateState({ subjects: [...state.subjects, subj] });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400/60 text-cyan-200'
                            : 'bg-white/[0.02] border-white/[0.08] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {subj}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 5: SOVEREIGN WORKSPACE INITIALIZATION
           ========================================================================= */}
        {state.step === 5 && (
          <div className="space-y-5 animate-reveal-soft">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Personal Workspace Initialized
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-sm mx-auto">
                A dedicated personal workspace has been provisioned. It is owned solely by you.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-neutral-400">Workspace Name:</span>
                <span className="font-semibold text-white font-mono">{state.displayName}'s Personal Workspace</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-neutral-400">Ownership Model:</span>
                <span className="text-cyan-300 font-medium">Individual Account (Personal)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-neutral-400">Memory Vault:</span>
                <span className="text-emerald-300 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Private Isolated Storage</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Active Sectors:</span>
                <span className="text-neutral-300 font-mono text-[11px]">Personal · Education · Research · Command</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 6: OPTIONAL INSTITUTION INVITATION CODE
           ========================================================================= */}
        {state.step === 6 && (
          <div className="space-y-5 animate-reveal-soft">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {state.pathChoice === 'institution' ? 'Enter Institution Invitation Code' : 'Link Institution (Optional)'}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                If your school or university provided an invitation code, enter it below. You can always do this later from workspace settings.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={18}
                  value={state.institutionCode}
                  onChange={(e) => updateState({ institutionCode: e.target.value.toUpperCase(), invitationStatus: 'idle', invitationError: undefined })}
                  placeholder="e.g. STARK-2026 or STARK-FACULTY"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs font-mono uppercase text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                />
                <Button
                  size="md"
                  variant="glass"
                  onClick={() => handleValidateCode()}
                  disabled={state.invitationStatus === 'validating'}
                  className="text-xs px-4"
                >
                  {state.invitationStatus === 'validating' ? 'Checking...' : 'Verify'}
                </Button>
              </div>

              {state.invitationStatus === 'valid' && state.invitationDetails && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white">Verified Affiliation</span>
                    <p className="text-[11px] text-emerald-200/90 leading-tight">
                      {state.invitationDetails.institutionName} · Authorized Role: <span className="font-semibold uppercase font-mono">{state.invitationDetails.role}</span>
                    </p>
                  </div>
                </div>
              )}

              {state.invitationStatus === 'invalid' && (
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-white">Invalid Invitation</span>
                    <p className="text-[11px] text-red-200/90 leading-tight">
                      {state.invitationError || 'Code is invalid, expired, or has reached capacity.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    updateState({ institutionCode: '', invitationStatus: 'idle', invitationDetails: undefined });
                    handleNextStep();
                  }}
                  className="text-xs font-mono text-neutral-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  I'll link an institution later →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 7: FINISH & LAUNCH
           ========================================================================= */}
        {state.step === 7 && (
          <div className="space-y-5 animate-reveal-soft">
            <div className="text-center space-y-2">
              <div className="flex justify-center pb-1">
                <JarvisCore size="sm" state="idle" label="Setup Complete" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {authClient.isAuthenticated()
                  ? 'Profile Calibrated & Verified'
                  : 'Profile Setup — Verify Email'}
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-sm mx-auto">
                {authClient.isAuthenticated()
                  ? 'Your profile and workspace are ready. Here is a summary of your configuration:'
                  : 'Almost there! Verify your email address to complete your registration:'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                <span className="text-neutral-400">Name:</span>
                <span className="font-semibold text-white">{state.displayName}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                <span className="text-neutral-400">Email:</span>
                <span className="font-mono text-neutral-200">{state.email}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                <span className="text-neutral-400">Primary Roles:</span>
                <span className="text-cyan-300 font-mono capitalize">{state.roles.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
                <span className="text-neutral-400">Explanation Style:</span>
                <span className="text-neutral-200 capitalize">{state.explanationStyle.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Affiliation:</span>
                <span className="text-neutral-200">
                  {state.invitationStatus === 'valid' && state.invitationDetails
                    ? state.invitationDetails.institutionName
                    : 'Personal (Independent)'}
                </span>
              </div>
            </div>

            {/* Email OTP Verification Section for Unauthenticated Guests */}
            {!authClient.isAuthenticated() && (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-white">Verify your email</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateState({ step: 2 })}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Change email
                  </button>
                </div>

                {otpFeedback && (
                  <div className="p-2.5 rounded-lg bg-cyan-900/40 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <p className="text-[11px]">{otpFeedback.text}</p>
                  </div>
                )}

                {!state.otpRequested ? (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-neutral-300">
                      A 6-digit verification code will be sent to <span className="font-mono text-cyan-300">{state.email}</span>.
                    </p>
                    <Button
                      id="onboarding-request-otp-btn"
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={isSubmitting}
                      onClick={handleRequestOnboardingOtp}
                      iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                      className="text-xs font-semibold cursor-pointer"
                    >
                      {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <label htmlFor="onboarding-otp-input" className="text-xs font-mono text-neutral-300 block">
                        Enter the 6-digit code
                      </label>
                      <input
                        id="onboarding-otp-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setOtpCode(val);
                          setErrorMessage(null);
                        }}
                        placeholder="••••••"
                        autoFocus
                        disabled={isSubmitting}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.16] text-center font-mono text-base tracking-[0.4em] text-cyan-300 placeholder-neutral-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                      <span>Didn't get the code?</span>
                      <button
                        type="button"
                        id="onboarding-resend-otp-btn"
                        disabled={cooldownSeconds > 0 || isSubmitting}
                        onClick={handleRequestOnboardingOtp}
                        className={`inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                          cooldownSeconds > 0 || isSubmitting
                            ? 'text-neutral-500 cursor-not-allowed'
                            : 'text-cyan-400 hover:text-cyan-300 underline'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                        <span>
                          {cooldownSeconds > 0
                            ? `Resend in ${cooldownSeconds}s`
                            : 'Resend code'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="leading-relaxed">{errorMessage}</p>
                {(isDuplicate || errorMessage.includes('already exists')) && (
                  <div className="pt-1">
                    <button
                      type="button"
                      id="onboarding-duplicate-switch-to-login"
                      onClick={() => navigate(`/login?email=${encodeURIComponent(state.email)}`)}
                      className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline font-medium cursor-pointer"
                    >
                      <span>Sign in to your existing account →</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
          {state.step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer py-2 px-3 rounded-lg hover:bg-white/[0.04]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {state.step < 7 ? (
            <Button
              size="md"
              variant="primary"
              onClick={handleNextStep}
              iconRight={<ArrowRight className="w-4 h-4" />}
              className="text-xs font-semibold px-5"
            >
              Continue
            </Button>
          ) : !authClient.isAuthenticated() && !state.otpRequested ? (
            <Button
              id="onboarding-send-code-bottom-btn"
              size="md"
              variant="primary"
              onClick={handleRequestOnboardingOtp}
              disabled={isSubmitting}
              iconRight={<ArrowRight className="w-4 h-4" />}
              className="text-xs font-semibold px-6 cursor-pointer"
            >
              {isSubmitting ? 'Sending Code...' : 'Send Verification Code'}
            </Button>
          ) : (
            <Button
              id="onboarding-finish-btn"
              size="md"
              variant="primary"
              onClick={handleFinishOnboarding}
              disabled={isSubmitting || (!authClient.isAuthenticated() && otpCode.trim().length !== 6)}
              iconRight={<ArrowRight className="w-4 h-4" />}
              className="text-xs font-semibold px-6 cursor-pointer"
            >
              {isSubmitting ? 'Finalizing Setup...' : errorMessage ? 'Retry Launch' : 'Launch J.A.R.V.I.S.'}
            </Button>
          )}
        </div>
      </GlassCard>
    </div>
  );
};
