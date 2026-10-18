/**
 * ============================================================================
 * JARVIS FORMATION #13: INFINITY LOOP DETAIL RENDERER
 * ============================================================================
 * High-density Canvas 2D detail layer for Formation #13 (Infinity Loop / Lemniscate).
 *
 * Distinct Mathematical & Volumetric Topology:
 * 1. Visual & Conceptual Distinction:
 *    - Distinct from #08 Neural Network (layered feedforward computational matrices).
 *    - Distinct from #11 Synaptic Web (biological synaptic clefts, vesicles, dendrites).
 *    - Distinct from #12 Knowledge Graph (multi-hub epistemic nodes, clustered entities).
 *    - Distinct from #03 Atomic Orbitals & #06 Orbital System (spherical / planar rings).
 *    - Infinity Loop represents a 3D non-planar lemniscate of dual continuous interacting
 *      intelligence streams:
 *      * Two grand lateral lobes (Left: Analytical / Symbolic; Right: Generative / Creative)
 *      * A luminous central crossover where the two intelligence streams intersect and exchange energy
 *      * Multiple braided volumetric particle filaments circulating in counter-directions
 *      * Nested inner orbital harmonics and fine circulation streamlines
 *      * Dynamic activation pulses traveling along the 3D lemniscate parameter path
 *
 * 2. 3D Lemniscate Spatial Geometry:
 *    - Parametric lemniscate of Bernoulli / Gerono with non-planar z-depth warping:
 *      x(t) = a * cos(t) / (1 + sin^2(t))
 *      y(t) = b * sin(t) * cos(t) / (1 + sin^2(t))
 *      z(t) = c * sin(2t) [vertical/depth torsion creating true 3D spatial loop]
 *    - Projection: subtle pitch tilt (thetaX ~ 0.22 rad) and yaw tilt (thetaY ~ 0.16 rad)
 *      producing unmistakable organic depth so it never looks like a flat symbol.
 *
 * 3. Flow Streams & Energy Crossover:
 *    - Dual counter-propagating volumetric streams: Stream Alpha (forward t) & Stream Beta (retrograde t)
 *    - Crossover junction at t = 0 and t = PI (center origin x=0, y=0) featuring intense energetic glow,
 *      exchange nodes, and radiating harmonic flux lines
 *    - High-density volumetric filaments (>= 6 continuous braided strand arcs)
 *    - Dynamic luminous pulse packets circulating around the loops
 *
 * 4. Micro-Point Budget (~3,350 volumetric points):
 *    - Primary Braided Filaments & Streamlines (~1,400 points)
 *    - Counter-Circulating Stream Core Particles (~950 points)
 *    - Luminous Central Crossover Junction Flux (~550 points)
 *    - Outer Lobe Halo & Nested Orbital Resonances (~450 points)
 *    Total: ~3,350 detailed micro-points.
 *
 * Guarantees:
 * - 100% deterministic (zero Math.random() in executable code, closed-form formulas).
 * - Zero draw operations when inactive (progress <= 0.02).
 * - >= 2,500 volumetric micro-points & >= 4 structural filaments when active.
 * - Full color theme support across single-hue and multicolor palettes.
 * ============================================================================
 */

export interface InfinityLoopRenderOptions {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  scale: number;
  progress: number;
  elapsed: number;
  baseHue: number;
  highlightHue?: number;
  isMulticolor: boolean;
}

/**
 * Closed-form 3D lemniscate coordinates with dynamic phase offset and spatial torsion.
 * Returns projected 2D coordinates {x, y, z, depthScale} relative to loop center.
 */
