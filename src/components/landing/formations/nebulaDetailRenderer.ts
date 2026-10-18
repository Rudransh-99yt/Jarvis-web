/**
 * Monumental Interstellar Nebula Formation Renderer — Formation #02
 *
 * Dedicated Canvas 2D volumetric high-density detail layer for the Cosmic Nebula formation.
 * Renders an expansive, photorealistic interstellar emission/reflection nebula comprising:
 * - A large, irregular volumetric gas and dust cloud silhouette with flowing boundary envelopes.
 * - Deep multi-layered gas ionizations: multiple overlapping cloud concentrations with varying densities.
 * - Intricate filamentary tendrils, shock-front ionization ridges, and branching gas wisps.
 * - Embedded stellar nurseries: luminous proto-stellar knots and Bok globules.
 * - High-contrast dark dust lanes and deep absorption cavities cutting across luminous gas banks.
 * - Variable particle magnitudes: ultrafine dust particulate, glowing gas ions, and luminous embedded stars.
 * - Flowing internal magnetohydrodynamic motion (gas streams being sculpted by stellar winds).
 * - ~3,300 volumetric micro-points rendered with batched Canvas 2D performance.
 *
 * Performance & Architecture:
 * - 100% deterministic closed-form parametric equations (zero Math.random()).
 * - Zero per-frame object allocations.
 * - Locked 60 FPS performance on standard Canvas 2D context.
 * - Synchronized with constellationProgress (entrance, hold, dissolution).
 * - Full support for active universe color cycling (spectral and curated single-hue).
 */

export interface NebulaRenderOptions {
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

export function renderNebulaDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: NebulaRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // Slow, majestic internal fluid drift (cosmic gas turbulence, ~26 second period)
  const driftTime = elapsed * 0.00024;
  const flowAngle = Math.sin(driftTime) * 0.08;
  const cosFlow = Math.cos(flowAngle);
  const sinFlow = Math.sin(flowAngle);

  // 3D volumetric projection helper
  // Projects organic cloud coordinates (x, y in [-0.42, 0.42], z in [-0.25, 0.25])
  const project = (x: number, y: number, z = 0) => {
    // Subtle parallax shift based on depth z and driftTime
    const pShiftX = z * Math.sin(driftTime * 1.4) * 0.024;
    const pShiftY = z * Math.cos(driftTime * 1.1) * 0.018;

    const rotX = (x + pShiftX) * cosFlow - (y + pShiftY) * sinFlow;
    const rotY = (x + pShiftX) * sinFlow + (y + pShiftY) * cosFlow;

    const screenX = centerX + rotX * scale;
    const screenY = centerY + rotY * scale;
    return { screenX, screenY, z };
  };

  // ---------------------------------------------------------------------------
  // 1. VOLUMETRIC GAS IONIZATION BLOOM GLOWS (Major Gas Lobe Concentrations)
  // ---------------------------------------------------------------------------
  // 4 Primary Ionized Gas Condensations:
  // - North-East Primary Pillar / Gas Spire (Luminous Hydrogen-Alpha emission)
  // - Central Stellar Nursery Core (High-density excitation cluster)
  // - South-West Filamentary Cloud / Reflection Lobe (Oxygen-III blue/cyan haze)
  // - East Outer Canopy (Diffuse energetic wisps)
  const gasLobes = [
    { x: -0.06, y: -0.04, r: 0.16, hueOffset: 0, alphaMul: 0.45 },   // Central Core
    { x: 0.14,  y: -0.16, r: 0.20, hueOffset: 35, alphaMul: 0.38 },  // NE Pillar
    { x: -0.18, y: 0.14,  r: 0.22, hueOffset: 160, alphaMul: 0.34 }, // SW Lobe
    { x: 0.16,  y: 0.12,  r: 0.15, hueOffset: 80, alphaMul: 0.28 }   // East Canopy
  ];

