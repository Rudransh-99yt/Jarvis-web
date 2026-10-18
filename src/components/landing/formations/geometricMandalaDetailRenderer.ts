/**
 * ============================================================================
 * JARVIS FORMATION #16: GEOMETRIC MANDALA DETAIL RENDERER
 * ============================================================================
 * High-density Canvas 2D detail layer for Formation #16 (Geometric Mandala).
 *
 * Distinct Mathematical & Volumetric Topology:
 * 1. Visual & Conceptual Distinction:
 *    - Distinct from #12 Knowledge Graph (multi-hub epistemic nodes & semantic clusters).
 *    - Distinct from #13 Infinity Loop (continuous circulating 3D lemniscate).
 *    - Distinct from #14 Intelligence Crystal (faceted polyhedral bipyramid).
 *    - Geometric Mandala represents ordered intelligence and interconnected cosmic structure:
 *      * Clearly recognizable radial symmetry with a luminous central Bindu core.
 *      * Multiple concentric geometric layers with distinct patterns and harmonic spacing.
 *      * Interlocking polygons (sacred hexagram / dodecagram), radial spokes, and scalloped lotus arcs.
 *      * Dense volumetric particle filaments tracing the geometry, with fine micro-particles along edges.
 *      * Inner and outer rings with differential rotation speeds and coordinated counter-phase motion.
 *      * Traveling energy pulses propagating outward from the core through 12 arterial spokes.
 *      * Layered 3D depth, perspective pitch/yaw, and Z-elevation parallax across concentric tiers.
 *
 * 2. Concentric Geometric Structure (3D Stepped Pagoda / Sacred Geometry Disc):
 *    - Tier 1: Luminous Central Core / Bindu Nucleus (radius ~0.045, z = +0.060)
 *    - Tier 2: Interlocking 12-Pointed Star & Hexagram (radius ~0.115 - 0.145, z = +0.035)
 *    - Tier 3: Intermediate 18-Petal Scalloped Lotus Ring (radius ~0.225 - 0.250, z = 0.000)
 *    - Tier 4: Outer Cosmic Perimeter & 18 Gate Crenellations (radius ~0.340 - 0.365, z = -0.035)
 *    - 12 Grand Radial Arterial Spokes linking core to outer gates.
 *
 * 3. Micro-Point Budget (~3,350 volumetric points):
 *    - Part A: Inner Bindu Seed & Interlocking Star Geometry (~950 points)
 *    - Part B: Intermediate 18-Petal Scalloped Lotus Arc Streams (~1,080 points)
 *    - Part C: Outer Cosmic Perimeter Rings & Gate Trusses (~880 points)
 *    - Part D: Radiant Radial Spoke Streamers & Propagating Pulse Packets (~440 points)
 *    Total: ~3,350 detailed micro-points.
 *
 * Guarantees:
 * - 100% deterministic (zero Math.random() in executable code, closed-form formulas).
 * - Zero draw operations when inactive (progress <= 0.02).
 * - >= 2,500 volumetric micro-points & >= 4 structural filaments when active.
 * - Full color theme support across single-hue and multicolor palettes.
 * ============================================================================
 */

