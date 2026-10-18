// J.A.R.V.I.S. — Lightweight Declarative Client-Side Router
// Uses HTML5 History API (pushState, popstate) without external dependencies.

import { useState, useEffect, useCallback } from 'react';

type RouteListener = (path: string) => void;

class RouterService {
  private listeners: Set<RouteListener> = new Set();
  private currentPath: string;

  constructor() {
    this.currentPath = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';

    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this.currentPath = window.location.pathname || '/';
        this.notify();
      });
    }
  }

  getPath(): string {
    return this.currentPath;
  }

  navigate(to: string, options?: { replace?: boolean; scroll?: boolean }) {
    if (typeof window === 'undefined') return;

    if (this.currentPath === to && !options?.replace) {
      return;
    }

    if (options?.replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }

    this.currentPath = to;
    this.notify();

    if (options?.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  subscribe(listener: RouteListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentPath);
      } catch (err) {
        console.error('[RouterService] Listener error:', err);
      }
    }
  }
}

export const router = new RouterService();

/**
 * React hook to observe and change the active URL path.
 */
export function useRouter() {
  const [path, setPath] = useState<string>(() => router.getPath());

  useEffect(() => {
    return router.subscribe((newPath) => {
      setPath(newPath);
    });
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean; scroll?: boolean }) => {
    router.navigate(to, options);
  }, []);

  const getSectorFromPath = (): 'personal' | 'command' | 'education' | 'research' | null => {
    if (path.startsWith('/app/personal')) return 'personal';
    if (path.startsWith('/app/command')) return 'command';
    if (path.startsWith('/app/research')) return 'research';
    if (path.startsWith('/app/education')) return 'education';
    return null;
  };

  return {
    path,
    navigate,
    isLanding: path === '/' || path === '',
    isApp: path.startsWith('/app'),
    isExplore: path.startsWith('/explore'),
    isLogin: path.startsWith('/login'),
    isSignup: path.startsWith('/signup'),
    isOnboarding: path.startsWith('/onboarding'),
    sectorFromPath: getSectorFromPath()
  };
}