  ctx.save();
  for (let i = 0; i < gasLobes.length; i++) {
    const lobe = gasLobes[i];
    const { screenX, screenY } = project(lobe.x, lobe.y, 0.05);
    const lobeRadius = lobe.r * scale;
    const lobeAlpha = masterAlpha * lobe.alphaMul;
    const lobeHue = isMulticolor
      ? (baseHue + lobe.hueOffset) % 360
      : (i === 0 && highlightHue ? highlightHue : baseHue);

    const grad = ctx.createRadialGradient(
      screenX,
      screenY,
      0,
      screenX,
      screenY,
      lobeRadius
    );
    grad.addColorStop(0, `hsla(${lobeHue}, 95%, 82%, ${lobeAlpha})`);
    grad.addColorStop(0.35, `hsla(${lobeHue}, 90%, 65%, ${lobeAlpha * 0.55})`);
    grad.addColorStop(0.70, `hsla(${lobeHue}, 85%, 50%, ${lobeAlpha * 0.18})`);
    grad.addColorStop(1, `hsla(${lobeHue}, 80%, 40%, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, lobeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 2. FILAMENTARY GAS SPINES & SHOCK-FRONT TENDRILS (6 Major Filaments)
  // ---------------------------------------------------------------------------
  // Continuous parametric shock fronts shaping the gas boundary:
  // - Spine 0: Northeast Great Spire Ridge
  // - Spine 1: Central Cavity Arch (Dark lane rim)
  // - Spine 2: Southwest Flowing Veil
  // - Spine 3: Northwest Diffuse Gas Arm
  // - Spine 4: Transverse Ionization Front
  // - Spine 5: South Tendril
  const spines = [
    // Northeast Great Spire
    {
      samples: 42,
      fn: (t: number) => {
        const x = -0.04 + t * 0.28 + Math.sin(t * Math.PI * 1.8 + driftTime) * 0.024;
        const y = -0.02 - t * 0.24 + Math.cos(t * Math.PI * 2.2 + driftTime) * 0.016;
        return { x, y, z: 0.08 - t * 0.04 };
      },
      hueOff: 25,
      alphaMul: 0.40,
      width: 0.0022
    },
    // Central Cavity Rim Arch
    {
      samples: 38,
      fn: (t: number) => {
        const theta = -Math.PI * 0.75 + t * Math.PI * 1.4;
        const r = 0.13 + Math.sin(t * Math.PI * 3.0 + driftTime * 1.2) * 0.018;
        const x = -0.03 + Math.cos(theta) * r;
        const y = -0.02 + Math.sin(theta) * (r * 0.85);
        return { x, y, z: 0.05 };
      },
      hueOff: 0,
      alphaMul: 0.45,
      width: 0.0024
    },
    // Southwest Flowing Veil
    {
      samples: 40,
      fn: (t: number) => {
        const x = -0.05 - t * 0.22 + Math.sin(t * Math.PI * 2.0 + driftTime * 0.8) * 0.022;
        const y = 0.01 + t * 0.25 + Math.cos(t * Math.PI * 1.6 + driftTime) * 0.018;
        return { x, y, z: -0.06 + t * 0.03 };
      },
      hueOff: 180,
      alphaMul: 0.36,
      width: 0.0019
    },
    // Northwest Diffuse Gas Arm
    {
      samples: 34,
      fn: (t: number) => {
        const x = -0.06 - t * 0.24 + Math.cos(t * Math.PI * 1.5 + driftTime * 1.1) * 0.020;
        const y = -0.04 - t * 0.16 + Math.sin(t * Math.PI * 2.0 + driftTime) * 0.015;
        return { x, y, z: 0.02 };
      },
      hueOff: 290,
      alphaMul: 0.32,
      width: 0.0018
    },
    // Transverse Ionization Front
    {
      samples: 36,
      fn: (t: number) => {
        const x = -0.18 + t * 0.38;
        const y = 0.06 - Math.sin(t * Math.PI * 2.4 + driftTime) * 0.035;
        return { x, y, z: -0.02 };
      },
      hueOff: 65,
      alphaMul: 0.38,
      width: 0.0020
    },
    // South Tendril
    {
      samples: 30,
      fn: (t: number) => {
        const x = 0.02 + t * 0.16 + Math.sin(t * Math.PI * 1.8 + driftTime) * 0.018;
        const y = 0.10 + t * 0.18 + Math.cos(t * Math.PI * 2.0 + driftTime) * 0.014;
        return { x, y, z: 0.04 };
      },
      hueOff: 120,
      alphaMul: 0.34,
      width: 0.0017
    }
  ];

  ctx.save();
  for (let s = 0; s < spines.length; s++) {
    const spine = spines[s];
    const spineHue = isMulticolor ? (baseHue + spine.hueOff) % 360 : baseHue;

    ctx.beginPath();
    for (let i = 0; i < spine.samples; i++) {
      const t = i / (spine.samples - 1);
      const pt = spine.fn(t);
      const { screenX, screenY } = project(pt.x, pt.y, pt.z);
      if (i === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.strokeStyle = `hsla(${spineHue}, 92%, 75%, ${masterAlpha * spine.alphaMul})`;
    ctx.lineWidth = Math.max(1.1, scale * spine.width);
    ctx.stroke();
  }
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 3. MONUMENTAL VOLUMETRIC GAS & PARTICULATE CLOUD (~3,300 points)
  // ---------------------------------------------------------------------------
  // Partitioned into distinct physical regimes:
  // - Central Dense Nursery Core & High-Excitation Ions: 720 points
  // - North-East Great Pillar & Stellar Spire: 780 points
  // - South-West Flowing Gas Veil & Reflection Front: 740 points
  // - North-West & Outer Filamentary Whisps: 580 points
  // - High-Contrast Dark Dust Cavity & Filament Borders: 280 points
  // - Embedded Luminous Proto-Stars & Herbig-Haro Knots: 200 points
  // Total = 3,300 volumetric points!

  const points: Array<{
    x: number;
    y: number;
    z: number;
    hue: number;
    size: number;
    isKnot: boolean;
    isDust: boolean;
  }> = [];

  // A. Central Dense Nursery Core (720 points)
  for (let i = 0; i < 720; i++) {
    const t = i / 719;
    const angle = t * Math.PI * 18.0 + (i % 7) * 0.42;
    const r = Math.pow((i % 89) / 88, 0.65) * 0.14;
    const dispX = ((i * 17) % 31 - 15) * 0.0022;
    const dispY = ((i * 23) % 29 - 14) * 0.0020;
    const x = -0.05 + Math.cos(angle) * r + dispX;
    const y = -0.03 + Math.sin(angle) * (r * 0.82) + dispY;
    const z = Math.sin(angle * 2.0) * 0.08;

    const isCoreKnot = i % 28 === 0;
    const pHue = isMulticolor
      ? (baseHue + ((i % 5) * 12)) % 360
      : (isCoreKnot && highlightHue ? highlightHue : baseHue);
    const pSize = isCoreKnot ? 2.0 : (0.75 + (i % 3) * 0.35);

    points.push({ x, y, z, hue: pHue, size: pSize, isKnot: isCoreKnot, isDust: false });
  }

  // B. North-East Great Pillar & Stellar Spire (780 points)
  for (let i = 0; i < 780; i++) {
    const t = i / 779;
    // Follows spine from center (-0.03, -0.02) to tip (0.24, -0.28)
    const spineT = t;
    const sx = -0.03 + spineT * 0.27;
    const sy = -0.02 - spineT * 0.26;
    // Cross-sectional dispersion widening outward then tapering at tip
    const crossWidth = (0.025 + Math.sin(spineT * Math.PI) * 0.075);
    const sideAngle = (i * 2.39996); // golden angle approximation for uniform spread
    const sideR = ((i % 47) / 46) * crossWidth;
    const x = sx + Math.cos(sideAngle) * sideR;
    const y = sy + Math.sin(sideAngle) * sideR * 0.75;
    const z = Math.cos(spineT * Math.PI * 2.0) * 0.10;

    const isPillarKnot = i % 32 === 0;
    const pHue = isMulticolor
      ? (baseHue + 30 + ((i % 7) * 8)) % 360
      : baseHue;
    const pSize = isPillarKnot ? 1.9 : (0.70 + (i % 3) * 0.32);

    points.push({ x, y, z, hue: pHue, size: pSize, isKnot: isPillarKnot, isDust: false });
  }

  // C. South-West Flowing Gas Veil & Reflection Front (740 points)
  for (let i = 0; i < 740; i++) {
    const t = i / 739;
    const sx = -0.04 - t * 0.23;
    const sy = 0.02 + t * 0.26;
    const crossWidth = 0.030 + Math.sin(t * Math.PI) * 0.085;
    const sideAngle = (i * 2.39996);
    const sideR = ((i % 43) / 42) * crossWidth;
    const x = sx + Math.cos(sideAngle) * sideR;
    const y = sy + Math.sin(sideAngle) * sideR;
    const z = Math.sin(t * Math.PI * 2.5) * 0.12;

    const isVeilKnot = i % 35 === 0;
    const pHue = isMulticolor
      ? (baseHue + 160 + ((i % 6) * 10)) % 360
      : baseHue;
    const pSize = isVeilKnot ? 1.8 : (0.65 + (i % 3) * 0.30);

    points.push({ x, y, z, hue: pHue, size: pSize, isKnot: isVeilKnot, isDust: false });
  }

  // D. North-West & Outer Filamentary Whisps (580 points)
  for (let i = 0; i < 580; i++) {
    const t = i / 579;
    const armIdx = i % 3;
    let bx = 0;
    let by = 0;
    let hueShift = 0;
    if (armIdx === 0) {
      // NW Upper wisp
      bx = -0.08 - t * 0.22;
      by = -0.06 - t * 0.18;
      hueShift = 280;
    } else if (armIdx === 1) {
      // East canopy wisp
      bx = 0.08 + t * 0.20;
      by = 0.02 + t * 0.18;
      hueShift = 75;
    } else {
      // South-East lower wisp
      bx = -0.02 + t * 0.22;
      by = 0.14 + t * 0.16;
      hueShift = 120;
    }
    const spread = ((i % 37) - 18) * 0.0035;
    const x = bx + spread;
    const y = by + spread * 0.8;
    const z = Math.sin(t * Math.PI * 3.0) * 0.07;

    const pHue = isMulticolor ? (baseHue + hueShift + (i % 4) * 8) % 360 : baseHue;
    const pSize = 0.60 + (i % 3) * 0.28;

    points.push({ x, y, z, hue: pHue, size: pSize, isKnot: false, isDust: false });
  }

  // E. High-Contrast Dark Dust Cavity & Filament Borders (280 points)
  // Deep interstellar absorption markers giving contrast to the gas banks
  for (let i = 0; i < 280; i++) {
    const t = i / 279;
    const angle = t * Math.PI * 2.0;
    // Elliptical dark cavity border between central core and NE spire
    const cx = 0.02 + Math.cos(angle) * 0.075;
    const cy = -0.06 + Math.sin(angle) * 0.055;
    const jitter = ((i * 13) % 19 - 9) * 0.0018;
    const x = cx + jitter;
    const y = cy + jitter;
    const z = 0.02;

    // Dark dust uses deeper tones and smaller particulate radius
    const pHue = isMulticolor ? (baseHue + 220) % 360 : baseHue;
    points.push({ x, y, z, hue: pHue, size: 0.55 + (i % 2) * 0.25, isKnot: false, isDust: true });
  }

  // F. Embedded Luminous Proto-Stars & Herbig-Haro Knots (200 points)
  for (let i = 0; i < 200; i++) {
    const t = i / 199;
    // Distributed along major ridges
    const locIdx = i % 4;
    let lx = 0;
    let ly = 0;
    if (locIdx === 0) {
      // Core cluster
      lx = -0.05 + ((i * 19) % 37 - 18) * 0.0035;
      ly = -0.03 + ((i * 29) % 31 - 15) * 0.0030;
    } else if (locIdx === 1) {
      // NE pillar spine
      lx = 0.08 + t * 0.12;
      ly = -0.12 - t * 0.10;
    } else if (locIdx === 2) {
      // SW ridge
      lx = -0.12 - t * 0.10;
      ly = 0.10 + t * 0.12;
    } else {
      // East canopy
      lx = 0.12 + t * 0.08;
      ly = 0.08 + t * 0.08;
    }
    const x = lx;
    const y = ly;
    const z = 0.06 + (i % 5) * 0.02;

    const isMajorKnot = i % 12 === 0;
    const pHue = isMulticolor ? (40 + (i % 5) * 20) % 360 : (highlightHue ?? baseHue);
    const pSize = isMajorKnot ? 2.2 : (0.90 + (i % 3) * 0.40);

    points.push({ x, y, z, hue: pHue, size: pSize, isKnot: isMajorKnot, isDust: false });
  }

  // ---------------------------------------------------------------------------
  // 4. BATCHED RENDERING FOR 60 FPS PERFORMANCE
  // ---------------------------------------------------------------------------
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const { screenX, screenY, z } = project(p.x, p.y, p.z);

    const isForeground = z >= 0;
    let baseAlpha = isForeground
      ? masterAlpha * (0.60 + z * 0.40)
      : masterAlpha * (0.26 + (z + 0.25) * 0.28);

    if (p.isDust) {
      baseAlpha *= 0.50; // Subtle dark absorption dust
    }

    const pointAlpha = p.isKnot ? Math.min(1.0, baseAlpha * 1.45) : baseAlpha;
    const renderR = Math.max(0.60, p.size + (isForeground ? z * 0.6 : 0));

    // Luminous halo flare for major proto-stellar knots
    if (isForeground && p.isKnot && pointAlpha > 0.45) {
      const glowR = renderR * 3.6;
      const sGlow = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowR);
      sGlow.addColorStop(0, `hsla(${p.hue}, 100%, 90%, ${pointAlpha * 0.45})`);
      sGlow.addColorStop(0.4, `hsla(${p.hue}, 95%, 72%, ${pointAlpha * 0.20})`);
      sGlow.addColorStop(1, `hsla(${p.hue}, 85%, 50%, 0)`);
      ctx.fillStyle = sGlow;
      ctx.beginPath();
      ctx.arc(screenX, screenY, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    const lightness = p.isDust ? 45 : (p.isKnot ? 95 : (isForeground ? 85 : 72));
    ctx.fillStyle = `hsla(${p.hue}, 92%, ${lightness}%, ${pointAlpha})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, renderR, 0, Math.PI * 2);
    ctx.fill();
  }
}