export interface GeometricMandalaRenderOptions {
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
 * Deterministic pseudo-hash for closed-form spatial variations without Math.random()
 */
export function mandalaHash(n: number): number {
  const s = Math.sin(n * 131.7 + 279.3) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * 3D Perspective Projection for concentric mandala rings and spokes.
 * Includes in-plane rotation around normal (rotZ), pitch tilt around X, yaw tilt around Y,
 * and perspective depth scaling.
 */
export function projectMandala3DPoint(
  x: number,
  y: number,
  z: number,
  rotZ: number = 0,
  tiltPitch: number = 0.22,
  tiltYaw: number = 0.14,
  cameraDist: number = 2.0
): { x: number; y: number; z: number; depthScale: number } {
  // 1. In-plane rotation around mandala normal (Z axis)
  const cosZ = Math.cos(rotZ);
  const sinZ = Math.sin(rotZ);
  const rx = x * cosZ - y * sinZ;
  const ry = x * sinZ + y * cosZ;
  const rz = z;

  // 2. Yaw rotation around vertical axis (Y axis)
  const cosY = Math.cos(tiltYaw);
  const sinY = Math.sin(tiltYaw);
  const x1 = rx * cosY + rz * sinY;
  const z1 = -rx * sinY + rz * cosY;

  // 3. Pitch rotation around horizontal axis (X axis)
  const cosP = Math.cos(tiltPitch);
  const sinP = Math.sin(tiltPitch);
  const y2 = ry * cosP - z1 * sinP;
  const z2 = ry * sinP + z1 * cosP;

  // 4. Perspective depth scaling
  const depthScale = cameraDist / (cameraDist + z2);

  return {
    x: x1 * depthScale,
    y: y2 * depthScale,
    z: z2,
    depthScale
  };
}

/**
 * Main detail layer renderer for Formation #16: Geometric Mandala
 */
export function renderGeometricMandalaDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: GeometricMandalaRenderOptions): void {
  // STRICT INACTIVE ENVELOPE: Zero draw operations if progress <= 0.02
  if (progress <= 0.02) {
    return;
  }

  // Smooth entrance curve
  const alphaEnvelope = Math.min(1.0, Math.max(0.0, (progress - 0.02) / 0.18));

  // Differential rotational phases for multi-tier geometric resonance
  const rotCore = (elapsed * 0.00030) % (Math.PI * 2);
  const rotMid = (-elapsed * 0.00018) % (Math.PI * 2);
  const rotOuter = (elapsed * 0.00022) % (Math.PI * 2);

  // Palette definition
  const primaryHue = baseHue;
  const secondaryHue = highlightHue !== undefined ? highlightHue : (baseHue + 40) % 360;
  const coreAccentHue = (baseHue + 180) % 360; // Complementary energetic nucleus

  ctx.save();

  // --------------------------------------------------------------------------
  // 1. LUMINOUS CENTRAL BINDU NUCLEUS GLOW
  // --------------------------------------------------------------------------
  const pulseCore = 0.5 + 0.5 * Math.sin(elapsed * 0.0028);
  const coreRadius = (18 + 8 * pulseCore) * (scale / 400);

  const gradCore = ctx.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    coreRadius * 2.6
  );
  gradCore.addColorStop(
    0,
    `hsla(${isMulticolor ? coreAccentHue : primaryHue}, 95%, 75%, ${0.70 * alphaEnvelope})`
  );
  gradCore.addColorStop(
    0.40,
    `hsla(${primaryHue}, 90%, 58%, ${0.30 * alphaEnvelope})`
  );
  gradCore.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

  ctx.fillStyle = gradCore;
  ctx.beginPath();
  ctx.arc(centerX, centerY, coreRadius * 2.6, 0, Math.PI * 2);
  ctx.fill();

