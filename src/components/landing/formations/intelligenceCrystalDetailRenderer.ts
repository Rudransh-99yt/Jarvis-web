/**
 * ============================================================================
 * JARVIS FORMATION #14: INTELLIGENCE CRYSTAL DETAIL RENDERER
 * ============================================================================
 * High-density Canvas 2D detail layer for Formation #14 (Intelligence Crystal).
 *
 * Distinct Mathematical & Volumetric Topology:
 * 1. Visual & Conceptual Distinction:
 *    - Distinct from #08 Neural Network (layered feedforward computational matrices).
 *    - Distinct from #11 Synaptic Web (biological synaptic microcircuit & clefts).
 *    - Distinct from #12 Knowledge Graph (multi-hub epistemic nodes, clustered entities).
 *    - Distinct from #13 Infinity Loop (continuous circulating 3D lemniscate).
 *    - Intelligence Crystal represents structured, crystallized intelligence:
 *      * Dual-terminated faceted bipyramidal envelope with hexagonal/octagonal girdle
 *      * Multiple interlocking geometric facets, sharp ridgelines, and structural vertices
 *      * Inner volumetric lattice / octahedral core visible through the outer shell
 *      * Controlled luminous energy pulses traveling along crystalline conduits
 *      * Subtle optical refraction, chromatic dispersion, and angle-dependent specular glints
 *
 * 2. 3D Crystalline Spatial Geometry:
 *    - Dual apex vertices (top apex at y = -0.38, bottom apex at y = +0.38)
 *    - Upper girdle hexagonal ring (radius ~0.24, y = -0.13)
 *    - Equatorial girdle ring (radius ~0.33, y = 0.0, staggered phase)
 *    - Lower girdle hexagonal ring (radius ~0.24, y = +0.13)
 *    - Inner octahedral core lattice (radius ~0.14, dual apexes at y = +/-0.20)
 *    - Central quantum seed (radius ~0.05)
 *    - 3D perspective projection with pitch (thetaX ~ 0.26) and yaw (thetaY ~ 0.32)
 *
 * 3. Micro-Point Budget (~3,250 volumetric points):
 *    - Outer Facet Edges & Structural Ridgelines: ~1,024 points (32 edges x 32 points)
 *    - Planar Facet Surface Sheen & Specular Glints: ~896 points (16 faces x 56 points)
 *    - Inner Volumetric Lattice & Quantum Seed: ~720 points (core edges & nucleus)
 *    - Luminous Energy Channels & Refraction Sparks: ~610 points
 *    Total: ~3,250 detailed micro-points.
 *
 * Guarantees:
 * - 100% deterministic (zero Math.random() in executable code, closed-form formulas).
 * - Zero draw operations when inactive (progress <= 0.02).
 * - >= 2,500 volumetric micro-points & >= 4 structural filaments when active.
 * - Full color theme support across single-hue and multicolor palettes.
 * ============================================================================
 */

export interface IntelligenceCrystalRenderOptions {
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
export function crystalHash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Project a 3D coordinate {x, y, z} to 2D screen coordinate with camera perspective and tilt.
 */
export function projectCrystal3DPoint(
  x: number,
  y: number,
  z: number,
  rotY: number,
  tiltPitch: number = 0.26,
  cameraDist: number = 2.0
): { x: number; y: number; z: number; depthScale: number } {
  // 1. Rotation around crystal Y axis (continuous crystalline rotation)
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;

  // 2. Pitch tilt around X axis (elevation viewing angle)
  const cosP = Math.cos(tiltPitch);
  const sinP = Math.sin(tiltPitch);
  const y2 = y * cosP - z1 * sinP;
  const z2 = y * sinP + z1 * cosP;

  // 3. Perspective depth scaling
  const depthScale = cameraDist / (cameraDist + z2);

  return {
    x: x1 * depthScale,
    y: y2 * depthScale,
    z: z2,
    depthScale
  };
}

/**
 * Main detail layer renderer for Formation #14: Intelligence Crystal
 */
export function renderIntelligenceCrystalDetailLayer(
  options: IntelligenceCrystalRenderOptions
): void {
  const {
    ctx,
    centerX,
    centerY,
    scale,
    progress,
    elapsed,
    baseHue,
    highlightHue = (baseHue + 45) % 360,
    isMulticolor
  } = options;

  // 1. Inactive envelope guard: strictly 0 draw calls when inactive
  if (progress <= 0.02) {
    return;
  }

  // Clamped visibility envelope
  const alpha = Math.min(1.0, Math.max(0.0, (progress - 0.02) / 0.98));
  const crystalRotation = elapsed * 0.00035;

  // ---------------------------------------------------------------------------
  // Geometry Definition: 3D Crystal Vertices
  // ---------------------------------------------------------------------------
  // Outer Shell Apexes
  const topApex = { x: 0, y: -0.38, z: 0 };
  const botApex = { x: 0, y: 0.38, z: 0 };

  // Upper Hexagonal Girdle Ring (6 vertices, radius 0.24, y = -0.13)
  const upperRing: Array<{ x: number; y: number; z: number }> = [];
  const rUpper = 0.24;
  const yUpper = -0.13;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    upperRing.push({
      x: rUpper * Math.cos(angle),
      y: yUpper,
      z: rUpper * Math.sin(angle)
    });
  }

