import React, { useState, useEffect } from 'react';
import { useRouter } from '../../services/router.ts';
import { JarvisCore } from '../brand/JarvisCore.tsx';
import { JarvisMark } from '../brand/JarvisMark.tsx';
import { GlassCard } from '../ui/GlassCard.tsx';
import { Button } from '../ui/Button.tsx';
import { authClient, AuthApiError } from '../../services/authClient.ts';
import { ProgressiveOnboardingWizard } from '../onboarding/ProgressiveOnboardingWizard.tsx';
import type { EducationRole } from '../../types/api.ts';
import {
  Sparkles,
  ArrowRight,
  Shield,
  GraduationCap,
  FlaskConical,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Layers,
  UserCheck,
  Building2,
  KeyRound,
  Compass,
  Users,
  Mail,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface PublicRoutePortalProps {
  initialRoute?: 'explore' | 'login' | 'signup' | 'onboarding';
  onLoginSuccess?: (role: EducationRole) => void;
}

const LOGIN_DRAFT_KEY = 'jarvis_portal_login_draft';
const SIGNUP_DRAFT_KEY = 'jarvis_portal_signup_draft';

export const PublicRoutePortal: React.FC<PublicRoutePortalProps> = ({
  initialRoute,
  onLoginSuccess
}) => {
  const { path, navigate } = useRouter();

  // Determine current active subview based on URL or prop
  const currentView = initialRoute || (
    path.startsWith('/login') ? 'login' :
    path.startsWith('/signup') ? 'signup' :
    path.startsWith('/onboarding') ? 'onboarding' :
    'explore'
  );

  const getRedirectUrl = (): string | null => {
    let search = '';
    if (path.includes('?')) {
      search = path.slice(path.indexOf('?'));
    } else if (typeof window !== 'undefined' && window.location.search) {
      search = window.location.search;
    }
    if (!search) return null;
    const params = new URLSearchParams(search);
    const redirect = params.get('redirect');
    return redirect && redirect.startsWith('/app') ? redirect : null;
  };

  const getEmailFromUrl = (): string => {
    if (typeof window === 'undefined') return '';
    try {
      const search = path.includes('?') ? path.slice(path.indexOf('?')) : window.location.search;
      if (!search) return '';
      const params = new URLSearchParams(search);
      return (params.get('email') || '').trim();
    } catch {
      return '';
    }
  };

  // --- LOGIN OTP STATE ---
  const [loginEmail, setLoginEmail] = useState<string>(() => {
    const fromUrl = getEmailFromUrl();
    if (fromUrl) return fromUrl;
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(LOGIN_DRAFT_KEY);
        if (saved) return JSON.parse(saved).email || '';
      } catch {}
    }
    return '';
  });

  const [loginStep, setLoginStep] = useState<'email' | 'otp'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(LOGIN_DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.otpSent && parsed.email) return 'otp';
        }
      } catch {}
    }
    return 'email';
  });

  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginResendAvailableAt, setLoginResendAvailableAt] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(LOGIN_DRAFT_KEY);
        if (saved) return JSON.parse(saved).resendAvailableAt || null;
      } catch {}
    }
    return null;
  });
  const [loginCooldownSeconds, setLoginCooldownSeconds] = useState(0);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<{
    type: 'error' | 'info';
    text: string;
    isNotFound?: boolean;
  } | null>(null);

  // Sync login cooldown timer
  useEffect(() => {
    if (!loginResendAvailableAt) {
      setLoginCooldownSeconds(0);
      return;
    }
    const update = () => {
      const remainingMs = new Date(loginResendAvailableAt).getTime() - Date.now();
      setLoginCooldownSeconds(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [loginResendAvailableAt]);

  // Persist login draft to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (loginStep === 'otp' && loginEmail) {
        sessionStorage.setItem(
          LOGIN_DRAFT_KEY,
          JSON.stringify({
            email: loginEmail,
            otpSent: true,
            resendAvailableAt: loginResendAvailableAt
          })
        );
      } else {
        sessionStorage.removeItem(LOGIN_DRAFT_KEY);
      }
    } catch {}
  }, [loginStep, loginEmail, loginResendAvailableAt]);

  // Update login and signup email from URL if navigated with ?email=...
  useEffect(() => {
    const urlEmail = getEmailFromUrl();
    if (urlEmail) {
      setLoginEmail(urlEmail);
      setSignupEmail(urlEmail);
    }
  }, [path]);

  // --- SIGNUP OTP STATE ---
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
        if (saved) return JSON.parse(saved).userName || '';
      } catch {}
    }
    return '';
  });

  const [signupEmail, setSignupEmail] = useState<string>(() => {
    const fromUrl = getEmailFromUrl();
    if (fromUrl) return fromUrl;
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
        if (saved) return JSON.parse(saved).email || '';
      } catch {}
    }
    return '';
  });

  const [selectedRole, setSelectedRole] = useState<EducationRole>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role) return parsed.role;
        }
      } catch {}
    }
    return 'student';
  });

  const [accountType, setAccountType] = useState<'individual' | 'institution'>('individual');
  const [institutionCode, setInstitutionCode] = useState('');

  const [signupStep, setSignupStep] = useState<'form' | 'otp'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
        if (saved && JSON.parse(saved).otpSent) return 'otp';
      } catch {}
    }
    return 'form';
  });

  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [signupResendAvailableAt, setSignupResendAvailableAt] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SIGNUP_DRAFT_KEY);
        if (saved) return JSON.parse(saved).resendAvailableAt || null;
      } catch {}
    }
    return null;
  });
  const [signupCooldownSeconds, setSignupCooldownSeconds] = useState(0);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [signupFeedback, setSignupFeedback] = useState<{
    type: 'error' | 'info';
    text: string;
    isDuplicate?: boolean;
  } | null>(null);

  // Sync signup cooldown timer
  useEffect(() => {
    if (!signupResendAvailableAt) {
      setSignupCooldownSeconds(0);
      return;
    }
    const update = () => {
      const remainingMs = new Date(signupResendAvailableAt).getTime() - Date.now();
      setSignupCooldownSeconds(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [signupResendAvailableAt]);

  // Persist signup draft to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (signupStep === 'otp' && signupEmail) {
        sessionStorage.setItem(
          SIGNUP_DRAFT_KEY,
          JSON.stringify({
            userName,
            email: signupEmail,
            role: selectedRole,
            accountType,
            institutionCode,
            otpSent: true,
            resendAvailableAt: signupResendAvailableAt
          })
        );
      } else {
        sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
      }
    } catch {}
  }, [signupStep, userName, signupEmail, selectedRole, accountType, institutionCode, signupResendAvailableAt]);

  // --- LOGIN HANDLERS ---
  const handleRequestLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = loginEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || clean.length > 254 || !emailPattern.test(clean)) {
      setLoginFeedback({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setIsSubmittingLogin(true);
    setLoginFeedback(null);
    try {
      // 1. Check eligibility and account existence before transitioning to OTP
      const eligibility = await authClient.checkEligibility(clean, 'login');

      // If account does not exist, clearly inform user and do NOT transition to OTP screen
      if (eligibility.accountExists === false) {
        setLoginFeedback({
          type: 'error',
          text: 'No Jarvis account exists for this email yet. Please sign up first to create your account and receive a verification code.',
          isNotFound: true
        });
        return;
      }

      // If resend cooldown is active, inform user
      if (!eligibility.eligible && eligibility.cooldownRemainingMs) {
        const secs = Math.ceil(eligibility.cooldownRemainingMs / 1000);
        setLoginFeedback({
          type: 'error',
          text: `Please wait ${secs} seconds before requesting another code.`
        });
        return;
      }

      // 2. Existing account: request OTP dispatch and transition directly to OTP verification
      const res = await authClient.requestOtp(clean, 'login');

      setLoginStep('otp');
      setLoginResendAvailableAt(res.resendAvailableAt || new Date(Date.now() + 60000).toISOString());
      setLoginFeedback({
        type: 'info',
        text: 'A 6-digit verification code has been dispatched. Please check your inbox.'
      });
    } catch (err: any) {
      if (err instanceof AuthApiError) {
        if (err.code === 'RESEND_COOLDOWN_ACTIVE') {
          const secs = err.retryAfterMs ? Math.ceil(err.retryAfterMs / 1000) : 60;
          setLoginFeedback({
            type: 'error',
            text: `Please wait ${secs} seconds before requesting another code.`
          });
        } else if (err.code === 'TOO_MANY_REQUESTS' || err.status === 429) {
          setLoginFeedback({
            type: 'error',
            text: err.message || 'Too many verification attempts. Please wait a moment and try again.'
          });
        } else if (err.code === 'EMAIL_DELIVERY_FAILED' || err.status === 502) {
          setLoginFeedback({
            type: 'error',
            text: 'Unable to deliver verification code. Please try again later.'
          });
        } else {
          setLoginFeedback({ type: 'error', text: err.message || 'Failed to request verification code.' });
        }
      } else {
        setLoginFeedback({
          type: 'error',
          text: err?.message || 'Unable to connect to authentication service. Please check your network and try again.'
        });
      }
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleVerifyLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanCode = loginOtpCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setLoginFeedback({ type: 'error', text: 'Please enter the 6-digit verification code.' });
      return;
    }

    setIsSubmittingLogin(true);
    setLoginFeedback(null);
    try {
      const session = await authClient.verifyOtp(cleanEmail, cleanCode, 'login');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(LOGIN_DRAFT_KEY);
      }

      if (onLoginSuccess) {
        onLoginSuccess((session.user.role as EducationRole) || 'student');
      }

      const redirect = getRedirectUrl();
      if (redirect) {
        navigate(redirect);
      } else if (session.activeWorkspace && !session.activeWorkspace.institutionId) {
        navigate('/app/personal');
      } else if (session.user.role === 'teacher' || session.user.role === 'principal' || session.user.role === 'student') {
        navigate('/app/education');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      if (err instanceof AuthApiError) {
        if (err.code === 'INVALID_CODE') {
          const remainingText = err.attemptsRemaining !== undefined ? ` (${err.attemptsRemaining} attempts remaining)` : '';
          setLoginFeedback({
            type: 'error',
            text: `Invalid verification code. Please check your inbox and try again${remainingText}.`
          });
        } else if (err.code === 'LOCKED' || err.status === 423) {
          setLoginFeedback({
            type: 'error',
            text: 'Verification locked due to too many failed attempts. Please request a new code.'
          });
        } else if (err.code === 'NOT_FOUND' || err.status === 404) {
          setLoginFeedback({
            type: 'error',
            text: 'Verification code not found or expired. If you do not have an account yet, please sign up first.'
          });
        } else if (err.status === 429) {
          setLoginFeedback({
            type: 'error',
            text: err.message || 'Too many attempts. Please try again later.'
          });
        } else {
          setLoginFeedback({ type: 'error', text: err.message || 'Verification failed. Please check code.' });
        }
      } else {
        setLoginFeedback({
          type: 'error',
          text: err?.message || 'Verification failed.'
        });
      }
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // --- SIGNUP HANDLERS ---
  const handleRequestSignupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userName.trim()) {
      setSignupFeedback({ type: 'error', text: 'Please enter your full name or callsign.' });
      return;
    }
    const clean = signupEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean || clean.length > 254 || !emailPattern.test(clean)) {
      setSignupFeedback({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setIsSubmittingSignup(true);
    setSignupFeedback(null);
    try {
      const res = await authClient.requestOtp(clean, 'register', {
        displayName: userName.trim(),
        role: selectedRole,
        institutionCode: accountType === 'institution' && institutionCode.trim() ? institutionCode.trim() : undefined
      });
      setSignupStep('otp');
      setSignupResendAvailableAt(res.resendAvailableAt || new Date(Date.now() + 60000).toISOString());
      setSignupFeedback({
        type: 'info',
        text: `A 6-digit verification code has been dispatched to ${clean}. Please check your inbox.`
      });
    } catch (err: any) {
      if (err instanceof AuthApiError) {
        if (err.code === 'USER_EXISTS' || err.status === 409) {
          setSignupFeedback({
            type: 'error',
            text: 'An account with this email address already exists. Please sign in instead.',
            isDuplicate: true
          });
        } else if (err.code === 'RESEND_COOLDOWN_ACTIVE') {
          const secs = err.retryAfterMs ? Math.ceil(err.retryAfterMs / 1000) : 60;
          setSignupFeedback({
            type: 'error',
            text: `Please wait ${secs} seconds before requesting another code.`
          });
        } else if (err.code === 'EMAIL_DELIVERY_FAILED' || err.status === 502) {
          setSignupFeedback({
            type: 'error',
            text: 'Unable to deliver verification code. Please check that the email address is valid or try again later.'
          });
        } else if (err.status === 429) {
          setSignupFeedback({
            type: 'error',
            text: err.message || 'Too many verification requests. Please try again later.'
          });
        } else {
          setSignupFeedback({ type: 'error', text: err.message || 'Failed to request verification code.' });
        }
      } else {
        setSignupFeedback({
          type: 'error',
          text: err?.message || 'Unable to connect to authentication service.'
        });
      }
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  const handleVerifySignupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanCode = signupOtpCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setSignupFeedback({ type: 'error', text: 'Please enter the 6-digit verification code.' });
      return;
    }

    setIsSubmittingSignup(true);
    setSignupFeedback(null);
    try {
      const session = await authClient.verifyOtp(cleanEmail, cleanCode, 'register', {
        displayName: userName.trim(),
        role: selectedRole,
        institutionCode: accountType === 'institution' && institutionCode.trim() ? institutionCode.trim() : undefined
      });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
      }

      if (onLoginSuccess) {
        onLoginSuccess((session.user.role as EducationRole) || selectedRole);
      }

      const redirect = getRedirectUrl();
      if (redirect) {
        navigate(redirect);
      } else if (accountType === 'individual') {
        navigate('/app/personal');
      } else if (selectedRole === 'teacher' || selectedRole === 'principal' || selectedRole === 'student') {
        navigate('/app/education');
      } else {
        navigate('/app');
      }
    } catch (err: any) {
      if (err instanceof AuthApiError) {
        if (err.code === 'USER_EXISTS' || err.status === 409) {
          setSignupFeedback({
            type: 'error',
            text: 'An account with this email address already exists. Please sign in instead.',
            isDuplicate: true
          });
        } else if (err.code === 'INVALID_CODE') {
          const remainingText = err.attemptsRemaining !== undefined ? ` (${err.attemptsRemaining} attempts remaining)` : '';
          setSignupFeedback({
            type: 'error',
            text: `Invalid verification code. Please check your inbox and try again${remainingText}.`
          });
        } else if (err.code === 'LOCKED' || err.status === 423) {
          setSignupFeedback({
            type: 'error',
            text: 'Verification locked due to too many failed attempts. Please request a new code.'
          });
        } else if (err.status === 429) {
          setSignupFeedback({
            type: 'error',
            text: err.message || 'Too many attempts. Please try again later.'
          });
        } else {
          setSignupFeedback({ type: 'error', text: err.message || 'Verification failed. Please check code.' });
        }
      } else {
        setSignupFeedback({
          type: 'error',
          text: err?.message || 'Verification failed.'
        });
      }
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-neutral-100 flex flex-col overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-100 font-sans relative">
      {/* Level 0: Atmospheric lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[15%] w-[50%] h-[40%] bg-cyan-500/[0.04] rounded-full blur-[140px]" />
        <div className="absolute top-[20%] right-[-10%] w-[45%] h-[35%] bg-indigo-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[25%] w-[50%] h-[35%] bg-teal-500/[0.025] rounded-full blur-[160px]" />
      </div>

      {/* Sovereign Portal Header — Clean, dedicated portal navigation */}
      <header className="relative z-20 w-full border-b border-white/[0.08] bg-[#07111F]/70 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer group text-left"
          title="Return to J.A.R.V.I.S. Homepage"
        >
          <div className="h-7 w-7 rounded-lg bg-black/60 border border-white/[0.14] flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/50 transition-colors">
            <JarvisMark size={16} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold tracking-wider text-xs sm:text-sm text-white group-hover:text-cyan-300 transition-colors">
              J.A.R.V.I.S.
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 uppercase">
              Portal
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-300 hover:text-cyan-300 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/[0.05] border border-white/[0.08]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Homepage</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 py-8 sm:py-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full flex flex-col justify-center">

        {/* =========================================================================
            VIEW 1: EXPLORE JARVIS (/explore)
           ========================================================================= */}
        {currentView === 'explore' && (
          <div className="space-y-8 animate-reveal-soft">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-xs font-mono text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Interactive Platform Explorer</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Explore the J.A.R.V.I.S. Operating System
              </h1>
              <p className="text-sm text-neutral-300 leading-relaxed">
                Welcome to Jarvis. Explore personalized intelligence for learning, research, and life. Choose a sector below or sign in to continue.
              </p>
            </div>

            {/* Sector Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Sector 1: Education OS */}
              <GlassCard level="elevated" className="p-6 space-y-5 flex flex-col justify-between border-t border-t-cyan-500/30">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">Flagship Experience</div>
                    <h2 className="text-lg font-bold text-white">Education OS</h2>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Personalized learning matrix, interactive SmartBoard OS, teaching copilots, focus locks, and role-based student and teacher workflows.
                  </p>
                  <ul className="text-[11px] text-neutral-400 space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      <span>Live SmartBoard collaborative canvas</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      <span>NotebookLM RAG knowledge spaces</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      <span>Student, Teacher & Principal views</span>
                    </li>
                  </ul>
                </div>
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => navigate('/app/education')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full text-xs font-semibold"
                >
                  Enter Education OS
                </Button>
              </GlassCard>

              {/* Sector 2: Research & Labs */}
              <GlassCard level="elevated" className="p-6 space-y-5 flex flex-col justify-between border-t border-t-emerald-500/30">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">Scientific Suite</div>
                    <h2 className="text-lg font-bold text-white">Research & Labs</h2>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Evidence locker ingesting PDF corpora, hypothesis synthesis engine, and strict citation traceability with refusal safeguards.
                  </p>
                  <ul className="text-[11px] text-neutral-400 space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>7-stage dense RAG ingestion pipeline</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Paragraph-level grounded citations</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Multi-source project evidence lockers</span>
                    </li>
                  </ul>
                </div>
                <Button
                  size="md"
                  variant="glass"
                  onClick={() => navigate('/app/research')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full text-xs font-semibold border-emerald-500/30 hover:border-emerald-400/50"
                >
                  Enter Research Labs
                </Button>
              </GlassCard>

              {/* Sector 3: Command Deck */}
              <GlassCard level="elevated" className="p-6 space-y-5 flex flex-col justify-between border-t border-t-amber-500/30">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">Core Operations</div>
                    <h2 className="text-lg font-bold text-white">Command Deck</h2>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Live telemetry HUD, Arc Reactor overclocking, Iron Man armor matrix status, voice recognition, and autonomous security directives.
                  </p>
                  <ul className="text-[11px] text-neutral-400 space-y-1.5 pt-2 border-t border-white/[0.06]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      <span>Arc Reactor telemetry & thermal curves</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      <span>House Party & Defense protocols</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      <span>Real-time voice synthesis sensory loop</span>
                    </li>
                  </ul>
                </div>
                <Button
                  size="md"
                  variant="ghost"
                  onClick={() => navigate('/app/command')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full text-xs font-semibold text-neutral-300 hover:text-white"
                >
                  Enter Command Deck
                </Button>
              </GlassCard>
            </div>

            {/* Quick Action Bar */}
            <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-neutral-400 text-center sm:text-left">
                Ready to get started?
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => navigate('/login')}
                  className="text-xs"
                >
                  Sign In
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/signup')}
                  iconRight={<ArrowRight className="w-3 h-3" />}
                  className="text-xs font-semibold"
                >
                  Get Started Free
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: SIGN IN (/login)
           ========================================================================= */}
        {currentView === 'login' && (
          <div className="max-w-md mx-auto w-full animate-reveal-soft space-y-6">
            <GlassCard level="elevated" className="p-7 sm:p-8 space-y-6 border-t border-t-white/[0.2]">
              <div className="text-center space-y-2">
                <div className="flex justify-center pb-1">
                  <JarvisCore size="sm" state="idle" label="Authentication" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Sign in to Jarvis
                </h1>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {loginStep === 'email'
                    ? 'Enter your email to receive a 6-digit verification code.'
                    : 'Enter the 6-digit verification code to complete sign in.'}
                </p>
              </div>

              {loginFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    loginFeedback.type === 'error'
                      ? 'bg-red-950/40 border-red-500/40 text-red-200'
                      : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                  }`}
                >
                  {loginFeedback.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-2">
                    <p className="leading-relaxed" id="login-feedback-text">{loginFeedback.text}</p>
                    {(loginFeedback.isNotFound || loginFeedback.text.includes('sign up first') || loginFeedback.text.includes('No account was found') || loginFeedback.text.includes('No Jarvis account exists')) && (
                      <div className="pt-1">
                        <Button
                          id="login-account-not-found-signup-btn"
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => navigate(loginEmail.trim() ? `/signup?email=${encodeURIComponent(loginEmail.trim())}` : '/signup')}
                          iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                          className="text-xs font-semibold py-1.5 px-3 cursor-pointer"
                        >
                          Sign Up / Get Started
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loginStep === 'email' ? (
                <form onSubmit={handleRequestLoginOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="login-email-input" className="text-xs font-mono text-neutral-300 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="login-email-input"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setLoginFeedback(null);
                        }}
                        placeholder="e.g. user@autonomous.org or student@school.edu"
                        required
                        autoComplete="email"
                        autoFocus
                        disabled={isSubmittingLogin}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition-colors"
                      />
                      <Mail className="w-4 h-4 text-neutral-500 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <Button
                    id="login-send-otp-btn"
                    type="submit"
                    size="md"
                    variant="primary"
                    disabled={isSubmittingLogin || !loginEmail.trim()}
                    iconRight={<ArrowRight className="w-4 h-4" />}
                    className="w-full text-xs font-semibold py-2.5 cursor-pointer"
                  >
                    {isSubmittingLogin ? 'Sending Code...' : 'Send Verification Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="login-otp-input" className="text-xs font-mono text-neutral-300 block">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep('email');
                          setLoginOtpCode('');
                          setLoginFeedback(null);
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Change email
                      </button>
                    </div>
                    <input
                      id="login-otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={loginOtpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setLoginOtpCode(val);
                        setLoginFeedback(null);
                      }}
                      placeholder="••••••"
                      required
                      autoComplete="one-time-code"
                      autoFocus
                      disabled={isSubmittingLogin}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.16] text-center font-mono text-lg tracking-[0.5em] text-cyan-300 placeholder-neutral-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                  </div>

                  <Button
                    id="login-verify-otp-btn"
                    type="submit"
                    size="md"
                    variant="primary"
                    disabled={isSubmittingLogin || loginOtpCode.trim().length !== 6}
                    iconRight={<ArrowRight className="w-4 h-4" />}
                    className="w-full text-xs font-semibold py-2.5 cursor-pointer"
                  >
                    {isSubmittingLogin ? 'Verifying Code...' : 'Verify Code & Sign In'}
                  </Button>

                  {/* Resend Cooldown Controls */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-neutral-400">
                    <span>Didn't receive code?</span>
                    <button
                      type="button"
                      id="login-resend-otp-btn"
                      disabled={loginCooldownSeconds > 0 || isSubmittingLogin}
                      onClick={() => handleRequestLoginOtp()}
                      className={`inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        loginCooldownSeconds > 0 || isSubmittingLogin
                          ? 'text-neutral-500 cursor-not-allowed'
                          : 'text-cyan-400 hover:text-cyan-300 underline'
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSubmittingLogin ? 'animate-spin' : ''}`} />
                      <span>
                        {loginCooldownSeconds > 0
                          ? `Resend in ${loginCooldownSeconds}s`
                          : 'Resend code'}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* Link to sign up */}
              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-white/[0.06]">
                <span>Don't have an account?</span>
                <button
                  type="button"
                  id="login-footer-switch-to-signup"
                  onClick={() => navigate(loginEmail.trim() ? `/signup?email=${encodeURIComponent(loginEmail.trim())}` : '/signup')}
                  className="text-cyan-300 hover:underline cursor-pointer font-medium"
                >
                  Get Started Free
                </button>
              </div>


            </GlassCard>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: ONBOARDING (/onboarding) — Progressive Sovereign Calibration
           ========================================================================= */}
        {currentView === 'onboarding' && (
          <ProgressiveOnboardingWizard
            onComplete={(dest) => {
              if (onLoginSuccess) {
                const u = authClient.getCurrentUser();
                onLoginSuccess((u?.role as EducationRole) || 'student');
              }
              navigate(dest);
            }}
          />
        )}

        {/* =========================================================================
            VIEW 4: SIGN UP (/signup) — Fast Sovereign Registration
           ========================================================================= */}
        {currentView === 'signup' && (
          <div className="max-w-lg mx-auto w-full animate-reveal-soft space-y-6">
            <GlassCard level="elevated" className="p-7 sm:p-8 space-y-6 border-t border-t-white/[0.2]">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {signupStep === 'form' ? 'Create your account' : 'Verify your email'}
                </h1>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {signupStep === 'form'
                    ? 'Enter your details below to get started with Jarvis.'
                    : `Enter the 6-digit code sent to ${signupEmail}.`}
                </p>
                {signupStep === 'form' && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/onboarding')}
                      className="text-xs text-cyan-300 hover:text-cyan-200 underline font-mono cursor-pointer"
                    >
                      Prefer guided setup? Start here →
                    </button>
                  </div>
                )}
              </div>

              {signupFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    signupFeedback.type === 'error'
                      ? 'bg-red-950/40 border-red-500/40 text-red-200'
                      : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                  }`}
                >
                  {signupFeedback.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="leading-relaxed">{signupFeedback.text}</p>
                    {signupFeedback.isDuplicate && (
                      <div className="pt-1">
                        <button
                          type="button"
                          id="signup-duplicate-switch-to-login"
                          onClick={() => navigate(`/login?email=${encodeURIComponent(signupEmail)}`)}
                          className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline font-medium cursor-pointer"
                        >
                          <span>Sign in to your existing account →</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {signupStep === 'form' ? (
                <form onSubmit={handleRequestSignupOtp} className="space-y-5">
                  {/* Mode Toggle: Individual vs Institution */}
                  <div className="p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] grid grid-cols-2 gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={`py-2 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        accountType === 'individual'
                          ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.16] shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Individual Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType('institution')}
                      className={`py-2 px-3 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        accountType === 'institution'
                          ? 'bg-white/[0.12] text-white font-semibold border border-white/[0.16] shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Institution Invitation</span>
                    </button>
                  </div>

                  {/* Explanatory banner for selected mode */}
                  {accountType === 'individual' ? (
                    <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200/90 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-cyan-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>No Institution Affiliation Needed</span>
                      </div>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        You receive an isolated personal workspace with private memory vaults, research spaces, and study copilots. No university or company sponsorship required.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-neutral-300 block">
                        8-Character Institution Invitation Token
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={institutionCode}
                        onChange={(e) => setInstitutionCode(e.target.value.toUpperCase())}
                        placeholder="e.g. STANFORD, STARK-2026"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs font-mono uppercase text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                      />
                      <p className="text-[10px] text-neutral-400 leading-relaxed">
                        Course materials and class sessions sync automatically while your private personal vault remains cryptographically isolated.
                      </p>
                    </div>
                  )}

                  {/* Identity Details: Name & Email */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-name-input" className="text-xs font-mono text-neutral-300 block">
                        Full Name / Callsign *
                      </label>
                      <input
                        id="signup-name-input"
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. Maya Lin or Peter Parker"
                        required
                        disabled={isSubmittingSignup}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="signup-email-input" className="text-xs font-mono text-neutral-300 block">
                        Email Address *
                      </label>
                      <div className="relative">
                        <input
                          id="signup-email-input"
                          type="email"
                          value={signupEmail}
                          onChange={(e) => {
                            setSignupEmail(e.target.value);
                            setSignupFeedback(null);
                          }}
                          placeholder="e.g. user@autonomous.org or student@school.edu"
                          required
                          disabled={isSubmittingSignup}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.12] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40"
                        />
                        <Mail className="w-4 h-4 text-neutral-500 absolute right-3 top-3 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-neutral-300 block">
                      Select Primary Focus
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'student', label: 'Student', icon: GraduationCap },
                        { id: 'teacher', label: 'Teacher', icon: Users },
                        { id: 'principal', label: 'Researcher', icon: FlaskConical }
                      ].map((roleItem) => {
                        const Icon = roleItem.icon;
                        const isSelected = selectedRole === roleItem.id;
                        return (
                          <button
                            key={roleItem.id}
                            type="button"
                            onClick={() => setSelectedRole(roleItem.id as EducationRole)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                              isSelected
                                ? 'bg-cyan-500/15 border-cyan-400/50 text-white font-semibold'
                                : 'bg-white/[0.02] border-white/[0.08] text-neutral-300 hover:bg-white/[0.05]'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-neutral-400'}`} />
                            <span className="text-xs">{roleItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="space-y-3 pt-2">
                    <Button
                      id="signup-submit-btn"
                      type="submit"
                      size="md"
                      variant="primary"
                      disabled={isSubmittingSignup || !userName.trim() || !signupEmail.trim()}
                      iconRight={<ArrowRight className="w-4 h-4" />}
                      className="w-full text-xs font-semibold py-2.5 cursor-pointer"
                    >
                      {isSubmittingSignup ? 'Sending Code...' : 'Send Verification Code'}
                    </Button>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2">
                      <span>Already configured?</span>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="text-cyan-300 hover:underline cursor-pointer font-medium"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="signup-otp-input" className="text-xs font-mono text-neutral-300 block">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupStep('form');
                          setSignupOtpCode('');
                          setSignupFeedback(null);
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Change details
                      </button>
                    </div>
                    <input
                      id="signup-otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={signupOtpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setSignupOtpCode(val);
                        setSignupFeedback(null);
                      }}
                      placeholder="••••••"
                      required
                      autoComplete="one-time-code"
                      autoFocus
                      disabled={isSubmittingSignup}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.16] text-center font-mono text-lg tracking-[0.5em] text-cyan-300 placeholder-neutral-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                  </div>

                  <Button
                    id="signup-verify-otp-btn"
                    type="submit"
                    size="md"
                    variant="primary"
                    disabled={isSubmittingSignup || signupOtpCode.trim().length !== 6}
                    iconRight={<ArrowRight className="w-4 h-4" />}
                    className="w-full text-xs font-semibold py-2.5 cursor-pointer"
                  >
                    {isSubmittingSignup ? 'Verifying & Creating Account...' : 'Verify Code & Create Account'}
                  </Button>

                  {/* Resend Cooldown Controls */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-neutral-400">
                    <span>Didn't receive code?</span>
                    <button
                      type="button"
                      id="signup-resend-otp-btn"
                      disabled={signupCooldownSeconds > 0 || isSubmittingSignup}
                      onClick={() => handleRequestSignupOtp()}
                      className={`inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        signupCooldownSeconds > 0 || isSubmittingSignup
                          ? 'text-neutral-500 cursor-not-allowed'
                          : 'text-cyan-400 hover:text-cyan-300 underline'
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSubmittingSignup ? 'animate-spin' : ''}`} />
                      <span>
                        {signupCooldownSeconds > 0
                          ? `Resend in ${signupCooldownSeconds}s`
                          : 'Resend code'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-white/[0.06]">
                    <span>Already configured?</span>
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-cyan-300 hover:underline cursor-pointer font-medium"
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              )}


            </GlassCard>
          </div>
        )}
      </main>
    </div>
  );
};