  // --------------------------------------------------------------------------
  // 2. CONTINUOUS STRUCTURAL FILAMENTS (>= 8 GEOMETRIC STRANDS & ARCS)
  // --------------------------------------------------------------------------
  // A. Inner Hexagonal Sacred Core Ring (Tier 1)
  ctx.beginPath();
  ctx.strokeStyle = `hsla(${isMulticolor ? coreAccentHue : primaryHue}, 90%, 70%, ${0.55 * alphaEnvelope})`;
  ctx.lineWidth = 1.6;
  const innerHexSteps = 6;
  for (let i = 0; i <= innerHexSteps; i++) {
    const angle = (i / innerHexSteps) * Math.PI * 2;
    const pt = projectMandala3DPoint(
      Math.cos(angle) * 0.052,
      Math.sin(angle) * 0.052,
      0.060,
      rotCore
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // B. Inner Concentric Circular Demarcation Ring
  ctx.beginPath();
  ctx.strokeStyle = `hsla(${primaryHue}, 85%, 65%, ${0.40 * alphaEnvelope})`;
  ctx.lineWidth = 1.2;
  const ring1Steps = 48;
  for (let i = 0; i <= ring1Steps; i++) {
    const angle = (i / ring1Steps) * Math.PI * 2;
    const pt = projectMandala3DPoint(
      Math.cos(angle) * 0.082,
      Math.sin(angle) * 0.082,
      0.045,
      rotCore
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // C. Interlocking 12-Pointed Stellated Star (Dodecagram Triangle 1 & 2)
  for (let starPass = 0; starPass < 2; starPass++) {
    const starHue = isMulticolor
      ? (starPass === 0 ? primaryHue : secondaryHue)
      : primaryHue;
    ctx.beginPath();
    ctx.strokeStyle = `hsla(${starHue}, 90%, 68%, ${0.48 * alphaEnvelope})`;
    ctx.lineWidth = 1.3;

    const starPoints = 6;
    const starPhase = (starPass * Math.PI) / 6;
    for (let i = 0; i <= starPoints; i++) {
      const angle = (i / starPoints) * Math.PI * 2 + starPhase;
      const pt = projectMandala3DPoint(
        Math.cos(angle) * 0.138,
        Math.sin(angle) * 0.138,
        0.035,
        rotCore
      );
      const px = centerX + pt.x * scale;
      const py = centerY + pt.y * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // D. Intermediate 18-Petal Scalloped Lotus Epicycloid Ring (Tier 3)
  ctx.beginPath();
  ctx.strokeStyle = `hsla(${isMulticolor ? secondaryHue : primaryHue}, 85%, 65%, ${0.42 * alphaEnvelope})`;
  ctx.lineWidth = 1.4;
  const petalSteps = 90;
  for (let i = 0; i <= petalSteps; i++) {
    const u = (i / petalSteps) * Math.PI * 2;
    // Harmonic scalloped radius: base 0.225 + 0.024 * cos(18 * u)
    const petalR = 0.225 + 0.024 * Math.cos(18 * u);
    const pt = projectMandala3DPoint(
      Math.cos(u) * petalR,
      Math.sin(u) * petalR,
      0.000,
      rotMid
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // E. Intermediate Chordal Demarcation Ring
  ctx.beginPath();
  ctx.strokeStyle = `hsla(${primaryHue}, 80%, 62%, ${0.35 * alphaEnvelope})`;
  ctx.lineWidth = 1.1;
  const chordSteps = 60;
  for (let i = 0; i <= chordSteps; i++) {
    const u = (i / chordSteps) * Math.PI * 2;
    const pt = projectMandala3DPoint(
      Math.cos(u) * 0.280,
      Math.sin(u) * 0.280,
      -0.015,
      rotMid
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // F. Outer Cosmic Perimeter Crenellated Gate Ring (Tier 4)
  ctx.beginPath();
  ctx.strokeStyle = `hsla(${isMulticolor ? primaryHue : secondaryHue}, 90%, 70%, ${0.50 * alphaEnvelope})`;
  ctx.lineWidth = 1.5;
  const outerGateSteps = 72;
  for (let i = 0; i <= outerGateSteps; i++) {
    const u = (i / outerGateSteps) * Math.PI * 2;
    // 18 gate crenellations with outward triangular peaks
    const gateR = 0.345 + 0.022 * Math.cos(18 * u);
    const pt = projectMandala3DPoint(
      Math.cos(u) * gateR,
      Math.sin(u) * gateR,
      -0.035,
      rotOuter
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // G. 12 Grand Arterial Radial Spokes (Passing from Core through Outer Perimeter)
  for (let sp = 0; sp < 6; sp++) {
    const spokeAngle = (sp / 6) * Math.PI;
    const ptA = projectMandala3DPoint(
      Math.cos(spokeAngle) * 0.365,
      Math.sin(spokeAngle) * 0.365,
      -0.035,
      rotCore
    );
    const ptB = projectMandala3DPoint(
      -Math.cos(spokeAngle) * 0.365,
      -Math.sin(spokeAngle) * 0.365,
      -0.035,
      rotCore
    );

    ctx.beginPath();
    ctx.strokeStyle = `hsla(${primaryHue}, 85%, 68%, ${0.36 * alphaEnvelope})`;
    ctx.lineWidth = 1.0;
    ctx.moveTo(centerX + ptA.x * scale, centerY + ptA.y * scale);
    ctx.lineTo(centerX + ptB.x * scale, centerY + ptB.y * scale);
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // 3. HIGH-DENSITY VOLUMETRIC MICRO-POINTS (~3,350 MICRO-POINTS)
  // --------------------------------------------------------------------------
  const microPoints: Array<{
    x: number;
    y: number;
    z: number;
    hue: number;
    radius: number;
    alpha: number;
  }> = [];

  // PART A: INNER BINDU SEED & INTERLOCKING STAR GEOMETRY (~950 points)
  const countA = 950;
  for (let i = 0; i < countA; i++) {
    const fraction = i / countA;
    // Concentric phyllotaxis golden spiral + hexagonal seeds
    const rBase = 0.015 + 0.125 * Math.sqrt(fraction);
    const angle = i * 2.399963 + rotCore; // Golden angle (137.5 deg)
    const zBase = 0.060 - fraction * 0.025;

    const pt = projectMandala3DPoint(
      Math.cos(angle) * rBase,
      Math.sin(angle) * rBase,
      zBase,
      0
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;

    const depthAlpha = Math.max(0.18, Math.min(1.0, 0.58 + pt.z * 3.0));
    const pSize = (0.70 + 0.60 * depthAlpha) * (scale / 400);

    const hue = isMulticolor
      ? ((primaryHue + (fraction * 45)) % 360)
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

  // PART B: INTERMEDIATE 18-PETAL SCALLOPED LOTUS ARC STREAMS (~1,080 points)
  const countB = 1080;
  for (let j = 0; j < countB; j++) {
    const fraction = j / countB;
    const u = fraction * Math.PI * 2;
    const petalId = Math.floor(fraction * 18);
    const localU = (fraction * 18) - petalId;

    // Arching petal curvature: parabolic crest along petal
    const petalArc = Math.sin(localU * Math.PI);
    const r = 0.200 + 0.055 * petalArc;
    const z = 0.015 * Math.sin(u * 6.0);

    const pt = projectMandala3DPoint(
      Math.cos(u) * r,
      Math.sin(u) * r,
      z,
      rotMid
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;

    const depthAlpha = Math.max(0.15, Math.min(1.0, 0.52 + pt.z * 2.6));
    const pSize = (0.65 + 0.55 * depthAlpha) * (scale / 400);

    const hue = isMulticolor
      ? ((secondaryHue + (petalId * 20)) % 360)
      : secondaryHue;

    microPoints.push({
      x: px,
      y: py,
      z: pt.z,
      hue,
      radius: pSize,
      alpha: 0.68 * depthAlpha * alphaEnvelope
    });
  }

  // PART C: OUTER COSMIC PERIMETER RINGS & GATE TRUSSES (~880 points)
  const countC = 880;
  for (let k = 0; k < countC; k++) {
    const fraction = k / countC;
    const u = fraction * Math.PI * 2;
    const gateOsc = Math.cos(u * 18.0);
    // Outer perimeter radius varying between 0.325 and 0.370
    const r = 0.345 + 0.022 * gateOsc;
    const z = -0.035 + 0.012 * Math.sin(u * 9.0);

    const pt = projectMandala3DPoint(
      Math.cos(u) * r,
      Math.sin(u) * r,
      z,
      rotOuter
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;

    const depthAlpha = Math.max(0.12, Math.min(1.0, 0.48 + pt.z * 2.4));
    const pSize = (0.60 + 0.50 * depthAlpha) * (scale / 400);

    const hue = isMulticolor
      ? ((primaryHue + (fraction * 60)) % 360)
      : primaryHue;

    microPoints.push({
      x: px,
      y: py,
      z: pt.z,
      hue,
      radius: pSize,
      alpha: 0.62 * depthAlpha * alphaEnvelope
    });
  }

  // PART D: RADIANT ARTERIAL SPOKE STREAMERS & PULSE PACKETS (~440 points)
  const countD = 440;
  const numSpokes = 12;
  const pointsPerSpoke = Math.floor(countD / numSpokes);
  const pulseSpeed = elapsed * 0.0024;

  for (let sp = 0; sp < numSpokes; sp++) {
    const spokeAngle = (sp / numSpokes) * Math.PI * 2;
    for (let s = 0; s < pointsPerSpoke; s++) {
      const spokeFrac = (s + 1) / (pointsPerSpoke + 1);
      // Traveling energetic pulse phase along spoke
      const wavePhase = (spokeFrac * 4.0 - pulseSpeed + sp * 0.5) % 1.0;
      const normalizedWave = wavePhase < 0 ? wavePhase + 1 : wavePhase;
      const pulseBrightness = Math.exp(-Math.pow((normalizedWave - 0.5) * 6.0, 2));

      const r = 0.045 + spokeFrac * 0.320;
      const z = 0.055 - spokeFrac * 0.090;

      const pt = projectMandala3DPoint(
        Math.cos(spokeAngle) * r,
        Math.sin(spokeAngle) * r,
        z,
        rotCore
      );
      const px = centerX + pt.x * scale;
      const py = centerY + pt.y * scale;

      const depthAlpha = Math.max(0.14, Math.min(1.0, 0.50 + pt.z * 2.8));
      const pSize = (0.65 + 0.85 * pulseBrightness) * (scale / 400);

      const hue = isMulticolor
        ? ((coreAccentHue + sp * 30) % 360)
        : primaryHue;

      microPoints.push({
        x: px,
        y: py,
        z: pt.z,
        hue,
        radius: pSize,
        alpha: (0.45 + 0.45 * pulseBrightness) * depthAlpha * alphaEnvelope
      });
    }
  }

  // Render all micro-points with deterministic arc calls
  for (let pIdx = 0; pIdx < microPoints.length; pIdx++) {
    const p = microPoints[pIdx];
    ctx.fillStyle = `hsla(${p.hue}, 92%, 74%, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // 4. COORDINATED TRAVELING PHOTON PULSES (12 OUTWARD RADIAL PROPAGATIONS)
  // --------------------------------------------------------------------------
  const numOutwardPulses = 12;
  for (let p = 0; p < numOutwardPulses; p++) {
    const spokeAngle = (p / numOutwardPulses) * Math.PI * 2;
    const pulseT = ((elapsed * 0.0016 + p * 0.08) % 1.0);
    const r = 0.050 + pulseT * 0.310;
    const z = 0.050 - pulseT * 0.080;

    const pt = projectMandala3DPoint(
      Math.cos(spokeAngle) * r,
      Math.sin(spokeAngle) * r,
      z,
      rotCore
    );
    const px = centerX + pt.x * scale;
    const py = centerY + pt.y * scale;

    const pulseRadius = 5.0 * (scale / 400) * pt.depthScale;
    const pulseHue = isMulticolor
      ? ((secondaryHue + p * 30) % 360)
      : primaryHue;

    const gradPulse = ctx.createRadialGradient(px, py, 0, px, py, pulseRadius * 2.2);
    gradPulse.addColorStop(0, `hsla(${pulseHue}, 100%, 88%, ${0.92 * alphaEnvelope})`);
    gradPulse.addColorStop(0.45, `hsla(${pulseHue}, 90%, 65%, ${0.45 * alphaEnvelope})`);
    gradPulse.addColorStop(1, 'hsla(0, 0%, 0%, 0)');

    ctx.fillStyle = gradPulse;
    ctx.beginPath();
    ctx.arc(px, py, pulseRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
