// Client-side Authentication & Session Manager (Phase P0-1 Hardening)
import type { EducationRole } from '../types/api.ts';

export interface AuthenticatedUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  department?: string;
}

class AuthClient {
  private token: string | null = null;
  private user: AuthenticatedUser | null = null;
  private listeners: Array<(user: AuthenticatedUser | null) => void> = [];

  constructor() {
    try {
      this.token = sessionStorage.getItem('jarvis_auth_token');
      const savedUser = sessionStorage.getItem('jarvis_auth_user');
      if (savedUser) {
        this.user = JSON.parse(savedUser);
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  public getAuthToken(): string | null {
    if (!this.token) {
      try {
        this.token = sessionStorage.getItem('jarvis_auth_token');
      } catch {}
    }
    return this.token;
  }

  public getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  public getCurrentUser(): AuthenticatedUser | null {
    return this.user;
  }

  public subscribe(listener: (user: AuthenticatedUser | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.user);
    }
  }

  /**
   * Requests a genuine signed development session token from the server.
   */
  public async initDevSession(userIdOrRole: string): Promise<{ token: string; user: AuthenticatedUser } | null> {
    try {
      const isRole = ['student', 'teacher', 'parent', 'principal', 'commander', 'admin'].includes(userIdOrRole);
      const payload = isRole ? { role: userIdOrRole } : { userId: userIdOrRole };

      const res = await fetch('/api/auth/dev-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        console.warn('Failed to obtain development auth session:', res.statusText);
        return null;
      }

      const data = await res.json();
      this.token = data.token;
      this.user = data.user;

      try {
        sessionStorage.setItem('jarvis_auth_token', data.token);
        sessionStorage.setItem('jarvis_auth_user', JSON.stringify(data.user));
      } catch {}

      this.notify();
      return { token: data.token, user: data.user };
    } catch (err) {
      console.warn('Network error obtaining development auth session:', err);
      return null;
    }
  }

  /**
   * Clears active session credentials.
   */
  public clearSession() {
    this.token = null;
    this.user = null;
    try {
      sessionStorage.removeItem('jarvis_auth_token');
      sessionStorage.removeItem('jarvis_auth_user');
    } catch {}
    this.notify();
  }
}

export const authClient = new AuthClient();
export const getAuthHeaders = () => authClient.getAuthHeaders();
export const getAuthToken = () => authClient.getAuthToken();
export const initDevSession = (roleOrId: string) => authClient.initDevSession(roleOrId);
export const getCurrentAuthUser = () => authClient.getCurrentUser();
