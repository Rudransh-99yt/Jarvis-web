// Client-Side Authentication & Role Capability Client
import type { UserRole } from '../../server/data/types.ts';

export interface AuthClientUser {
  id: string;
  displayName: string;
  email?: string;
  role: string;
  department?: string;
  institutionId?: string;
  avatarUrl?: string;
  capabilities?: string[];
}

export const CLIENT_ROLE_CAPABILITIES: Record<string, string[]> = {
  student: [
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.assignments.submit',
    'student.practice.manage',
    'student.focus.manage',
    'student.progress.view',
    'student.community.view',
    'student.community.participate',
    'student.smartboard.view_released',
    'student.videos.view',
    'student.classroom.participate',
    'student.study.manage'
  ],
  teacher: [
    'teacher.classes.manage',
    'teacher.curriculum.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'teacher.announcements.post',
    'teacher.videos.manage',
    'teacher.classroom.host',
    'teacher.visualization.create',
    'teacher.visualization.manage'
  ],
  parent: [
    'parent.children.view',
    'parent.progress.view',
    'parent.learning_support.view',
    'parent.alerts.view',
    'parent.family_intelligence.view',
    'parent.community.view'
  ],
  principal: [
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view'
  ],
  commander: [
    'admin.system.manage',
    'admin.users.manage',
    'admin.configuration.manage',
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view',
    'teacher.classes.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.progress.view',
    'parent.children.view'
  ],
  admin: [
    'admin.system.manage',
    'admin.users.manage',
    'admin.configuration.manage',
    'principal.institution.view',
    'principal.school.manage',
    'principal.grade_intelligence.view',
    'principal.faculty_intelligence.view',
    'principal.attendance_trends.view',
    'principal.interventions.manage',
    'principal.audit.view',
    'teacher.classes.manage',
    'teacher.grading.manage',
    'teacher.review.manage',
    'teacher.prep.manage',
    'teacher.sessions.manage',
    'teacher.attention.view',
    'teacher.smartboard.control',
    'teacher.smartboard.release',
    'teacher.community.moderate',
    'student.learning.view',
    'student.courses.view',
    'student.assignments.view',
    'student.progress.view',
    'parent.children.view'
  ]
};

export interface AuthSession {
  token: string;
  user: AuthClientUser;
  activeWorkspace?: {
    id: string;
    name: string;
    ownerId: string;
    activeSectors: string[];
    institutionId?: string;
  };
  workspaces?: Array<{
    id: string;
    name: string;
    institutionId?: string;
  }>;
}

export type AuthOtpIntent = 'login' | 'register';

export interface AuthOtpClientMetadata {
  displayName?: string;
  role?: string;
  institutionCode?: string;
  ageRange?: string;
  country?: string;
  [key: string]: any;
}

export interface VerifyOtpClientMetadata {
  displayName?: string;
  role?: string;
  institutionCode?: string;
  ageRange?: string;
  country?: string;
  [key: string]: any;
}

export interface RequestOtpResponse {
  success: boolean;
  message: string;
  email: string;
  intent: AuthOtpIntent;
  resendAvailableAt?: string;
}

export interface OtpEligibilityResponse {
  success: boolean;
  eligible: boolean;
  accountExists?: boolean;
  cooldownRemainingMs?: number;
}

export class AuthApiError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly attemptsRemaining?: number;
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      attemptsRemaining?: number;
      retryAfterMs?: number;
    }
  ) {
    super(message);
    this.name = 'AuthApiError';
    this.code = options?.code;
    this.status = options?.status;
    this.attemptsRemaining = options?.attemptsRemaining;
    this.retryAfterMs = options?.retryAfterMs;
    Object.setPrototypeOf(this, AuthApiError.prototype);
  }
}