  // Equatorial Girdle Ring (6 vertices, radius 0.33, y = 0.0, rotated by PI / 6)
  const eqRing: Array<{ x: number; y: number; z: number }> = [];
  const rEq = 0.33;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    eqRing.push({
      x: rEq * Math.cos(angle),
      y: 0.0,
      z: rEq * Math.sin(angle)
    });
  }

  // Lower Hexagonal Girdle Ring (6 vertices, radius 0.24, y = +0.13)
  const lowerRing: Array<{ x: number; y: number; z: number }> = [];
  const rLower = 0.24;
  const yLower = 0.13;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    lowerRing.push({
      x: rLower * Math.cos(angle),
      y: yLower,
      z: rLower * Math.sin(angle)
    });
  }

  // Inner Core Octahedral Lattice Vertices
  const innerTopApex = { x: 0, y: -0.19, z: 0 };
  const innerBotApex = { x: 0, y: 0.19, z: 0 };
  const innerRing: Array<{ x: number; y: number; z: number }> = [];
  const rInner = 0.14;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 12;
    innerRing.push({
      x: rInner * Math.cos(angle),
      y: 0.0,
      z: rInner * Math.sin(angle)
    });
  }

  // Project all vertices to screen coordinates
  const projTop = projectCrystal3DPoint(topApex.x, topApex.y, topApex.z, crystalRotation);
  const projBot = projectCrystal3DPoint(botApex.x, botApex.y, botApex.z, crystalRotation);
  const projUpper = upperRing.map(v => projectCrystal3DPoint(v.x, v.y, v.z, crystalRotation));
  const projEq = eqRing.map(v => projectCrystal3DPoint(v.x, v.y, v.z, crystalRotation));
  const projLower = lowerRing.map(v => projectCrystal3DPoint(v.x, v.y, v.z, crystalRotation));

  const projInnerTop = projectCrystal3DPoint(innerTopApex.x, innerTopApex.y, innerTopApex.z, crystalRotation);
  const projInnerBot = projectCrystal3DPoint(innerBotApex.x, innerBotApex.y, innerBotApex.z, crystalRotation);
  const projInnerRing = innerRing.map(v => projectCrystal3DPoint(v.x, v.y, v.z, crystalRotation));

  // ---------------------------------------------------------------------------
  // 1. Structural Filaments (>= 4 strokes required by audit tests)
  // ---------------------------------------------------------------------------
  // Stroke 1: Upper Pyramidal Ridgelines (Top Apex to Upper Girdle)
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    ctx.moveTo(centerX + projTop.x * scale, centerY + projTop.y * scale);
    ctx.lineTo(centerX + projUpper[i].x * scale, centerY + projUpper[i].y * scale);
  }
  ctx.strokeStyle = `hsla(${baseHue}, 85%, 68%, ${(0.32 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Stroke 2: Lower Pyramidal Ridgelines (Bottom Apex to Lower Girdle)
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    ctx.moveTo(centerX + projBot.x * scale, centerY + projBot.y * scale);
    ctx.lineTo(centerX + projLower[i].x * scale, centerY + projLower[i].y * scale);
  }
  ctx.strokeStyle = `hsla(${baseHue}, 85%, 68%, ${(0.32 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // Stroke 3: Equatorial Girdle Triangular Facet Weave (Upper to Eq to Lower)
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const nextI = (i + 1) % 6;
    // Upper ring perimeter
    ctx.moveTo(centerX + projUpper[i].x * scale, centerY + projUpper[i].y * scale);
    ctx.lineTo(centerX + projUpper[nextI].x * scale, centerY + projUpper[nextI].y * scale);

    // Diagonal facets to equatorial girdle
    ctx.moveTo(centerX + projUpper[i].x * scale, centerY + projUpper[i].y * scale);
    ctx.lineTo(centerX + projEq[i].x * scale, centerY + projEq[i].y * scale);

    ctx.moveTo(centerX + projEq[i].x * scale, centerY + projEq[i].y * scale);
    ctx.lineTo(centerX + projLower[i].x * scale, centerY + projLower[i].y * scale);

    // Lower ring perimeter
    ctx.moveTo(centerX + projLower[i].x * scale, centerY + projLower[i].y * scale);
    ctx.lineTo(centerX + projLower[nextI].x * scale, centerY + projLower[nextI].y * scale);
  }
  ctx.strokeStyle = `hsla(${highlightHue}, 90%, 75%, ${(0.28 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Stroke 4: Equatorial Belt Ring
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const nextI = (i + 1) % 6;
    if (i === 0) {
      ctx.moveTo(centerX + projEq[i].x * scale, centerY + projEq[i].y * scale);
    }
    ctx.lineTo(centerX + projEq[nextI].x * scale, centerY + projEq[nextI].y * scale);
  }
  ctx.strokeStyle = `hsla(${baseHue}, 95%, 82%, ${(0.35 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Stroke 5: Inner Crystalline Core Lattice (Visible inside the translucent crystal)
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const nextI = (i + 1) % 6;
    // Core top to inner ring
    ctx.moveTo(centerX + projInnerTop.x * scale, centerY + projInnerTop.y * scale);
    ctx.lineTo(centerX + projInnerRing[i].x * scale, centerY + projInnerRing[i].y * scale);

    // Core bottom to inner ring
    ctx.moveTo(centerX + projInnerBot.x * scale, centerY + projInnerBot.y * scale);
    ctx.lineTo(centerX + projInnerRing[i].x * scale, centerY + projInnerRing[i].y * scale);

    // Inner ring perimeter
    ctx.moveTo(centerX + projInnerRing[i].x * scale, centerY + projInnerRing[i].y * scale);
    ctx.lineTo(centerX + projInnerRing[nextI].x * scale, centerY + projInnerRing[nextI].y * scale);
  }
  const innerHue = isMulticolor ? (baseHue + 60) % 360 : highlightHue;
  ctx.strokeStyle = `hsla(${innerHue}, 90%, 70%, ${(0.24 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 2. Volumetric Detail Micro-Points Budget (Target: ~3,250 points, >= 2,500)
  // ---------------------------------------------------------------------------

  // Group A: Outer Facet Ridgelines & Structural Filaments (32 edges x 32 points = 1,024 points)
  // Edges:
  // - 6 top apex to upper ring
  // - 6 upper ring to equatorial ring
  // - 6 equatorial ring to lower ring
  // - 6 lower ring to bottom apex
  // - 4 upper ring horizontals + 4 lower ring horizontals = 32 edges
  const edgePairs: Array<[{ x: number; y: number; z: number }, { x: number; y: number; z: number }]> = [];
  for (let i = 0; i < 6; i++) {
    edgePairs.push([topApex, upperRing[i]]);
    edgePairs.push([upperRing[i], eqRing[i]]);
    edgePairs.push([eqRing[i], lowerRing[i]]);
    edgePairs.push([lowerRing[i], botApex]);
  }
  for (let i = 0; i < 4; i++) {
    edgePairs.push([upperRing[i], upperRing[(i + 1) % 6]]);
    edgePairs.push([lowerRing[i], lowerRing[(i + 1) % 6]]);
  }

  const pointsPerEdge = 32;
  for (let e = 0; e < edgePairs.length; e++) {
    const [pA, pB] = edgePairs[e];
    const edgeHue = isMulticolor ? (baseHue + e * 7) % 360 : baseHue;

    for (let s = 0; s < pointsPerEdge; s++) {
      const u = (s + 0.5) / pointsPerEdge;
      // Slight crystalline facet ridgeline vibration
      const ridgeWobble = Math.sin(elapsed * 0.002 + e * 1.3 + s * 0.5) * 0.002;

      const lx = pA.x + (pB.x - pA.x) * u;
      const ly = pA.y + (pB.y - pA.y) * u + ridgeWobble;
      const lz = pA.z + (pB.z - pA.z) * u;

      const proj = projectCrystal3DPoint(lx, ly, lz, crystalRotation);
      const px = centerX + proj.x * scale;
      const py = centerY + proj.y * scale;

      const ptDepthAlpha = Math.max(0.18, Math.min(0.9, 0.45 * proj.depthScale)) * alpha;
      const ptRadius = Math.max(0.6, 1.1 * proj.depthScale);

      ctx.beginPath();
      ctx.arc(px, py, ptRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${edgeHue}, 90%, 75%, ${ptDepthAlpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  // Group B: Planar Facet Surface Sheen & Specular Glints (16 faces x 56 points = 896 points)
  // Distribute across triangular and trapezoidal facets using barycentric coordinates
  // Faces: 6 upper pyramid triangles, 6 lower pyramid triangles, 4 equatorial facets
  const facetTriangles: Array<[
    { x: number; y: number; z: number },
    { x: number; y: number; z: number },
    { x: number; y: number; z: number }
  ]> = [];

  for (let i = 0; i < 6; i++) {
    // Upper triangular facets
    facetTriangles.push([topApex, upperRing[i], upperRing[(i + 1) % 6]]);
    // Lower triangular facets
    facetTriangles.push([botApex, lowerRing[i], lowerRing[(i + 1) % 6]]);
  }
  for (let i = 0; i < 4; i++) {
    // Equatorial trapezoid halved triangles
    facetTriangles.push([upperRing[i], eqRing[i], lowerRing[i]]);
  }

  const pointsPerFace = 56;
  for (let f = 0; f < facetTriangles.length; f++) {
    const [v0, v1, v2] = facetTriangles[f];

    // Compute approximate facet normal in 3D for specular glint
    const e1x = v1.x - v0.x;
    const e1y = v1.y - v0.y;
    const e1z = v1.z - v0.z;
    const e2x = v2.x - v0.x;
    const e2y = v2.y - v0.y;
    const e2z = v2.z - v0.z;

    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    const nLen = Math.hypot(nx, ny, nz) || 1.0;
    const normX = nx / nLen;
    const normY = ny / nLen;
    const normZ = nz / nLen;

    // Rotate normal with crystal rotation
    const cosR = Math.cos(crystalRotation);
    const sinR = Math.sin(crystalRotation);
    const rNormX = normX * cosR + normZ * sinR;
    const rNormZ = -normX * sinR + normZ * cosR;

    // Specular light vector: light from slightly top-front (-0.2, -0.6, 0.77)
    const dotLight = Math.max(0, rNormX * -0.2 + normY * -0.6 + rNormZ * 0.77);
    const specularGlint = Math.pow(dotLight, 4.0);

    const faceHue = isMulticolor
      ? (baseHue + (f * 15)) % 360
      : (f % 2 === 0 ? baseHue : highlightHue);

    for (let p = 0; p < pointsPerFace; p++) {
      // Deterministic quasi-random barycentric coordinates
      const r1 = crystalHash(f * 200 + p * 3.7);
      const r2 = crystalHash(f * 200 + p * 7.1 + 0.33);
      const sqrtR1 = Math.sqrt(r1);
      const u = 1 - sqrtR1;
      const v = r2 * sqrtR1;
      const w = 1 - u - v;

      const lx = u * v0.x + v * v1.x + w * v2.x;
      const ly = u * v0.y + v * v1.y + w * v2.y;
      const lz = u * v0.z + v * v1.z + w * v2.z;

      const proj = projectCrystal3DPoint(lx, ly, lz, crystalRotation);
      const px = centerX + proj.x * scale;
      const py = centerY + proj.y * scale;

      // Specular glint boosts alpha and lightness for shimmering crystal face
      const faceAlpha = Math.min(0.95, (0.22 + specularGlint * 0.55) * proj.depthScale * alpha);
      const faceRadius = Math.max(0.5, (0.8 + specularGlint * 0.9) * proj.depthScale);
      const faceLightness = Math.min(95, 65 + specularGlint * 30);

      ctx.beginPath();
      ctx.arc(px, py, faceRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${faceHue}, 90%, ${faceLightness.toFixed(1)}%, ${faceAlpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  // Group C: Inner Volumetric Lattice & Quantum Nucleus (~720 points)
  // Subgroup C1: Inner Octahedral Lattice Edges (12 edges x 40 points = 480 points)
  const innerEdgePairs: Array<[{ x: number; y: number; z: number }, { x: number; y: number; z: number }]> = [];
  for (let i = 0; i < 6; i++) {
    innerEdgePairs.push([innerTopApex, innerRing[i]]);
    innerEdgePairs.push([innerBotApex, innerRing[i]]);
  }

  const pointsPerInnerEdge = 40;
  for (let ie = 0; ie < innerEdgePairs.length; ie++) {
    const [pA, pB] = innerEdgePairs[ie];
    const coreEdgeHue = isMulticolor ? (baseHue + 40 + ie * 10) % 360 : highlightHue;

    for (let k = 0; k < pointsPerInnerEdge; k++) {
      const u = (k + 0.5) / pointsPerInnerEdge;
      const breathe = Math.sin(elapsed * 0.003 + ie * 0.7 + k * 0.3) * 0.003;

      const lx = pA.x + (pB.x - pA.x) * u;
      const ly = pA.y + (pB.y - pA.y) * u + breathe;
      const lz = pA.z + (pB.z - pA.z) * u;

      const proj = projectCrystal3DPoint(lx, ly, lz, crystalRotation);
      const px = centerX + proj.x * scale;
      const py = centerY + proj.y * scale;

      const coreAlpha = Math.min(0.9, 0.40 * proj.depthScale * alpha);
      const coreRadius = Math.max(0.6, 1.0 * proj.depthScale);

      ctx.beginPath();
      ctx.arc(px, py, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${coreEdgeHue}, 95%, 80%, ${coreAlpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  // Subgroup C2: Quantum Seed Nucleus (3 concentric spherical orbital rings x 80 points = 240 points)
  const coreSeedCount = 80;
  const coreHues = [baseHue, highlightHue, (baseHue + 80) % 360];
  for (let ring = 0; ring < 3; ring++) {
    const ringRadius = 0.035 + ring * 0.022;
    const ringHue = isMulticolor ? coreHues[ring] : highlightHue;
    const ringTilt = (ring * Math.PI) / 3;

    for (let n = 0; n < coreSeedCount; n++) {
      const theta = (n / coreSeedCount) * Math.PI * 2 + elapsed * (0.0012 + ring * 0.0004);
      const rawX = ringRadius * Math.cos(theta);
      const rawY = ringRadius * Math.sin(theta) * Math.cos(ringTilt);
      const rawZ = ringRadius * Math.sin(theta) * Math.sin(ringTilt);

      const proj = projectCrystal3DPoint(rawX, rawY, rawZ, crystalRotation);
      const px = centerX + proj.x * scale;
      const py = centerY + proj.y * scale;

      const seedAlpha = Math.min(0.95, (0.45 + 0.25 * Math.sin(theta * 3)) * alpha);
      const seedRadius = Math.max(0.7, 1.2 * proj.depthScale);

      ctx.beginPath();
      ctx.arc(px, py, seedRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${ringHue}, 100%, 85%, ${seedAlpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  // Group D: Luminous Energy Channels & Refraction Sparkles (~610 points)
  // Subgroup D1: Propagating Energy Pulses along vertical crystalline channels (6 channels x 60 points = 360 points)
  const pulseSpeed = elapsed * 0.0024;
  const pulsePointsPerChannel = 60;
  for (let ch = 0; ch < 6; ch++) {
    const chPhase = ch * (Math.PI / 3);
    const chHue = isMulticolor ? (baseHue + ch * 20) % 360 : highlightHue;

    for (let q = 0; q < pulsePointsPerChannel; q++) {
      // Wave moving down from top apex through upper ring to equator, then down to bottom apex
      const tNorm = ((q / pulsePointsPerChannel) + pulseSpeed + chPhase * 0.2) % 1.0;
      let lx: number, ly: number, lz: number;

      if (tNorm < 0.5) {
        // Upper section: topApex -> upperRing[ch]
        const u = tNorm * 2.0;
        lx = topApex.x + (upperRing[ch].x - topApex.x) * u;
        ly = topApex.y + (upperRing[ch].y - topApex.y) * u;
        lz = topApex.z + (upperRing[ch].z - topApex.z) * u;
      } else {
        // Lower section: upperRing[ch] -> eqRing[ch] -> botApex
        const u = (tNorm - 0.5) * 2.0;
        lx = eqRing[ch].x + (botApex.x - eqRing[ch].x) * u;
        ly = eqRing[ch].y + (botApex.y - eqRing[ch].y) * u;
        lz = eqRing[ch].z + (botApex.z - eqRing[ch].z) * u;
      }

      const proj = projectCrystal3DPoint(lx, ly, lz, crystalRotation);
      const px = centerX + proj.x * scale;
      const py = centerY + proj.y * scale;

      // Pulse brightness concentration
      const pulseBrightness = Math.sin(tNorm * Math.PI * 4 + elapsed * 0.003) * 0.5 + 0.5;
      const pulseAlpha = Math.min(0.98, (0.35 + pulseBrightness * 0.45) * alpha);
      const pulseRadius = Math.max(0.6, (0.9 + pulseBrightness * 0.8) * proj.depthScale);

      ctx.beginPath();
      ctx.arc(px, py, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${chHue}, 100%, 82%, ${pulseAlpha.toFixed(3)})`;
      ctx.fill();
    }
  }

  // Subgroup D2: Prismatic Floating Refraction Sparks inside crystal envelope (250 points)
  const sparkCount = 250;
  for (let s = 0; s < sparkCount; s++) {
    // Deterministic position inside bipyramid envelope
    const hashA = crystalHash(s * 13.7 + 0.1);
    const hashB = crystalHash(s * 29.3 + 0.5);
    const hashC = crystalHash(s * 47.1 + 0.9);

    const sparkTheta = hashA * Math.PI * 2;
    // Radial envelope tapers toward apexes (|y| increases -> max radius decreases)
    const sparkY = (hashB - 0.5) * 0.65;
    const maxRAtY = 0.28 * (1.0 - Math.abs(sparkY) / 0.38);
    const sparkR = hashC * Math.max(0.02, maxRAtY);

    // Subtle harmonic floating motion
    const floatPhase = elapsed * 0.0018 + s * 0.3;
    const dy = Math.sin(floatPhase) * 0.006;

    const rawX = sparkR * Math.cos(sparkTheta);
    const rawY = sparkY + dy;
    const rawZ = sparkR * Math.sin(sparkTheta);

    const proj = projectCrystal3DPoint(rawX, rawY, rawZ, crystalRotation);
    const px = centerX + proj.x * scale;
    const py = centerY + proj.y * scale;

    const sparkShimmer = Math.sin(floatPhase * 2.0) * 0.5 + 0.5;
    const sparkAlpha = Math.min(0.95, (0.25 + sparkShimmer * 0.50) * proj.depthScale * alpha);
    const sparkRadius = Math.max(0.5, (0.7 + sparkShimmer * 0.6) * proj.depthScale);
    const sparkHue = isMulticolor ? (baseHue + (s % 5) * 24) % 360 : highlightHue;

    ctx.beginPath();
    ctx.arc(px, py, sparkRadius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${sparkHue}, 90%, 80%, ${sparkAlpha.toFixed(3)})`;
    ctx.fill();
  }
}
