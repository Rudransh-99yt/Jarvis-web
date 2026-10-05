import { requirePrincipal } from '../../../auth/principal.ts';
// Deterministic Projectile Motion & Kinematics Engine for Visualizations

export interface ProjectileCalculationInput {
  initialVelocity: number; // m/s (e.g. 20)
  launchAngleDeg: number; // 0 to 90 degrees
  initialHeight?: number; // meters (e.g. 0)
  gravity?: number; // m/s^2 (default 9.8)
  sampleSteps?: number;
}

export interface ProjectileCalculationOutput {
  flightTimeSeconds: number;
  maxHeightMeters: number;
  horizontalRangeMeters: number;
  apexTimeSeconds: number;
  trajectoryPoints: Array<{ x: number; y: number; t: number }>;
}

export class PhysicsEngine {
  public static calculateProjectileMotion(input: ProjectileCalculationInput): ProjectileCalculationOutput {
    const v0 = Math.max(0, Math.min(1000, Number(input.initialVelocity) || 0));
    const angleDeg = Math.max(0, Math.min(90, Number(input.launchAngleDeg) || 0));
    const y0 = Math.max(0, Math.min(5000, Number(input.initialHeight) || 0));
    const g = Math.max(0.1, Math.min(100, Number(input.gravity) || 9.8));
    const steps = Math.max(20, Math.min(300, Number(input.sampleSteps) || 100));

    const angleRad = (angleDeg * Math.PI) / 180;
    const v0x = v0 * Math.cos(angleRad);
    const v0y = v0 * Math.sin(angleRad);

    // Time to reach peak (apex)
    const tApex = v0y > 0 ? v0y / g : 0;
    const maxHeight = y0 + (v0y * v0y) / (2 * g);

    // Total flight time solving y(t) = y0 + v0y*t - 0.5*g*t^2 = 0
    // 0.5*g*t^2 - v0y*t - y0 = 0 -> quadratic formula: t = (v0y + sqrt(v0y^2 + 2*g*y0)) / g
    const discriminant = v0y * v0y + 2 * g * y0;
    const totalFlightTime = discriminant >= 0 ? (v0y + Math.sqrt(discriminant)) / g : 0;
    const horizontalRange = v0x * totalFlightTime;

    const trajectoryPoints: Array<{ x: number; y: number; t: number }> = [];

    if (totalFlightTime > 0) {
      const dt = totalFlightTime / (steps - 1);
      for (let i = 0; i < steps; i++) {
        const t = Math.min(totalFlightTime, i * dt);
        const x = v0x * t;
        const y = Math.max(0, y0 + v0y * t - 0.5 * g * t * t);
        trajectoryPoints.push({
          x: Number(x.toFixed(3)),
          y: Number(y.toFixed(3)),
          t: Number(t.toFixed(3))
        });
      }
    } else {
      trajectoryPoints.push({ x: 0, y: y0, t: 0 });
    }

    return {
      flightTimeSeconds: Number(totalFlightTime.toFixed(3)),
      maxHeightMeters: Number(maxHeight.toFixed(3)),
      horizontalRangeMeters: Number(horizontalRange.toFixed(3)),
      apexTimeSeconds: Number(tApex.toFixed(3)),
      trajectoryPoints
    };
  }
}
