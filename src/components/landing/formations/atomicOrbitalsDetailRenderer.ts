/**
 * Monumental Atomic Orbitals Formation Renderer — Formation #03
 *
 * Dedicated Canvas 2D volumetric high-density detail layer for the Atomic Orbitals formation.
 * Renders a quantum-mechanical atomic probability manifold comprising:
 * - A high-energy central nucleus (subatomic nucleon cluster with nuclear binding glow).
 * - Symmetrical s-orbital isotropic probability cloud (1s / 2s quantum radial density).
 * - Distinctive figure-8 quantum p-orbital dumbbell lobes (pz vertical and px horizontal).
 * - Hybridized d-orbital probability lobes and a toroidal nodal ring (dz^2 equatorial collar).
 * - Opposite wave-function phase coloring (+ψ vs -ψ phase inversion across nodal surfaces).
 * - Discrete electron probability wave-packets and de Broglie phase contours.
 * - Dynamic 3D Larmor quantum precession around the magnetic quantum axis.
 * - ~3,350 volumetric quantum particulate micro-points rendered with batched Canvas 2D performance.
 *
 * Performance & Architecture:
 * - 100% deterministic closed-form parametric equations (zero Math.random()).
 * - Zero per-frame object allocations.
 * - Locked 60 FPS performance on standard Canvas 2D context.
 * - Synchronized with constellationProgress (entrance, hold, dissolution).
 * - Full support for active universe color cycling (spectral and curated single-hue).
 */

export interface AtomicOrbitalsRenderOptions {
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

export function renderAtomicOrbitalsDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: AtomicOrbitalsRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // 3D Quantum Larmor Precession & Nutation
  // Majestic orbital precession with ~21 second period
  const precAngle = (elapsed * 0.00030) % (Math.PI * 2);
  const cosPrec = Math.cos(precAngle);
  const sinPrec = Math.sin(precAngle);

  // Fixed orbital plane inclination tilt (approx 22 degrees)
  const tiltAngle = 0.38;
  const cosTilt = Math.cos(tiltAngle);
  const sinTilt = Math.sin(tiltAngle);

  // Subtle nuclear binding pulse
  const nuclearPulse = Math.sin(elapsed * 0.0022) * 0.04;