export class AuthClient {
  private token: string | null = null;
  private currentUser: AuthClientUser | null = null;
  private activeWorkspace: any | null = null;
  private workspaces: any[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;
  private baseUrl: string = '';

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.hydrateFromStorage();
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private hydrateFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      this.token = localStorage.getItem('jarvis_auth_token');
      const storedUser = localStorage.getItem('jarvis_auth_user');
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
      const storedWs = localStorage.getItem('jarvis_auth_workspace');
      if (storedWs) {
        this.activeWorkspace = JSON.parse(storedWs);
      }
      const storedWorkspaces = localStorage.getItem('jarvis_auth_workspaces');
      if (storedWorkspaces) {
        this.workspaces = JSON.parse(storedWorkspaces);
      }
    } catch {
      // Storage unavailable or invalid json
    }
  }

  private saveToStorage(token?: string | null, user?: AuthClientUser | null, workspace?: any | null, workspaces?: any[] | null) {
    if (typeof window === 'undefined') return;
    try {
      if (token) {
        localStorage.setItem('jarvis_auth_token', token);
      } else if (token === null) {
        localStorage.removeItem('jarvis_auth_token');
      }

      if (user) {
        localStorage.setItem('jarvis_auth_user', JSON.stringify(user));
      } else if (user === null) {
        localStorage.removeItem('jarvis_auth_user');
      }

      if (workspace) {
        localStorage.setItem('jarvis_auth_workspace', JSON.stringify(workspace));
      } else if (workspace === null) {
        localStorage.removeItem('jarvis_auth_workspace');
      }

      if (workspaces) {
        localStorage.setItem('jarvis_auth_workspaces', JSON.stringify(workspaces));
      } else if (workspaces === null) {
        localStorage.removeItem('jarvis_auth_workspaces');
      }
    } catch {
      // Ignore quota or private-browsing errors
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return Boolean(this.token && this.currentUser);
  }

  getCurrentUser(): AuthClientUser | null {
    return this.currentUser;
  }

  getActiveWorkspace(): any | null {
    return this.activeWorkspace;
  }

  getRole(): string {
    return this.currentUser?.role || 'student';
  }

  getCapabilities(): string[] {
    if (!this.currentUser) return [];
    if (this.currentUser.role === 'commander' || this.currentUser.role === 'admin') {
      return CLIENT_ROLE_CAPABILITIES.commander;
    }
    return this.currentUser.capabilities || CLIENT_ROLE_CAPABILITIES[this.currentUser.role] || [];
  }

  can(capability: string): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'commander' || this.currentUser.role === 'admin') return true;
    const caps = this.getCapabilities();
    return caps.includes(capability);
  }

  setUser(user: Partial<AuthClientUser>) {
    if (!this.currentUser) {
      const role = user.role || 'student';
      this.currentUser = {
        id: user.id || 'anonymous',
        displayName: user.displayName || 'Anonymous User',
        role,
        capabilities: user.capabilities || CLIENT_ROLE_CAPABILITIES[role] || [],
        ...user
      };
    } else {
      const role = user.role || this.currentUser.role;
      const caps = user.capabilities || CLIENT_ROLE_CAPABILITIES[role] || [];
      this.currentUser = {
        ...this.currentUser,
        ...user,
        role,
        capabilities: caps
      };
    }
    this.saveToStorage(undefined, this.currentUser, undefined);
    this.notify();
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    this.activeWorkspace = null;
    this.workspaces = [];
    this.saveToStorage(null, null, null, null);
    this.notify();
  }

  getWorkspaces(): any[] {
    return this.workspaces;
  }

  getIsPersonalWorkspace(): boolean {
    return Boolean(this.activeWorkspace && !this.activeWorkspace.institutionId);
  }

  async validateSession(): Promise<AuthClientUser | null> {
    if (!this.token) {
      if (this.currentUser) {
        this.clearSession();
      }
      return null;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: this.getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const userWithCaps: AuthClientUser = {
            ...data.user,
            capabilities: data.capabilities || CLIENT_ROLE_CAPABILITIES[data.user.role] || []
          };
          this.currentUser = userWithCaps;
          if (data.activeWorkspace) {
            this.activeWorkspace = data.activeWorkspace;
          }
          if (Array.isArray(data.workspaces)) {
            this.workspaces = data.workspaces;
          }
          this.saveToStorage(this.token, this.currentUser, this.activeWorkspace, this.workspaces);
          this.notify();
          return this.currentUser;
        }
      } else if (res.status === 401 || res.status === 403) {
        this.clearSession();
        return null;
      }
    } catch {
      // In offline / network disruption, retain existing hydrated user if present
    }
    return this.currentUser;
  }

  async login(credentials: { email?: string; userId?: string; role?: string }): Promise<AuthSession> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
    } catch {
      throw new Error('Unable to connect to authentication service. Please verify that the server is running on http://localhost:3000.');
    }

    const data = await res.json();
    if (!res.ok || !data.success || !data.token) {
      throw new Error(data.error?.message || 'Authentication failed. Please verify credentials.');
    }

    this.token = data.token;
    this.currentUser = {
      ...data.user,
      capabilities: data.capabilities || CLIENT_ROLE_CAPABILITIES[data.user.role] || []
    };
    this.activeWorkspace = data.activeWorkspace || (data.workspaces && data.workspaces[0]) || null;
    this.workspaces = data.workspaces || (this.activeWorkspace ? [this.activeWorkspace] : []);

    this.saveToStorage(this.token, this.currentUser, this.activeWorkspace, this.workspaces);
    this.notify();

    return {
      token: data.token,
      user: this.currentUser!,
      activeWorkspace: this.activeWorkspace,
      workspaces: this.workspaces
    };
  }

  async register(registrationData: {
    displayName: string;
    email: string;
    role?: string;
    institutionCode?: string;
    ageRange?: string;
    country?: string;
  }): Promise<AuthSession> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
    } catch {
      throw new Error('Unable to connect to authentication service. Please verify that the server is running on http://localhost:3000.');
    }

    const data = await res.json();
    if (!res.ok || !data.success || !data.token) {
      throw new Error(data.error?.message || 'Registration failed. Please check information.');
    }

    this.token = data.token;
    this.currentUser = {
      ...data.user,
      capabilities: data.capabilities || CLIENT_ROLE_CAPABILITIES[data.user.role] || []
    };
    this.activeWorkspace = data.activeWorkspace || data.workspace || null;
    this.workspaces = data.workspaces || (this.activeWorkspace ? [this.activeWorkspace] : []);

    this.saveToStorage(this.token, this.currentUser, this.activeWorkspace, this.workspaces);
    this.notify();

    return {
      token: data.token,
      user: this.currentUser!,
      activeWorkspace: this.activeWorkspace,
      workspaces: this.workspaces
    };
  }

  async switchWorkspace(workspaceId: string): Promise<any> {
    if (!workspaceId) throw new Error('workspaceId is required');
    const res = await fetch(`${this.baseUrl}/api/workspaces/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ workspaceId })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to switch workspace');
    }

    this.activeWorkspace = data.activeWorkspace;
    if (Array.isArray(data.workspaces)) {
      this.workspaces = data.workspaces;
    }
    this.saveToStorage(this.token, this.currentUser, this.activeWorkspace, this.workspaces);
    this.notify();
    return data.activeWorkspace;
  }

  async validateInvitationCode(code: string): Promise<{ valid: boolean; institutionId?: string; institutionName?: string; role?: string; error?: string }> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/auth/invitation/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
    } catch {
      return {
        valid: false,
        error: 'Unable to connect to verification service. Please verify that the server is running on http://localhost:3000.'
      };
    }

    const data = await res.json();
    if (!res.ok || !data.valid) {
      return {
        valid: false,
        error: data.error?.message || 'Invalid or expired invitation code.'
      };
    }
    return {
      valid: true,
      institutionId: data.institutionId,
      institutionName: data.institutionName,
      role: data.role
    };
  }

  async joinInstitution(code: string): Promise<{ success: boolean; institution: any; workspaces: any[] }> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/auth/invitation/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({ code })
      });
    } catch {
      throw new Error('Unable to connect to invitation service. Please verify that the server is running on http://localhost:3000.');
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to join institution');
    }

    if (Array.isArray(data.workspaces)) {
      this.workspaces = data.workspaces;
    }
    if (this.currentUser && data.institution) {
      this.currentUser = {
        ...this.currentUser,
        institutionId: data.institution.id
      };
    }
    this.saveToStorage(this.token, this.currentUser, this.activeWorkspace, this.workspaces);
    this.notify();
    return data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
    } catch {
      // Continue client cleanup even if network fails
    }
    this.clearSession();
  }

  async initDevSession(role: string): Promise<void> {
    try {
      // First attempt authentic login through backend to acquire signed token
      await this.login({ role });
    } catch (err) {
      // Fallback to dev-session endpoint
      try {
        const res = await fetch(`${this.baseUrl}/api/auth/dev-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token && data.user) {
            this.token = data.token;
            this.currentUser = {
              ...data.user,
              capabilities: data.capabilities || CLIENT_ROLE_CAPABILITIES[data.user.role] || []
            };
            this.saveToStorage(this.token, this.currentUser, null);
            this.notify();
            return;
          }
        }
      } catch {
        // Fallback to client mock if server unavailable
      }

      // Offline client fallback
      const userMap: Record<string, AuthClientUser> = {
        student: {
          id: 'student-1',
          displayName: 'Peter Parker (Spider-Man)',
          email: 'peter.parker@stark.edu',
          role: 'student',
          department: 'Theoretical Physics & Applied Robotics',
          institutionId: 'inst-stark-academy',
          capabilities: CLIENT_ROLE_CAPABILITIES.student
        },
        teacher: {
          id: 'teacher-1',
          displayName: 'Dr. Sarah (Lead Physicist)',
          email: 'sarah.quantum@stark.edu',
          role: 'teacher',
          department: 'Quantum Mechanics & Field Theory',
          institutionId: 'inst-stark-academy',
          capabilities: CLIENT_ROLE_CAPABILITIES.teacher
        },
        principal: {
          id: 'principal-1',
          displayName: 'Dr. Bruce Banner',
          email: 'banner@stark.edu',
          role: 'principal',
          department: 'Academy Administration & Research',
          institutionId: 'inst-stark-academy',
          capabilities: CLIENT_ROLE_CAPABILITIES.principal
        },
        parent: {
          id: 'parent-1',
          displayName: 'May Parker',
          email: 'may.parker@stark.edu',
          role: 'parent',
          department: 'Family Support Advisory',
          institutionId: 'inst-stark-academy',
          capabilities: CLIENT_ROLE_CAPABILITIES.parent
        },
        commander: {
          id: 'user-tony',
          displayName: 'Tony Stark',
          email: 'tony@starkindustries.com',
          role: 'commander',
          department: 'Executive Engineering & Defense',
          institutionId: 'inst-stark-academy',
          capabilities: CLIENT_ROLE_CAPABILITIES.commander
        }
      };

      const targetUser = userMap[role] || {
        id: `dev-${role}`,
        displayName: `Dev User (${role})`,
        role,
        institutionId: 'inst-stark-academy',
        capabilities: CLIENT_ROLE_CAPABILITIES[role] || []
      };

      this.setUser(targetUser);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[AuthClient] Listener error:', err);
      }
    }
  }

  async refreshMe(): Promise<AuthClientUser | null> {
    return this.validateSession();
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.currentUser) {
      headers['x-user-id'] = this.currentUser.id;
      headers['x-user-role'] = this.currentUser.role;
    }
    return headers;
  }

  /**
   * Requests a one-time password (OTP) verification code.
   * Dispatches code via configured email provider for valid requests.
   * Implements anti-enumeration for login intent on unknown accounts.
   */
  async requestOtp(
    email: string,
    intent: AuthOtpIntent,
    metadata?: AuthOtpClientMetadata
  ): Promise<RequestOtpResponse> {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || cleanEmail.length > 254 || !emailPattern.test(cleanEmail)) {
      throw new AuthApiError('A valid email address (up to 254 characters) is required.', {
        code: 'INVALID_ARGUMENTS',
        status: 400
      });
    }

    if (intent !== 'login' && intent !== 'register') {
      throw new AuthApiError("Invalid OTP intent. Must be 'login' or 'register'.", {
        code: 'INVALID_ARGUMENTS',
        status: 400
      });
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          intent,
          ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {})
        })
      });
    } catch {
      throw new AuthApiError(
        'Unable to connect to authentication service. Please verify that the server is running on http://localhost:3000.',
        { code: 'NETWORK_ERROR' }
      );
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON response
    }

    if (!res.ok || !data?.success) {
      const err = data?.error;
      const fallbackMessage =
        res.status === 502
          ? 'Unable to deliver verification code. Please try again later.'
          : res.status === 429
          ? 'Too many verification requests. Please try again later.'
          : 'Failed to request verification code.';

      throw new AuthApiError(err?.message || fallbackMessage, {
        code: err?.code || (res.status === 502 ? 'EMAIL_DELIVERY_FAILED' : undefined),
        status: res.status,
        attemptsRemaining: typeof err?.attemptsRemaining === 'number' ? err.attemptsRemaining : undefined,
        retryAfterMs: typeof err?.retryAfterMs === 'number' ? err.retryAfterMs : undefined
      });
    }

    return {
      success: true,
      message: data.message,
      email: data.email || cleanEmail,
      intent: data.intent || intent,
      resendAvailableAt: data.resendAvailableAt
    };
  }

  /**
   * Verifies an OTP code and establishes an authenticated session.
   * Stores credentials into local storage and notifies subscribers on success.
   */
  async verifyOtp(
    email: string,
    code: string,
    intent: AuthOtpIntent,
    metadata?: VerifyOtpClientMetadata
  ): Promise<AuthSession> {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanCode = typeof code === 'string' ? code.trim() : '';

    if (!cleanEmail || !cleanCode || (intent !== 'login' && intent !== 'register')) {
      throw new AuthApiError(
        "A valid email, 6-digit verification code, and intent ('login' or 'register') are required.",
        { code: 'INVALID_ARGUMENTS', status: 400 }
      );
    }

    const payload: {
      email: string;
      code: string;
      intent: AuthOtpIntent;
      displayName?: string;
      role?: string;
      institutionCode?: string;
      ageRange?: string;
      country?: string;
    } = {
      email: cleanEmail,
      code: cleanCode,
      intent
    };

    if (metadata && typeof metadata === 'object') {
      if (typeof metadata.displayName === 'string' && metadata.displayName.trim()) {
        payload.displayName = metadata.displayName.trim();
      }
      if (typeof metadata.role === 'string' && metadata.role.trim()) {
        payload.role = metadata.role.trim();
      }
      if (typeof metadata.institutionCode === 'string' && metadata.institutionCode.trim()) {
        payload.institutionCode = metadata.institutionCode.trim();
      }
      if (typeof metadata.ageRange === 'string' && metadata.ageRange.trim()) {
        payload.ageRange = metadata.ageRange.trim();
      }
      if (typeof metadata.country === 'string' && metadata.country.trim()) {
        payload.country = metadata.country.trim();
      }
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch {
      throw new AuthApiError(
        'Unable to connect to authentication service. Please verify that the server is running on http://localhost:3000.',
        { code: 'NETWORK_ERROR' }
      );
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON response
    }

    if (!res.ok || !data?.success || !data?.token) {
      const err = data?.error;
      const fallbackMessage =
        res.status === 423
          ? 'Verification locked due to too many failed attempts. Please request a new code.'
          : res.status === 404
          ? 'Verification code or user account not found.'
          : res.status === 429
          ? 'Too many attempts. Please try again later.'
          : 'Verification failed. Please check your verification code.';

      throw new AuthApiError(err?.message || fallbackMessage, {
        code: err?.code,
        status: res.status,
        attemptsRemaining: typeof err?.attemptsRemaining === 'number' ? err.attemptsRemaining : undefined,
        retryAfterMs: typeof err?.retryAfterMs === 'number' ? err.retryAfterMs : undefined
      });
    }

    this.token = data.token;
    this.currentUser = {
      ...data.user,
      capabilities: data.capabilities || CLIENT_ROLE_CAPABILITIES[data.user.role] || []
    };
    this.activeWorkspace = data.activeWorkspace || (data.workspaces && data.workspaces[0]) || null;
    this.workspaces = data.workspaces || (this.activeWorkspace ? [this.activeWorkspace] : []);

    this.saveToStorage(this.token, this.currentUser, this.activeWorkspace, this.workspaces);
    this.notify();

    return {
      token: data.token,
      user: this.currentUser!,
      activeWorkspace: this.activeWorkspace,
      workspaces: this.workspaces
    };
  }

  /**
   * Checks if an email is eligible to request an OTP code under rate limit rules.
   */
  async checkEligibility(
    email: string,
    intent: AuthOtpIntent = 'login'
  ): Promise<OtpEligibilityResponse> {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || cleanEmail.length > 254 || !emailPattern.test(cleanEmail) || (intent !== 'login' && intent !== 'register')) {
      throw new AuthApiError(
        "A valid email address and intent ('login' or 'register') are required.",
        { code: 'INVALID_ARGUMENTS', status: 400 }
      );
    }

    const query = new URLSearchParams({ email: cleanEmail, intent }).toString();
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/auth/otp/eligibility?${query}`);
    } catch {
      throw new AuthApiError(
        'Unable to connect to authentication service. Please verify that the server is running on http://localhost:3000.',
        { code: 'NETWORK_ERROR' }
      );
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON response
    }

    if (!res.ok || !data?.success) {
      const err = data?.error;
      const fallbackMessage =
        res.status === 429
          ? 'Too many requests. Please try again later.'
          : 'Failed to check verification eligibility.';

      throw new AuthApiError(err?.message || fallbackMessage, {
        code: err?.code,
        status: res.status,
        retryAfterMs: typeof err?.retryAfterMs === 'number' ? err.retryAfterMs : undefined
      });
    }

    return {
      success: true,
      eligible: Boolean(data.eligible),
      ...(typeof data.accountExists === 'boolean' ? { accountExists: data.accountExists } : {}),
      ...(typeof data.cooldownRemainingMs === 'number' ? { cooldownRemainingMs: data.cooldownRemainingMs } : {})
    };
  }
}

export const authClient = new AuthClient();

export function can(capability: string): boolean {
  return authClient.can(capability);
}

export function requestOtp(
  email: string,
  intent: AuthOtpIntent,
  metadata?: AuthOtpClientMetadata
): Promise<RequestOtpResponse> {
  return authClient.requestOtp(email, intent, metadata);
}

export function verifyOtp(
  email: string,
  code: string,
  intent: AuthOtpIntent,
  metadata?: VerifyOtpClientMetadata
): Promise<AuthSession> {
  return authClient.verifyOtp(email, code, intent, metadata);
}

export function checkEligibility(
  email: string,
  intent?: AuthOtpIntent
): Promise<OtpEligibilityResponse> {
  return authClient.checkEligibility(email, intent);
}