export function getLemniscate3DPoint(
  t: number,
  scaleA: number = 0.36,
  scaleB: number = 0.22,
  tiltPitch: number = 0.22,
  tiltYaw: number = 0.16,
  tiltRoll: number = -Math.PI / 4
): { x: number; y: number; z: number; depthScale: number } {
  const sinT = Math.sin(t);
  const cosT = Math.cos(t);
  const denom = 1.0 + sinT * sinT;

  // Base Bernoulli / Gerono lemniscate in 3D
  const rawX = (scaleA * cosT) / denom;
  const rawY = (scaleB * sinT * cosT) / denom;
  // Non-planar z-torsion: twists vertically through the crossover
  const rawZ = 0.12 * Math.sin(2.0 * t);

  // 3D rotation projection:
  // 1. Yaw rotation around Y axis
  const cosY = Math.cos(tiltYaw);
  const sinY = Math.sin(tiltYaw);
  const x1 = rawX * cosY + rawZ * sinY;
  const z1 = -rawX * sinY + rawZ * cosY;

  // 2. Pitch rotation around X axis
  const cosP = Math.cos(tiltPitch);
  const sinP = Math.sin(tiltPitch);
  const y2 = rawY * cosP - z1 * sinP;
  const z2 = rawY * sinP + z1 * cosP;

  // 3. Roll rotation around Z axis (~45 deg diagonal orientation)
  const cosR = Math.cos(tiltRoll);
  const sinR = Math.sin(tiltRoll);
  const x3 = x1 * cosR - y2 * sinR;
  const y3 = x1 * sinR + y2 * cosR;

  // Perspective depth scaling (camera distance ~ 1.8)
  const cameraDist = 1.8;
  const depthScale = cameraDist / (cameraDist + z2);

  return {
    x: x3 * depthScale,
    y: y3 * depthScale,
    z: z2,
    depthScale
  };
}

