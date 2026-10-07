import { useRef, useEffect, useCallback } from 'react';

export interface MagnificationProfile {
  maxScale: number;          // e.g. 1.12 for sidebar, 1.08 for controls, 1.14 for avatars
  maxLift: number;           // pixels, e.g. 3.5px lift
  radius: number;            // proximity influence radius in pixels, e.g. 125px
  brightnessBoost: number;   // e.g. 0.14
  specularStrength: number;  // e.g. 0.50
  direction?: 'vertical' | 'horizontal';
  axisOrigin?: 'left' | 'center' | 'bottom';
}

export const MAGNIFICATION_PROFILES: Record<string, MagnificationProfile> = {
  // Apple Dock-like vertical sidebar navigation
  sidebar: {
    maxScale: 1.12,
    maxLift: 3.5,
    radius: 125,
    brightnessBoost: 0.14,
    specularStrength: 0.50,
    direction: 'vertical',
    axisOrigin: 'left'
  },
  // Compact media and study space controls
  controls: {
    maxScale: 1.08,
    maxLift: 2.5,
    radius: 80,
    brightnessBoost: 0.12,
    specularStrength: 0.40,
    direction: 'horizontal',
    axisOrigin: 'center'
  },
  // Study Space participant avatars strip
  avatars: {
    maxScale: 1.14,
    maxLift: 3.0,
    radius: 70,
    brightnessBoost: 0.12,
    specularStrength: 0.38,
    direction: 'horizontal',
    axisOrigin: 'center'
  },
  // Dashboard quick-action buttons / chips rail
  quickActions: {
    maxScale: 1.07,
    maxLift: 2.2,
    radius: 90,
    brightnessBoost: 0.12,
    specularStrength: 0.35,
    direction: 'horizontal',
    axisOrigin: 'center'
  },
  // Resource & course preview tiles
  tiles: {
    maxScale: 1.035,
    maxLift: 2.0,
    radius: 110,
    brightnessBoost: 0.08,
    specularStrength: 0.28,
    direction: 'horizontal',
    axisOrigin: 'center'
  }
};

/**
 * Reusable proximity magnification hook for Apple Dock-like physical responsiveness.
 * Directly animates GPU-accelerated CSS custom properties on items, avoiding DOM reflow.
 */
export function useMagnificationRail(profileOrKey: MagnificationProfile | keyof typeof MAGNIFICATION_PROFILES = 'sidebar') {
  const profile: MagnificationProfile =
    typeof profileOrKey === 'string'
      ? MAGNIFICATION_PROFILES[profileOrKey] || MAGNIFICATION_PROFILES.sidebar
      : profileOrKey;

  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<string, HTMLElement>>(new Map());
  const rafId = useRef<number | null>(null);

  const resetAll = useCallback(() => {
    itemsRef.current.forEach((el) => {
      if (el) {
        el.style.setProperty('--mag-scale', '1');
        el.style.setProperty('--mag-lift', '0px');
        el.style.setProperty('--mag-brightness', '1');
        el.style.setProperty('--mag-specular', '0');
        el.style.setProperty('--mag-glow', '0');
        el.style.setProperty('--mag-depth', '0');
        el.style.setProperty('--mag-clarity', '1');
      }
    });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Touch devices and tablets use standard touch taps, not desktop dock proximity
    if (e.pointerType === 'touch') return;

    // Respect reduced-motion preferences
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    const pointerX = e.clientX;
    const pointerY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      const { radius, maxScale, maxLift, brightnessBoost, specularStrength, direction } = profile;
      const isVertical = direction !== 'horizontal';

      itemsRef.current.forEach((el) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const center = isVertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
        const pointerPos = isVertical ? pointerY : pointerX;
        const dist = Math.abs(pointerPos - center);

        if (dist < radius) {
          const t = 1 - dist / radius;
          // Smooth cosine bell-curve with 1.42 exponent for continuous, cohesive physical handover:
          // Hovered: ~1.12 | Neighbor: ~1.066 | Next-neighbor: ~1.024
          const smoothT = 0.5 * (1 - Math.cos(Math.PI * t));
          const factor = Math.pow(smoothT, 1.42);
          
          const scale = 1.0 + (maxScale - 1.0) * factor;
          const lift = -maxLift * factor;
          const brightness = 1.0 + brightnessBoost * factor;
          const specular = specularStrength * factor;
          const glow = 0.35 * factor;
          const clarity = 1.0 + 0.15 * factor;

          el.style.setProperty('--mag-scale', scale.toFixed(3));
          el.style.setProperty('--mag-lift', `${lift.toFixed(1)}px`);
          el.style.setProperty('--mag-brightness', brightness.toFixed(3));
          el.style.setProperty('--mag-specular', specular.toFixed(3));
          el.style.setProperty('--mag-glow', glow.toFixed(3));
          el.style.setProperty('--mag-depth', factor.toFixed(3));
          el.style.setProperty('--mag-clarity', clarity.toFixed(3));
        } else {
          el.style.setProperty('--mag-scale', '1');
          el.style.setProperty('--mag-lift', '0px');
          el.style.setProperty('--mag-brightness', '1');
          el.style.setProperty('--mag-specular', '0');
          el.style.setProperty('--mag-glow', '0');
          el.style.setProperty('--mag-depth', '0');
          el.style.setProperty('--mag-clarity', '1');
        }
      });
    });
  }, [profile]);

  const handlePointerLeave = useCallback(() => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    resetAll();
  }, [resetAll]);

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const registerItem = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) {
      itemsRef.current.set(id, el);
    } else {
      itemsRef.current.delete(id);
    }
  }, []);

  return {
    containerRef,
    registerItem,
    handlePointerMove,
    handlePointerLeave,
    resetAll
  };
}