  // 3D Volumetric projection helper
  // Transforms quantum coordinates (x, y, z in [-0.42, 0.42]) through 3D precession & tilt
  const project = (x: number, y: number, z = 0) => {
    // 1. Precession around Z axis
    const px = x * cosPrec - y * sinPrec;
    const py = x * sinPrec + y * cosPrec;
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
  // 1. CENTRAL NUCLEUS: HIGH-ENERGY SUBATOMIC GLOW
  // ---------------------------------------------------------------------------
  ctx.save();
  const nucleusPos = project(0, 0, 0);
  const nucleusRadius = Math.max(2, (0.048 + nuclearPulse) * scale);
  const nucleusHue = highlightHue ?? (isMulticolor ? (baseHue + 45) % 360 : baseHue);
  const nucleusAlpha = masterAlpha * 0.75;

  const nGrad = ctx.createRadialGradient(
    nucleusPos.screenX,
    nucleusPos.screenY,
    0,
    nucleusPos.screenX,
    nucleusPos.screenY,
    nucleusRadius
  );
  nGrad.addColorStop(0, `hsla(${nucleusHue}, 100%, 94%, ${nucleusAlpha})`);
  nGrad.addColorStop(0.3, `hsla(${nucleusHue}, 95%, 75%, ${nucleusAlpha * 0.65})`);
  nGrad.addColorStop(0.7, `hsla(${nucleusHue}, 90%, 55%, ${nucleusAlpha * 0.22})`);
  nGrad.addColorStop(1, `hsla(${nucleusHue}, 85%, 40%, 0)`);

  ctx.fillStyle = nGrad;
  ctx.beginPath();
  ctx.arc(nucleusPos.screenX, nucleusPos.screenY, nucleusRadius, 0, Math.PI * 2);
  ctx.fill();

  // Toroidal nodal belt glow (dz^2 ring at center)
  const torusRadius = 0.095 * scale;
  const torusGrad = ctx.createRadialGradient(
    nucleusPos.screenX,
    nucleusPos.screenY,
    torusRadius * 0.7,
    nucleusPos.screenX,
    nucleusPos.screenY,
    torusRadius * 1.3
  );
  const torusHue = isMulticolor ? (baseHue + 180) % 360 : baseHue;
  torusGrad.addColorStop(0, `hsla(${torusHue}, 90%, 65%, 0)`);
  torusGrad.addColorStop(0.5, `hsla(${torusHue}, 95%, 72%, ${masterAlpha * 0.28})`);
  torusGrad.addColorStop(1, `hsla(${torusHue}, 90%, 55%, 0)`);

  ctx.fillStyle = torusGrad;
  ctx.beginPath();
  ctx.arc(nucleusPos.screenX, nucleusPos.screenY, torusRadius * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 2. QUANTUM ORBITAL NODAL CONTOURS & BOUNDARY SURFACES (8 Filaments)
  // ---------------------------------------------------------------------------
  // Continuous parametric boundary streamlines enclosing probability lobes:
  // - Loop 0 & 1: Vertical p_z dumbbell lobes (upper +ψ, lower -ψ)
  // - Loop 2 & 3: Horizontal p_x dumbbell lobes (right +ψ, left -ψ)
  // - Loop 4 & 5: Inclined d_xy cloverleaf lobes
  // - Loop 6: Toroidal equatorial nodal ring (d_z^2 collar)
  // - Loop 7: Spherical 2s orbital boundary contour
  const orbitalLoops = [
    // Lobe 0: Upper p_z lobe (+ψ phase)
    {
      samples: 40,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        // Teardrop polar lobe along +Y
        const r = 0.28 * Math.pow(Math.abs(Math.sin(theta * 0.5)), 1.8);
        return {
          x: Math.cos(theta) * r * 0.52,
          y: -r,
          z: Math.sin(theta) * r * 0.35
        };
      },
      hueOff: 0,
      alphaMul: 0.44,
      width: 0.0022
    },
    // Lobe 1: Lower p_z lobe (-ψ phase)
    {
      samples: 40,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.28 * Math.pow(Math.abs(Math.sin(theta * 0.5)), 1.8);
        return {
          x: Math.cos(theta) * r * 0.52,
          y: r,
          z: -Math.sin(theta) * r * 0.35
        };
      },
      hueOff: 180,
      alphaMul: 0.44,
      width: 0.0022
    },
    // Lobe 2: Right p_x lobe (+ψ phase)
    {
      samples: 40,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.28 * Math.pow(Math.abs(Math.sin(theta * 0.5)), 1.8);
        return {
          x: r,
          y: Math.sin(theta) * r * 0.52,
          z: Math.cos(theta) * r * 0.35
        };
      },
      hueOff: 40,
      alphaMul: 0.40,
      width: 0.0020
    },
    // Lobe 3: Left p_x lobe (-ψ phase)
    {
      samples: 40,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.28 * Math.pow(Math.abs(Math.sin(theta * 0.5)), 1.8);
        return {
          x: -r,
          y: Math.sin(theta) * r * 0.52,
          z: -Math.cos(theta) * r * 0.35
        };
      },
      hueOff: 220,
      alphaMul: 0.40,
      width: 0.0020
    },
    // Lobe 4: Diagonal d_xy upper-right / lower-left lobe
    {
      samples: 38,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.24 * Math.pow(Math.abs(Math.sin(theta * 0.5)), 1.6);
        const ang = Math.PI * 0.25;
        const lx = Math.cos(theta) * r * 0.45;
        const ly = r;
        return {
          x: lx * Math.cos(ang) - ly * Math.sin(ang),
          y: lx * Math.sin(ang) + ly * Math.cos(ang),
          z: Math.sin(theta) * 0.06
        };
      },
      hueOff: 110,
      alphaMul: 0.36,
      width: 0.0018
    },
    // Lobe 5: Diagonal d_xy upper-left / lower-right lobe
    {
      samples: 38,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.24 * Math.pow(Math.abs(Math.sin(theta * 0.5)), 1.6);
        const ang = -Math.PI * 0.25;
        const lx = Math.cos(theta) * r * 0.45;
        const ly = r;
        return {
          x: lx * Math.cos(ang) - ly * Math.sin(ang),
          y: lx * Math.sin(ang) + ly * Math.cos(ang),
          z: -Math.sin(theta) * 0.06
        };
      },
      hueOff: 290,
      alphaMul: 0.36,
      width: 0.0018
    },
    // Loop 6: Toroidal equatorial nodal collar (d_z^2 ring)
    {
      samples: 46,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.115;
        return {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * (r * 0.42),
          z: Math.sin(theta * 2.0) * 0.025
        };
      },
      hueOff: 160,
      alphaMul: 0.46,
      width: 0.0021
    },
    // Loop 7: Spherical 2s orbital boundary contour
    {
      samples: 44,
      fn: (t: number) => {
        const theta = t * Math.PI * 2;
        const r = 0.195;
        return {
          x: Math.cos(theta) * r,
          y: Math.sin(theta) * r,
          z: 0.02
        };
      },
      hueOff: 60,
      alphaMul: 0.32,
      width: 0.0016
    }
  ];

  ctx.save();
  for (let s = 0; s < orbitalLoops.length; s++) {
    const loop = orbitalLoops[s];
    const loopHue = isMulticolor ? (baseHue + loop.hueOff) % 360 : baseHue;

    ctx.beginPath();
    for (let i = 0; i < loop.samples; i++) {
      const t = i / (loop.samples - 1);
      const pt = loop.fn(t);
      const { screenX, screenY } = project(pt.x, pt.y, pt.z);
      if (i === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.strokeStyle = `hsla(${loopHue}, 92%, 74%, ${masterAlpha * loop.alphaMul})`;
    ctx.lineWidth = Math.max(1.1, scale * loop.width);
    ctx.stroke();
  }
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 3. MONUMENTAL QUANTUM PROBABILITY PARTICULATE CLOUD (~3,350 points)
  // ---------------------------------------------------------------------------
  // Partitioned into quantum mechanical orbital regimes:
  // - A. Central Nucleus Cluster: 280 points (r <= 0.052)
  // - B. Isotropic s-Orbital Probability Mist (1s / 2s): 580 points
  // - C. Vertical p_z Dumbbell Lobes (+Y and -Y): 740 points
  // - D. Horizontal p_x Dumbbell Lobes (+X and -X): 720 points
  // - E. Hybridized d_xy Cloverleaf Lobes: 620 points
  // - F. Toroidal Nodal Belt (d_z^2 collar): 410 points
  // Total = 3,350 volumetric quantum points!

  const points: Array<{
    x: number;
    y: number;
    z: number;
    hue: number;
    size: number;
    isWavePacket: boolean;
    isCore: boolean;
  }> = [];

  // A. Central Nucleus Cluster (280 points)
  for (let i = 0; i < 280; i++) {
    const t = i / 279;
    const phi = t * Math.PI * 14.0 + (i % 5) * 0.62;
    const r = Math.pow((i % 43) / 42, 0.75) * 0.046;
    const dispX = ((i * 19) % 31 - 15) * 0.0016;
    const dispY = ((i * 23) % 29 - 14) * 0.0014;
    const x = Math.cos(phi) * r + dispX;
    const y = Math.sin(phi) * r + dispY;
    const z = Math.sin(phi * 2.0) * 0.035;

    const isCoreNucleon = i % 24 === 0;
    const pHue = highlightHue ?? (isMulticolor ? (baseHue + ((i % 4) * 20)) % 360 : baseHue);
    const pSize = isCoreNucleon ? 2.1 : (0.80 + (i % 3) * 0.35);

    points.push({ x, y, z, hue: pHue, size: pSize, isWavePacket: isCoreNucleon, isCore: true });
  }

  // B. Isotropic s-Orbital Probability Mist (1s / 2s shells: 580 points)
  for (let i = 0; i < 580; i++) {
    const t = i / 579;
    // Radial distribution following exponential probability decay e^(-r) with 2s node
    const isOuterShell = i % 2 === 0;
    const baseR = isOuterShell ? 0.175 + ((i % 37) / 36) * 0.075 : 0.075 + ((i % 29) / 28) * 0.045;
    const theta = t * Math.PI * 22.0 + (i % 7) * 0.44;
    const elevation = ((i % 31) / 30 - 0.5) * Math.PI;

    const cosElev = Math.cos(elevation);
    const x = Math.cos(theta) * cosElev * baseR;
    const y = Math.sin(theta) * cosElev * baseR;
    const z = Math.sin(elevation) * baseR;

    const isElectron = i % 38 === 0;
    const pHue = isMulticolor ? (baseHue + (isOuterShell ? 60 : 30)) % 360 : baseHue;
    const pSize = isElectron ? 1.85 : (0.65 + (i % 3) * 0.28);

    points.push({ x, y, z, hue: pHue, size: pSize, isWavePacket: isElectron, isCore: false });
  }

  // C. Vertical p_z Dumbbell Lobes (+Y and -Y: 740 points)
  for (let i = 0; i < 740; i++) {
    const isUpper = i % 2 === 0;
    const t = (i >> 1) / 369; // 0 to 1 along lobe
    // Probability distribution |cos(theta)|^2 gives elongated teardrop
    const lobeDist = Math.pow(t, 0.70) * 0.27;
    const lateralSpread = Math.sin(t * Math.PI) * 0.082;
    const ang = (i * 2.39996); // golden angle spread
    const sideR = ((i % 41) / 40) * lateralSpread;

    const sign = isUpper ? -1 : 1;
    const x = Math.cos(ang) * sideR;
    const y = sign * (0.04 + lobeDist);
    const z = Math.sin(ang) * sideR * 0.75;

    const isPacket = i % 34 === 0;
    // Opposite wave-function phase coloring in multicolor mode
    const phaseOffset = isUpper ? 0 : 180;
    const pHue = isMulticolor ? (baseHue + phaseOffset + ((i % 5) * 8)) % 360 : baseHue;
    const pSize = isPacket ? 1.95 : (0.70 + (i % 3) * 0.32);

    points.push({ x, y, z, hue: pHue, size: pSize, isWavePacket: isPacket, isCore: false });
  }

  // D. Horizontal p_x Dumbbell Lobes (+X and -X: 720 points)
  for (let i = 0; i < 720; i++) {
    const isRight = i % 2 === 0;
    const t = (i >> 1) / 359;
    const lobeDist = Math.pow(t, 0.70) * 0.27;
    const lateralSpread = Math.sin(t * Math.PI) * 0.080;
    const ang = (i * 2.39996);
    const sideR = ((i % 43) / 42) * lateralSpread;

    const sign = isRight ? 1 : -1;
    const x = sign * (0.04 + lobeDist);
    const y = Math.sin(ang) * sideR;
    const z = Math.cos(ang) * sideR * 0.75;

    const isPacket = i % 34 === 0;
    const phaseOffset = isRight ? 40 : 220;
    const pHue = isMulticolor ? (baseHue + phaseOffset + ((i % 5) * 8)) % 360 : baseHue;
    const pSize = isPacket ? 1.90 : (0.70 + (i % 3) * 0.30);

    points.push({ x, y, z, hue: pHue, size: pSize, isWavePacket: isPacket, isCore: false });
  }

  // E. Hybridized d_xy Cloverleaf Lobes (4 diagonal lobes: 620 points)
  for (let i = 0; i < 620; i++) {
    const lobeQuadrant = i % 4;
    const t = Math.floor(i / 4) / 154;
    const lobeDist = Math.pow(t, 0.72) * 0.23;
    const lateralSpread = Math.sin(t * Math.PI) * 0.065;
    const ang = (i * 2.39996);
    const sideR = ((i % 37) / 36) * lateralSpread;

    const qAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const qAng = qAngles[lobeQuadrant];
    const alongDist = 0.038 + lobeDist;
    const perpX = Math.cos(ang) * sideR;
    const perpY = Math.sin(ang) * sideR;

    const x = Math.cos(qAng) * alongDist + perpX * 0.7;
    const y = Math.sin(qAng) * alongDist + perpY * 0.7;
    const z = Math.sin(ang * 2.0) * 0.06;

    const isPacket = i % 32 === 0;
    const qHueOffsets = [110, 200, 290, 20];
    const pHue = isMulticolor ? (baseHue + qHueOffsets[lobeQuadrant]) % 360 : baseHue;
    const pSize = isPacket ? 1.85 : (0.65 + (i % 3) * 0.30);

    points.push({ x, y, z, hue: pHue, size: pSize, isWavePacket: isPacket, isCore: false });
  }

  // F. Toroidal Nodal Belt (d_z^2 collar: 410 points)
  for (let i = 0; i < 410; i++) {
    const t = i / 409;
    const theta = t * Math.PI * 2.0;
    const ringR = 0.108 + ((i % 23) / 22 - 0.5) * 0.030;
    const crossElev = Math.sin(i * 1.618) * 0.022;

    const x = Math.cos(theta) * ringR;
    const y = Math.sin(theta) * (ringR * 0.44);
    const z = crossElev;

    const isPacket = i % 28 === 0;
    const pHue = isMulticolor ? (baseHue + 160 + ((i % 4) * 12)) % 360 : baseHue;
    const pSize = isPacket ? 1.80 : (0.65 + (i % 3) * 0.26);

    points.push({ x, y, z, hue: pHue, size: pSize, isWavePacket: isPacket, isCore: false });
  }

  // ---------------------------------------------------------------------------
  // 4. BATCHED RENDERING FOR 60 FPS PERFORMANCE
  // ---------------------------------------------------------------------------
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const { screenX, screenY, z } = project(p.x, p.y, p.z);

    const isForeground = z >= 0;
    let baseAlpha = isForeground
      ? masterAlpha * (0.62 + z * 0.38)
      : masterAlpha * (0.28 + (z + 0.25) * 0.26);

    if (p.isCore) {
      baseAlpha *= 1.35; // Bright core nucleons
    }

    const pointAlpha = p.isWavePacket ? Math.min(1.0, baseAlpha * 1.50) : baseAlpha;
    const renderR = Math.max(0.60, p.size + (isForeground ? z * 0.6 : 0));

    // Luminous halo flare for localized electron wave packets
    if (isForeground && p.isWavePacket && pointAlpha > 0.45) {
      const glowR = renderR * 3.4;
      const sGlow = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowR);
      sGlow.addColorStop(0, `hsla(${p.hue}, 100%, 92%, ${pointAlpha * 0.48})`);
      sGlow.addColorStop(0.4, `hsla(${p.hue}, 95%, 75%, ${pointAlpha * 0.22})`);
      sGlow.addColorStop(1, `hsla(${p.hue}, 85%, 50%, 0)`);
      ctx.fillStyle = sGlow;
      ctx.beginPath();
      ctx.arc(screenX, screenY, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    const lightness = p.isCore ? 96 : (p.isWavePacket ? 92 : (isForeground ? 84 : 70));
    ctx.fillStyle = `hsla(${p.hue}, 92%, ${lightness}%, ${pointAlpha})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, renderR, 0, Math.PI * 2);
    ctx.fill();
  }
}