export function renderInfinityLoopDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: InfinityLoopRenderOptions): void {
  // STRICT INACTIVE ENVELOPE: Zero draw operations if progress <= 0.02
  if (progress <= 0.02) {
    return;
  }

  // Smooth entrance curve
  const alphaEnvelope = Math.min(1.0, Math.max(0.0, (progress - 0.02) / 0.18));
  const tTime = elapsed * 0.0018;

  // Palette definition
  const primaryHue = baseHue;
  const secondaryHue = highlightHue !== undefined ? highlightHue : (baseHue + 45) % 360;
  const crossoverHue = (baseHue + 180) % 360; // Complementary energetic junction glow

  ctx.save();

  // --------------------------------------------------------------------------
  // 1. LUMINOUS CROSSOVER CORE GLOW (ENERGY EXCHANGE JUNCTION)
  // --------------------------------------------------------------------------
  // The central node where analytical and creative streams cross over
  const crossoverPulse = 0.5 + 0.5 * Math.sin(tTime * 3.2);
  const coreRadius = (16 + 8 * crossoverPulse) * (scale / 400);

  const gradCore = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    coreRadius * 2.8
  );
  gradCore.addColorStop(
    0,
    `hsla(${isMulticolor ? crossoverHue : primaryHue}, 95%, 72%, ${0.65 * alphaEnvelope})`
  );
  gradCore.addColorStop(
    0.45,
    `hsla(${primaryHue}, 90%, 55%, ${0.28 * alphaEnvelope})`
  );
  gradCore.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

  ctx.fillStyle = gradCore;
  ctx.beginPath();
  ctx.arc(centerX, centerY, coreRadius * 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Secondary sub-glows for the two grand lateral lobes
  const leftLobeCenter = getLemniscate3DPoint(0, 0.36, 0.22);
  const rightLobeCenter = getLemniscate3DPoint(Math.PI, 0.36, 0.22);
  const lobeGlowRadius = 24 * (scale / 400);

  // Left lobe soft ambient wash
  const leftX = centerX + leftLobeCenter.x * scale;
  const leftY = centerY + leftLobeCenter.y * scale;
  const gradLeft = ctx.createRadialGradient(leftX, leftY, 0, leftX, leftY, lobeGlowRadius * 2.0);
  gradLeft.addColorStop(0, `hsla(${primaryHue}, 85%, 60%, ${0.18 * alphaEnvelope})`);
  gradLeft.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
  ctx.fillStyle = gradLeft;
  ctx.beginPath();
  ctx.arc(leftX, leftY, lobeGlowRadius * 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Right lobe soft ambient wash
  const rightX = centerX + rightLobeCenter.x * scale;
  const rightY = centerY + rightLobeCenter.y * scale;
  const gradRight = ctx.createRadialGradient(rightX, rightY, 0, rightX, rightY, lobeGlowRadius * 2.0);
  gradRight.addColorStop(
    0,
    `hsla(${isMulticolor ? secondaryHue : primaryHue}, 85%, 60%, ${0.18 * alphaEnvelope})`
  );
  gradRight.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
  ctx.fillStyle = gradRight;
  ctx.beginPath();
  ctx.arc(rightX, rightY, lobeGlowRadius * 2.0, 0, Math.PI * 2);
  ctx.fill();

  // --------------------------------------------------------------------------
  // 2. CONTINUOUS STRUCTURAL BRAIDED FILAMENTS (>= 6 CONTINUOUS PATH ARCS)
  // --------------------------------------------------------------------------
  // Six distinct geometric strand trajectories weaving around the lemniscate manifold
  const strandConfigs = [
    { scaleA: 0.360, scaleB: 0.220, phaseShift: 0.00, width: 1.8, alpha: 0.50, pitch: 0.22, yaw: 0.16 },
    { scaleA: 0.375, scaleB: 0.230, phaseShift: 0.35, width: 1.2, alpha: 0.38, pitch: 0.26, yaw: 0.12 },
    { scaleA: 0.345, scaleB: 0.210, phaseShift: -0.35, width: 1.2, alpha: 0.38, pitch: 0.18, yaw: 0.20 },
    { scaleA: 0.360, scaleB: 0.225, phaseShift: 0.70, width: 0.9, alpha: 0.30, pitch: 0.30, yaw: 0.08 },
    { scaleA: 0.355, scaleB: 0.215, phaseShift: -0.70, width: 0.9, alpha: 0.30, pitch: 0.14, yaw: 0.24 },
    { scaleA: 0.385, scaleB: 0.235, phaseShift: 1.10, width: 0.7, alpha: 0.25, pitch: 0.24, yaw: 0.18 }
  ];

  for (let s = 0; s < strandConfigs.length; s++) {
    const cfg = strandConfigs[s];
    const strandHue = isMulticolor
      ? (s % 2 === 0 ? primaryHue : secondaryHue)
      : primaryHue;

    ctx.strokeStyle = `hsla(${strandHue}, 85%, 65%, ${cfg.alpha * alphaEnvelope})`;
    ctx.lineWidth = cfg.width;
    ctx.beginPath();

    const steps = 120;
    for (let step = 0; step <= steps; step++) {
      const u = (step / steps) * Math.PI * 2;
      const pt = getLemniscate3DPoint(u + cfg.phaseShift, cfg.scaleA, cfg.scaleB, cfg.pitch, cfg.yaw);
      const px = centerX + pt.x * scale;
      const py = centerY + pt.y * scale;

      if (step === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // 3. HIGH-DENSITY VOLUMETRIC MICRO-POINTS (~3,350 MICRO-POINTS)
  // --------------------------------------------------------------------------
  // Batch micro-points and render deterministically via arcs
  const microPoints: Array<{
    x: number;
    y: number;
    z: number;
    hue: number;
    radius: number;
    alpha: number;
  }> = [];

  // PART A: PRIMARY BRAIDED STREAM PARTICLES (1,400 points)
  const countA = 1400;
  for (let i = 0; i < countA; i++) {
    const fraction = i / countA;
    const u = fraction * Math.PI * 2 + tTime * 0.85;
    
    const strandId = i % 6;
    const strandShift = (strandId / 6) * Math.PI * 2;
    const strandRadius = 0.012 * Math.sin(fraction * Math.PI * 8 + strandShift);

    const transX = Math.cos(u * 5.0 + strandShift) * strandRadius;
    const transY = Math.sin(u * 5.0 + strandShift) * strandRadius;

    const pt = getLemniscate3DPoint(u, 0.36 + transX, 0.22 + transY);
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;

    const depthAlpha = Math.max(0.15, Math.min(1.0, 0.55 + pt.z * 2.8));
    const pSize = (0.75 + 0.65 * depthAlpha) * (scale / 400);

    const hue = isMulticolor
      ? (pt.x < 0 ? primaryHue : secondaryHue)
      : primaryHue;

    microPoints.push({
      x: px,
      y: py,
      z: pt.z,
      hue,
      radius: pSize,
      alpha: 0.72 * depthAlpha * alphaEnvelope
    });
  }

  // PART B: COUNTER-CIRCULATING STREAM CORE PARTICLES (950 points)
  const countB = 950;
  for (let j = 0; j < countB; j++) {
    const fraction = j / countB;
    const u = fraction * Math.PI * 2 - tTime * 1.15;

    const harmonicWobble = 0.008 * Math.cos(fraction * Math.PI * 12 + tTime * 2.0);
    const pt = getLemniscate3DPoint(u, 0.355 + harmonicWobble, 0.215 - harmonicWobble, 0.20, 0.18);
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;

    const depthAlpha = Math.max(0.12, Math.min(1.0, 0.50 + pt.z * 2.5));
    const pSize = (0.65 + 0.55 * depthAlpha) * (scale / 400);

    const hue = isMulticolor
      ? ((primaryHue + 60 + fraction * 30) % 360)
      : primaryHue;

    microPoints.push({
      x: px,
      y: py,
      z: pt.z,
      hue,
      radius: pSize,
      alpha: 0.65 * depthAlpha * alphaEnvelope
    });
  }

  // PART C: LUMINOUS CENTRAL CROSSOVER JUNCTION FLUX (550 points)
  const countC = 550;
  const cosRoll = Math.cos(-Math.PI / 4);
  const sinRoll = Math.sin(-Math.PI / 4);
  for (let k = 0; k < countC; k++) {
    const fraction = k / countC;
    const angle = fraction * Math.PI * 2 * 3.0 + tTime * 2.8;
    const radius = (0.015 + 0.065 * Math.sqrt(fraction)) * (1.0 + 0.12 * Math.sin(tTime * 4.0 + k));
    
    const rawFluxX = radius * Math.cos(angle) * 1.4;
    const rawFluxY = radius * Math.sin(angle) * 0.8;
    const rotFluxX = rawFluxX * cosRoll - rawFluxY * sinRoll;
    const rotFluxY = rawFluxX * sinRoll + rawFluxY * cosRoll;

    const px = centerX + rotFluxX * scale;
    const py = centerY + rotFluxY * scale;

    const innerFactor = 1.0 - fraction;
    const pSize = (0.8 + 0.9 * innerFactor) * (scale / 400);

    const hue = isMulticolor
      ? ((crossoverHue + k * 0.2) % 360)
      : primaryHue;

    microPoints.push({
      x: px,
      y: py,
      z: 0.05 * innerFactor,
      hue,
      radius: pSize,
      alpha: (0.45 + 0.48 * innerFactor) * alphaEnvelope
    });
  }

  // PART D: OUTER LOBE HALOS & NESTED ORBITAL RESONANCES (450 points)
  const countD = 450;
  const halfD = Math.floor(countD / 2);
  for (let m = 0; m < countD; m++) {
    const isRightLobe = m >= halfD;
    const lobeIndex = m % halfD;
    const fraction = lobeIndex / halfD;
    
    const lobeCenter = isRightLobe ? rightLobeCenter : leftLobeCenter;
    const orbitAngle = fraction * Math.PI * 2 + (isRightLobe ? -1 : 1) * tTime * 1.5;
    const orbitRadius = (0.035 + 0.045 * (lobeIndex % 3)) * (scale);

    const rawHaloX = Math.cos(orbitAngle) * orbitRadius;
    const rawHaloY = Math.sin(orbitAngle) * orbitRadius * 0.75;
    const haloX = rawHaloX * cosRoll - rawHaloY * sinRoll;
    const haloY = rawHaloX * sinRoll + rawHaloY * cosRoll;

    const px = centerX + lobeCenter.x * scale + haloX;
    const py = centerY + lobeCenter.y * scale + haloY;

    const pSize = 0.75 * (scale / 400);
    const hue = isMulticolor
      ? (isRightLobe ? secondaryHue : primaryHue)
      : primaryHue;

    microPoints.push({
      x: px,
      y: py,
      z: 0,
      hue,
      radius: pSize,
      alpha: 0.42 * alphaEnvelope
    });
  }

  // Render all micro-points with deterministic arc calls
  for (let pIdx = 0; pIdx < microPoints.length; pIdx++) {
    const p = microPoints[pIdx];
    ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // 4. COORDINATED ACTIVATION ENERGY PULSES (PROPAGATING ALONG LEMNISCATE)
  // --------------------------------------------------------------------------
  // 8 energetic packet wavefronts traversing the infinity loop in sequence
  const numPulses = 8;
  for (let p = 0; p < numPulses; p++) {
    const pulseOffset = (p / numPulses) * Math.PI * 2;
    const pulseT = (tTime * 1.4 + pulseOffset) % (Math.PI * 2);

    const pt = getLemniscate3DPoint(pulseT, 0.36, 0.22);
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;

    const pulseRadius = 5.5 * (scale / 400) * pt.depthScale;
    const pulseHue = isMulticolor
      ? ((primaryHue + p * 35) % 360)
      : primaryHue;

    // Glowing energy packet
    const gradPulse = ctx.createRadialGradient(px, py, 0, px, py, pulseRadius * 2.2);
    gradPulse.addColorStop(0, `hsla(${pulseHue}, 100%, 85%, ${0.90 * alphaEnvelope})`);
    gradPulse.addColorStop(0.5, `hsla(${pulseHue}, 90%, 60%, ${0.45 * alphaEnvelope})`);
    gradPulse.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

    ctx.fillStyle = gradPulse;
    ctx.beginPath();
    ctx.arc(px, py, pulseRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
