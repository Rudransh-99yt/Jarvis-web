// Structured Physics Simulation Foundation (D.10)
// Deterministic mathematical physics calculations for classroom visualizations.

import type { PhysicsParameters } from '../../../../src/types/visualization.ts';

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
  vx: number;
  vy: number;
  speed: number;
}

export interface ProjectileSimulationResult {
  v0: number;
  angleDeg: number;
  g: number;
  h0: number;
  timeOfFlight: number;
  maxHeight: number;
  timeToApex: number;
  range: number;
  impactVelocity: {
    vx: number;
    vy: number;
    speed: number;
    angleDeg: number;
  };
  keyPoints: Array<{
    type: 'launch' | 'apex' | 'impact';
    x: number;
    y: number;
    t: number;
    label: string;
    description: string;
  }>;
  trajectory: TrajectoryPoint[];
}

export class PhysicsEngine {
  /**
   * Simulates ideal 2D projectile motion under constant gravity.
   */
  public static simulateProjectile(params: Partial<PhysicsParameters>): ProjectileSimulationResult {
    const v0 = Math.max(0.1, Math.min(500, params.v0 ?? 25));
    const angleDeg = Math.max(0, Math.min(90, params.angleDeg ?? 45));
    const g = Math.max(0.1, Math.min(50, params.g ?? 9.8));
    const h0 = Math.max(0, Math.min(200, params.h0 ?? 0));

    const rad = (angleDeg * Math.PI) / 180;
    const vx0 = v0 * Math.cos(rad);
    const vy0 = v0 * Math.sin(rad);

    // Time to reach maximum height (apex)
    const timeToApex = vy0 / g;
    // Maximum height
    const maxHeight = h0 + (vy0 * vy0) / (2 * g);

    // Total time of flight: solve h0 + vy0*t - 0.5*g*t^2 = 0
    // -0.5*g*t^2 + vy0*t + h0 = 0
    // Discriminant: vy0^2 - 4*(-0.5*g)*h0 = vy0^2 + 2*g*h0
    const disc = vy0 * vy0 + 2 * g * h0;
    const timeOfFlight = (vy0 + Math.sqrt(Math.max(0, disc))) / g;

    // Total horizontal range
    const range = vx0 * timeOfFlight;

    // Impact velocity
    const impactVx = vx0;
    const impactVy = vy0 - g * timeOfFlight;
    const impactSpeed = Math.hypot(impactVx, impactVy);
    const impactAngleRad = Math.atan2(Math.abs(impactVy), impactVx);
    const impactAngleDeg = (impactAngleRad * 180) / Math.PI;

    // Generate high-density trajectory points
    const sampleCount = 100;
    const dt = timeOfFlight / sampleCount;
    const trajectory: TrajectoryPoint[] = [];

    for (let i = 0; i <= sampleCount; i++) {
      const t = Math.min(timeOfFlight, i * dt);
      const x = vx0 * t;
      const y = Math.max(0, h0 + vy0 * t - 0.5 * g * t * t);
      const vx = vx0;
      const vy = vy0 - g * t;
      const speed = Math.hypot(vx, vy);

      trajectory.push({
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        t: Number(t.toFixed(2)),
        vx: Number(vx.toFixed(2)),
        vy: Number(vy.toFixed(2)),
        speed: Number(speed.toFixed(2))
      });
    }

    const keyPoints = [
      {
        type: 'launch' as const,
        x: 0,
        y: Number(h0.toFixed(2)),
        t: 0,
        label: `Launch (${v0} m/s @ ${angleDeg}°)`,
        description: `Initial launch position with elevation ${h0}m`
      },
      {
        type: 'apex' as const,
        x: Number((vx0 * timeToApex).toFixed(2)),
        y: Number(maxHeight.toFixed(2)),
        t: Number(timeToApex.toFixed(2)),
        label: `Apex (${maxHeight.toFixed(1)}m)`,
        description: `Peak altitude where vertical velocity vy = 0 m/s`
      },
      {
        type: 'impact' as const,
        x: Number(range.toFixed(2)),
        y: 0,
        t: Number(timeOfFlight.toFixed(2)),
        label: `Impact (${range.toFixed(1)}m)`,
        description: `Ground landing after ${timeOfFlight.toFixed(2)}s flight time`
      }
    ];

    return {
      v0: Number(v0.toFixed(2)),
      angleDeg: Number(angleDeg.toFixed(2)),
      g: Number(g.toFixed(2)),
      h0: Number(h0.toFixed(2)),
      timeOfFlight: Number(timeOfFlight.toFixed(2)),
      maxHeight: Number(maxHeight.toFixed(2)),
      timeToApex: Number(timeToApex.toFixed(2)),
      range: Number(range.toFixed(2)),
      impactVelocity: {
        vx: Number(impactVx.toFixed(2)),
        vy: Number(impactVy.toFixed(2)),
        speed: Number(impactSpeed.toFixed(2)),
        angleDeg: Number(impactAngleDeg.toFixed(2))
      },
      keyPoints,
      trajectory
    };
  }
}
