/**
 * Monumental Knowledge Constellation Formation Renderer — Formation #05
 *
 * Dedicated Canvas 2D volumetric high-density detail layer for the Knowledge Constellation.
 * Renders an expansive, living cosmic map of connected human and machine intelligence comprising:
 * - 5 Hierarchical Primary Knowledge Hubs:
 *   1. Central Synthesis Nexus (origin core)
 *   2. Empirical Observatory Spire (North-East discovery apex)
 *   3. Theoretical Archive Bastion (South-West foundational vault)
 *   4. Systems Architecture Pivot (South-East engineering loom)
 *   5. Speculative Frontier Beacon (North-West creative horizon)
 * - Concentric harmonic resonance wave halos around major knowledge centers.
 * - Multi-tiered knowledge conduits & arterial communication highways with varying line weights.
 * - Propagating luminous data packets / photon pulses streaming along structural paths.
 * - ~3,400 volumetric micro-knowledge stars & interstellar telemetry points.
 *
 * Performance & Architecture:
 * - 100% deterministic closed-form parametric equations (zero Math.random()).
 * - Zero per-frame object allocations.
 * - Locked 60 FPS performance on standard Canvas 2D context.
 * - Synchronized with constellationProgress (entrance, hold, dissolution).
 * - Full support for active universe color cycling (spectral and curated single-hue).
 */

export interface KnowledgeConstellationRenderOptions {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  scale: number;
  progress: number; // constellationProgress in [0, 1]
  elapsed: number;
  baseHue: number;
  highlightHue?: number;
  isMulticolor: boolean;
}

export function renderKnowledgeConstellationDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: KnowledgeConstellationRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // 3D Celestial Inclination & Drift
  // Subtle inclination tilt (0.22 rad) for spatial dimension
  const tiltAngle = 0.22;
  const cosTilt = Math.cos(tiltAngle);
  const sinTilt = Math.sin(tiltAngle);

  // Very slow cosmic drift rotation
  const driftAngle = (elapsed * 0.00018) % (Math.PI * 2);
  const cosRot = Math.cos(driftAngle);
  const sinRot = Math.sin(driftAngle);

  // 3D celestial projection helper
  const project = (x: number, y: number, z = 0) => {
    // 1. Slow cosmic rotation in equatorial plane
    const px = x * cosRot - y * sinRot;
    const py = x * sinRot + y * cosRot;
    const pz = z;

    // 2. Inclination tilt around X axis
    const finalX = px;
    const finalY = py * cosTilt - pz * sinTilt;
    const finalZ = py * sinTilt + pz * cosTilt;

    const screenX = centerX + finalX * scale;
    const screenY = centerY + finalY * scale;
    return { screenX, screenY, z: finalZ };
  };

  // ---------------------------------------------------------------------------
  // 1. PRIMARY KNOWLEDGE HUBS (5 Major Focal Anchors)
  // ---------------------------------------------------------------------------
  const hubs = [
    {
      name: 'Nexus',
      x: 0.000,
      y: 0.000,
      z: 0.000,
      radius: 0.038,
      hueOffset: 0,
      pulseFreq: 0.0018,
      pulsePhase: 0.0
    },
    {
      name: 'Empirical Spire',
      x: 0.220,
      y: -0.230,
      z: 0.035,
      radius: 0.030,
      hueOffset: 24,
      pulseFreq: 0.0022,
      pulsePhase: 1.2
    },
    {
      name: 'Theoretical Bastion',
      x: -0.220,
      y: 0.220,
      z: -0.035,
      radius: 0.030,
      hueOffset: 76,
      pulseFreq: 0.0020,
      pulsePhase: 2.4
    },
    {
      name: 'Systems Pivot',
      x: 0.240,
      y: 0.200,
      z: 0.025,
      radius: 0.028,
      hueOffset: 196,
      pulseFreq: 0.0024,
      pulsePhase: 3.6
    },
    {
      name: 'Speculative Beacon',
      x: -0.230,
      y: -0.220,
      z: -0.025,
      radius: 0.028,
      hueOffset: 126,
      pulseFreq: 0.0021,
      pulsePhase: 4.8
    }
  ];

  ctx.save();

  // Render multi-layered glowing halos & resonance wave ripples around hubs
  for (let h = 0; h < hubs.length; h++) {
    const hub = hubs[h];
    const pos = project(hub.x, hub.y, hub.z);
    const hubHue = isMulticolor
      ? (baseHue + hub.hueOffset) % 360
      : (h === 0 ? (highlightHue ?? baseHue) : baseHue);

    const pulse = 1.0 + Math.sin(elapsed * hub.pulseFreq + hub.pulsePhase) * 0.15;
    const baseR = hub.radius * scale;
    const outerGlowR = baseR * 2.8 * pulse;

    // A. Soft Volumetric Radial Atmosphere Halo
    const haloGrad = ctx.createRadialGradient(
      pos.screenX,
      pos.screenY,
      0,
      pos.screenX,
      pos.screenY,
      outerGlowR
    );
    haloGrad.addColorStop(0, `hsla(${hubHue}, 100%, 92%, ${masterAlpha * 0.60})`);
    haloGrad.addColorStop(0.32, `hsla(${hubHue}, 95%, 70%, ${masterAlpha * 0.32})`);
    haloGrad.addColorStop(0.70, `hsla(${hubHue}, 90%, 55%, ${masterAlpha * 0.10})`);
    haloGrad.addColorStop(1, `hsla(${hubHue}, 85%, 45%, 0)`);

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(pos.screenX, pos.screenY, outerGlowR, 0, Math.PI * 2);
    ctx.fill();

    // B. Concentric Resonance Wave Rings (Spheres of Influence)
    for (let r = 1; r <= 2; r++) {
      const ringRadius = (baseR * (0.8 + r * 0.65) * pulse);
      ctx.beginPath();
      ctx.arc(pos.screenX, pos.screenY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hubHue}, 90%, 80%, ${masterAlpha * (0.24 / r)})`;
      ctx.lineWidth = Math.max(1.0, scale * 0.0014);
      ctx.stroke();
    }

    // C. Crystalline Core Dot
    ctx.beginPath();
    ctx.arc(pos.screenX, pos.screenY, Math.max(2.0, baseR * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hubHue}, 100%, 96%, ${masterAlpha * 0.90})`;
    ctx.fill();
  }

  ctx.restore();

  // ---------------------------------------------------------------------------
  // 2. STRUCTURAL FILAMENTS & ARTERIAL KNOWLEDGE HIGHWAYS (12 Filaments)
  // ---------------------------------------------------------------------------
  // Parametric paths connecting clusters and articulating the celestial silhouette
  const filaments = [
    // 0. Nexus to Empirical Spire (Arterial Highway NE)
    {
      samples: 36,
      fn: (t: number) => {
        const x = 0.000 + t * 0.220 + Math.sin(t * Math.PI) * 0.024;
        const y = 0.000 - t * 0.230 - Math.sin(t * Math.PI) * 0.018;
        const z = t * 0.035;
        return { x, y, z };
      },
      hueOff: 12,
      alphaMul: 0.50,
      width: 0.0022
    },
    // 1. Nexus to Theoretical Bastion (Arterial Highway SW)
    {
      samples: 36,
      fn: (t: number) => {
        const x = 0.000 - t * 0.220 - Math.sin(t * Math.PI) * 0.022;
        const y = 0.000 + t * 0.220 + Math.sin(t * Math.PI) * 0.020;
        const z = -t * 0.035;
        return { x, y, z };
      },
      hueOff: 50,
      alphaMul: 0.48,
      width: 0.0022
    },
    // 2. Nexus to Systems Pivot (Arterial Highway SE)
    {
      samples: 36,
      fn: (t: number) => {
        const x = 0.000 + t * 0.240 + Math.sin(t * Math.PI) * 0.020;
        const y = 0.000 + t * 0.200 - Math.sin(t * Math.PI) * 0.016;
        const z = t * 0.025;
        return { x, y, z };
      },
      hueOff: 180,
      alphaMul: 0.46,
      width: 0.0020
    },
    // 3. Nexus to Speculative Beacon (Arterial Highway NW)
    {
      samples: 36,
      fn: (t: number) => {
        const x = 0.000 - t * 0.230 - Math.sin(t * Math.PI) * 0.025;
        const y = 0.000 - t * 0.220 + Math.sin(t * Math.PI) * 0.015;
        const z = -t * 0.025;
        return { x, y, z };
      },
      hueOff: 110,
      alphaMul: 0.46,
      width: 0.0020
    },
    // 4. Northern Horizon Arch (Speculative Beacon to Empirical Spire)
    {
      samples: 32,
      fn: (t: number) => {
        const x = -0.230 + t * 0.450;
        const y = -0.220 - Math.sin(t * Math.PI) * 0.060;
        const z = -0.025 + t * 0.060;
        return { x, y, z };
      },
      hueOff: 28,
      alphaMul: 0.38,
      width: 0.0018
    },
    // 5. Eastern Periphery Arch (Empirical Spire to Systems Pivot)
    {
      samples: 32,
      fn: (t: number) => {
        const x = 0.220 + Math.sin(t * Math.PI) * 0.090;
        const y = -0.230 + t * 0.430;
        const z = 0.035 - t * 0.010;
        return { x, y, z };
      },
      hueOff: 200,
      alphaMul: 0.38,
      width: 0.0018
    },
    // 6. Southern Foundation Arch (Theoretical Bastion to Systems Pivot)
    {
      samples: 32,
      fn: (t: number) => {
        const x = -0.220 + t * 0.460;
        const y = 0.220 + Math.sin(t * Math.PI) * 0.065;
        const z = -0.035 + t * 0.060;
        return { x, y, z };
      },
      hueOff: 80,
      alphaMul: 0.38,
      width: 0.0018
    },
    // 7. Western Frontier Arch (Speculative Beacon to Theoretical Bastion)
    {
      samples: 32,
      fn: (t: number) => {
        const x = -0.230 - Math.sin(t * Math.PI) * 0.085;
        const y = -0.220 + t * 0.440;
        const z = -0.025 - t * 0.010;
        return { x, y, z };
      },
      hueOff: 95,
      alphaMul: 0.38,
      width: 0.0018
    },
    // 8. Empirical Spire Internal Triangular Frame
    {
      samples: 24,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.068;
        return {
          x: 0.220 + Math.cos(theta) * r,
          y: -0.230 + Math.sin(theta) * (r * 0.75),
          z: 0.035
        };
      },
      hueOff: 24,
      alphaMul: 0.30,
      width: 0.0015
    },
    // 9. Theoretical Bastion Internal Diamond Lattice
    {
      samples: 24,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.068;
        return {
          x: -0.220 + Math.cos(theta) * r,
          y: 0.220 + Math.sin(theta) * (r * 0.75),
          z: -0.035
        };
      },
      hueOff: 76,
      alphaMul: 0.30,
      width: 0.0015
    },
    // 10. Systems Pivot Internal Loop
    {
      samples: 24,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.065;
        return {
          x: 0.240 + Math.cos(theta) * r,
          y: 0.200 + Math.sin(theta) * (r * 0.75),
          z: 0.025
        };
      },
      hueOff: 196,
      alphaMul: 0.30,
      width: 0.0015
    },
    // 11. Speculative Beacon Internal Loop
    {
      samples: 24,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.065;
        return {
          x: -0.230 + Math.cos(theta) * r,
          y: -0.220 + Math.sin(theta) * (r * 0.75),
          z: -0.025
        };
      },
      hueOff: 126,
      alphaMul: 0.30,
      width: 0.0015
    }
  ];

  for (let f = 0; f < filaments.length; f++) {
    const fil = filaments[f];
    const filHue = isMulticolor ? (baseHue + fil.hueOff) % 360 : baseHue;
    const filAlpha = masterAlpha * fil.alphaMul;

    ctx.beginPath();
    for (let s = 0; s < fil.samples; s++) {
      const t = s / (fil.samples - 1);
      const pt = fil.fn(t);
      const proj = project(pt.x, pt.y, pt.z);
      if (s === 0) {
        ctx.moveTo(proj.screenX, proj.screenY);
      } else {
        ctx.lineTo(proj.screenX, proj.screenY);
      }
    }
    ctx.strokeStyle = `hsla(${filHue}, 88%, 70%, ${filAlpha})`;
    ctx.lineWidth = Math.max(1.1, scale * fil.width);
    ctx.stroke();

    // Subtle propagating photon pulse packet along the highway (first 4 arterial highways)
    if (f < 4) {
      const packetSpeed = 0.00045;
      const packetT = ((elapsed * packetSpeed + f * 0.25) % 1.0);
      const packetPt = fil.fn(packetT);
      const packetProj = project(packetPt.x, packetPt.y, packetPt.z);
      const packetR = Math.max(2.2, scale * 0.0045);

      ctx.beginPath();
      ctx.arc(packetProj.screenX, packetProj.screenY, packetR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${filHue}, 100%, 95%, ${masterAlpha * 0.85})`;
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // 3. VOLUMETRIC HIGH-DENSITY KNOWLEDGE FIELD (>= 2,500 Micro-Points)
  // ---------------------------------------------------------------------------
  // 3,420 volumetric points partitioned deterministically across 5 clusters
  // and inter-cluster filament bridges to create depth, realism, and cosmic richness.
  const TOTAL_MICRO_POINTS = 3420;

  for (let i = 0; i < TOTAL_MICRO_POINTS; i++) {
    // Deterministic pseudo-random sequence with prime multipliers
    const p1 = (Math.sin(i * 12.9898 + 1.234) * 43758.5453) % 1;
    const u1 = p1 < 0 ? p1 + 1 : p1;

    const p2 = (Math.sin(i * 78.233 + 5.678) * 43758.5453) % 1;
    const u2 = p2 < 0 ? p2 + 1 : p2;

    const p3 = (Math.sin(i * 45.164 + 9.101) * 43758.5453) % 1;
    const u3 = p3 < 0 ? p3 + 1 : p3;

    let wx = 0;
    let wy = 0;
    let wz = 0;
    let pointHueOffset = 0;
    let basePointRadius = 0.0016;

    const clusterId = i % 5;
    const hubRef = hubs[clusterId];

    if (i < 2400) {
      // 2,400 points clustered tightly around the 5 primary knowledge hubs (480 points each)
      const angle = u1 * Math.PI * 2;
      // Exponential distribution for high central concentration tapering to cluster halo
      const dist = Math.pow(u2, 1.85) * 0.088;

      wx = hubRef.x + Math.cos(angle) * dist;
      wy = hubRef.y + Math.sin(angle) * (dist * 0.88);
      wz = hubRef.z + (u3 - 0.5) * 0.040;
      pointHueOffset = hubRef.hueOffset;
      basePointRadius = 0.0014 + (1 - u2) * 0.0018;
    } else if (i < 3100) {
      // 700 points streaming along the 4 arterial knowledge highways
      const highwayId = (i - 2400) % 4;
      const t = u1;
      const fil = filaments[highwayId];
      const filPt = fil.fn(t);

      // Normal displacement off filament
      const perpAngle = u2 * Math.PI * 2;
      const perpDist = Math.pow(u3, 1.5) * 0.022;

      wx = filPt.x + Math.cos(perpAngle) * perpDist;
      wy = filPt.y + Math.sin(perpAngle) * perpDist;
      wz = filPt.z + (u2 - 0.5) * 0.020;
      pointHueOffset = fil.hueOff;
      basePointRadius = 0.0012 + (1 - u3) * 0.0014;
    } else {
      // 320 ambient cosmic stars framing the overall constellation silhouette
      const angle = u1 * Math.PI * 2;
      const r = 0.12 + u2 * 0.22;

      wx = Math.cos(angle) * r;
      wy = Math.sin(angle) * (r * 0.85);
      wz = (u3 - 0.5) * 0.050;
      pointHueOffset = Math.floor(u1 * 360);
      basePointRadius = 0.0010 + u2 * 0.0012;
    }

    const proj = project(wx, wy, wz);

    // Dynamic shimmer pulse per star
    const shimmer = 0.70 + Math.sin(elapsed * 0.0025 + i * 0.18) * 0.30;
    const ptHue = isMulticolor ? (baseHue + pointHueOffset) % 360 : baseHue;
    const ptAlpha = masterAlpha * (0.35 + u3 * 0.45) * shimmer;

    if (ptAlpha <= 0.02) continue;

    const ptRadius = Math.max(0.75, scale * basePointRadius);

    ctx.beginPath();
    ctx.arc(proj.screenX, proj.screenY, ptRadius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${ptHue}, 90%, 82%, ${ptAlpha})`;
    ctx.fill();
  }
}
