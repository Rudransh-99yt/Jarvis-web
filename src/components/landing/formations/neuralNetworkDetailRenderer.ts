/**
 * ============================================================================
 * JARVIS FORMATION #08: COMPUTATIONAL NEURAL NETWORK DETAIL RENDERER
 * ============================================================================
 * High-density Canvas 2D detail layer for Formation #08 (Neural Network).
 *
 * Distinct Visual Architecture:
 * - Purely Computational Multi-Layer Architecture:
 *   - Layer 1: Sensory Input Nodes (8 nodes, x = -0.35)
 *   - Layer 2: Feature Encoding Nodes (12 nodes, x = -0.15)
 *   - Layer 3: Deep Latent Bottleneck / Nucleus Hub (16 nodes, x = 0.08)
 *   - Layer 4: Motor & Decision Output Nodes (10 nodes, x = 0.32)
 *   - Modulatory Interneurons / Bias Nodes (4 nodes)
 * - Directed Matrix Weight Filaments with Dynamic Synaptic Conductance (quadratic arcs)
 * - Propagating Forward Data Solitons / Tensor Activation Waves (left-to-right surges)
 * - Volumetric Micro-Points (~3,200 points):
 *   - 50 Primary Somas / Weight Matrix Processing Hubs
 *   - 1,280 Activation Stream Micro-Packets flowing along weighted axon channels
 *   - 1,120 Latent Space Representation Manifold / Embedding Field (clustered in Layer 3)
 *   - 750 Output Decision Tensor Wavefronts & Quantum Bias Filaments
 * - Zero Math.random() in executable code (100% deterministic, seed/index-driven)
 * - Zero draw calls when inactive (progress <= 0.02)
 * - Seamless theme support across single-hue and multicolor modes
 * ============================================================================
 */

export interface NeuralNetworkRenderOptions {
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

export function renderNeuralNetworkDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: NeuralNetworkRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // High-speed computational clock cycle
  const pulseSpeed = elapsed * 0.0028;

  // Coordinate projection helper
  const project = (xNorm: number, yNorm: number, zNorm = 0) => {
    const screenX = centerX + xNorm * scale;
    const screenY = centerY + yNorm * scale;
    return { screenX, screenY, z: zNorm };
  };

  // ---------------------------------------------------------------------------
  // 1. CENTRAL LATENT REPRESENTATION NUCLEUS GLOW (Computing Engine Core)
  // ---------------------------------------------------------------------------
  const latentCenterX = 0.08 * scale;
  const latentCenterY = 0.00 * scale;
  const latentRadius = 0.12 * scale;
  const coreAlpha = masterAlpha * 0.38;
  const latentHue = isMulticolor ? 275 : (highlightHue ?? baseHue);

  const coreGrad = ctx.createRadialGradient(
    centerX + latentCenterX,
    centerY + latentCenterY,
    0,
    centerX + latentCenterX,
    centerY + latentCenterY,
    latentRadius
  );
  coreGrad.addColorStop(0, `hsla(${latentHue}, 100%, 92%, ${coreAlpha})`);
  coreGrad.addColorStop(0.35, `hsla(${isMulticolor ? 195 : baseHue}, 96%, 72%, ${coreAlpha * 0.55})`);
  coreGrad.addColorStop(1, `hsla(${baseHue}, 90%, 50%, 0)`);

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(centerX + latentCenterX, centerY + latentCenterY, latentRadius, 0, Math.PI * 2);
  ctx.fill();

  // ---------------------------------------------------------------------------
  // 2. MULTI-LAYER WEIGHTED SYNAPSE FILAMENT CHANNELS
  // ---------------------------------------------------------------------------
  // Layer coordinates matching formationRegistry:
  // Layer 1: 8 nodes at x = -0.35, y in [-0.32, 0.32]
  // Layer 2: 12 nodes at x = -0.15, y in [-0.32, 0.32]
  // Layer 3: 16 nodes at x = 0.08, y in [-0.36, 0.36]
  // Layer 4: 10 nodes at x = 0.32, y in [-0.32, 0.32]
  const tierX = [-0.35, -0.15, 0.08, 0.32];
  const tierYCounts = [8, 12, 16, 10];

  const getTierNodePos = (tierIdx: number, nodeIdx: number) => {
    const count = tierYCounts[tierIdx];
    const t = count > 1 ? nodeIdx / (count - 1) : 0.5;
    const ySpan = tierIdx === 2 ? 0.36 : 0.32;
    const y = -ySpan + t * (2 * ySpan);
    const wave = Math.sin(t * Math.PI * 2.5 + pulseSpeed * 0.6) * 0.014;
    const x = tierX[tierIdx] + wave;
    const z = Math.sin(t * Math.PI + tierIdx) * 0.045;
    return { x, y, z };
  };

  ctx.save();
  for (let t = 0; t < 3; t++) {
    const fromCount = tierYCounts[t];
    const toCount = tierYCounts[t + 1];
    const channelHue = isMulticolor
      ? (t === 0 ? 190 : t === 1 ? 235 : 285)
      : baseHue;

    ctx.strokeStyle = `hsla(${channelHue}, 90%, 70%, ${masterAlpha * 0.32})`;
    ctx.lineWidth = Math.max(1.1, scale * 0.0016);

    for (let f = 0; f < fromCount; f++) {
      const fromPos = getTierNodePos(t, f);
      const target1 = Math.floor((f / fromCount) * toCount);
      const target2 = (target1 + 1) % toCount;

      for (const target of [target1, target2]) {
        const toPos = getTierNodePos(t + 1, target);
        const pFrom = project(fromPos.x, fromPos.y, fromPos.z);
        const pTo = project(toPos.x, toPos.y, toPos.z);

        const midX = (pFrom.screenX + pTo.screenX) * 0.5;
        const midY = (pFrom.screenY + pTo.screenY) * 0.5 + Math.sin(f + target) * 0.026 * scale;

        ctx.beginPath();
        ctx.moveTo(pFrom.screenX, pFrom.screenY);
        ctx.quadraticCurveTo(midX, midY, pTo.screenX, pTo.screenY);
        ctx.stroke();
      }
    }
  }

  // Intra-Latent bottleneck longitudinal bus channels (Layer 3)
  const l3Count = tierYCounts[2];
  ctx.strokeStyle = `hsla(${isMulticolor ? 290 : (highlightHue ?? baseHue)}, 92%, 76%, ${masterAlpha * 0.38})`;
  ctx.lineWidth = Math.max(1.3, scale * 0.0020);
  for (let i = 0; i < l3Count - 1; i++) {
    const p1 = project(getTierNodePos(2, i).x, getTierNodePos(2, i).y, getTierNodePos(2, i).z);
    const p2 = project(getTierNodePos(2, i + 1).x, getTierNodePos(2, i + 1).y, getTierNodePos(2, i + 1).z);
    ctx.beginPath();
    ctx.moveTo(p1.screenX, p1.screenY);
    ctx.lineTo(p2.screenX, p2.screenY);
    ctx.stroke();
  }
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 3. PROPAGATING FORWARD ACTIVATION SOLITONS (High-speed data packets)
  // ---------------------------------------------------------------------------
  const solitonCount = 42;
  for (let s = 0; s < solitonCount; s++) {
    const tier = s % 3;
    const fromCount = tierYCounts[tier];
    const toCount = tierYCounts[tier + 1];
    const f = (s * 3) % fromCount;
    const target = Math.floor((f / fromCount) * toCount);

    const fromPos = getTierNodePos(tier, f);
    const toPos = getTierNodePos(tier + 1, target);

    const phase = ((pulseSpeed * 1.1 + s * 0.32) % 1.0 + 1.0) % 1.0;
    const easePhase = phase * phase * (3 - 2 * phase);

    const midX = (fromPos.x + toPos.x) * 0.5;
    const midY = (fromPos.y + toPos.y) * 0.5 + Math.sin(f + target) * 0.026;

    const oneMinusT = 1 - easePhase;
    const currX = oneMinusT * oneMinusT * fromPos.x + 2 * oneMinusT * easePhase * midX + easePhase * easePhase * toPos.x;
    const currY = oneMinusT * oneMinusT * fromPos.y + 2 * oneMinusT * easePhase * midY + easePhase * easePhase * toPos.y;

    const { screenX, screenY } = project(currX, currY);
    const solitonAlpha = masterAlpha * Math.sin(phase * Math.PI) * 0.95;
    const solitonHue = isMulticolor ? (185 + s * 14) % 360 : (highlightHue ?? baseHue);

    const glowR = 6.5;
    const pulseGlow = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, glowR);
    pulseGlow.addColorStop(0, `hsla(${solitonHue}, 100%, 96%, ${solitonAlpha})`);
    pulseGlow.addColorStop(0.4, `hsla(${solitonHue}, 100%, 78%, ${solitonAlpha * 0.52})`);
    pulseGlow.addColorStop(1, `hsla(${solitonHue}, 90%, 50%, 0)`);
    ctx.fillStyle = pulseGlow;
    ctx.beginPath();
    ctx.arc(screenX, screenY, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(0, 0%, 100%, ${solitonAlpha})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // 4. VOLUMETRIC HIGH-DENSITY COMPUTATIONAL MICRO-POINTS (~3,200 points)
  // ---------------------------------------------------------------------------
  // Partitioned cleanly into computational sub-structures:
  // A. Primary Processing Nodes / Somas (50 nodes = 46 tier nodes + 4 modulatory nodes)
  // B. Directed Activation Stream Micro-Packets along weight channels (1,280 points)
  // C. Latent Space Representation Manifold / Embedding Cloud (1,120 points)
  // D. Output Decision Wavefronts & Gradient Bias Filaments (750 points)
  // Total = 3,200 micro-points!

  const points: Array<{
    x: number;
    y: number;
    z: number;
    hue: number;
    size: number;
    isCore: boolean;
  }> = [];

  // A. Primary Processing Somas (46 nodes) & Modulatory Interneurons (4 nodes) = 50 Nodes
  for (let t = 0; t < 4; t++) {
    const count = tierYCounts[t];
    const tierHue = isMulticolor ? (180 + t * 40) % 360 : baseHue;
    for (let n = 0; n < count; n++) {
      const pos = getTierNodePos(t, n);
      points.push({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        hue: tierHue,
        size: 2.3 + (n % 2) * 0.6,
        isCore: true
      });
    }
  }

  // 4 Modulatory Interneurons / Bias Nodes (matching formationRegistry)
  const modBoutons = [
    { x: 0.00, y: -0.34 },
    { x: 0.00, y: 0.34 },
    { x: -0.03, y: -0.18 },
    { x: -0.03, y: 0.18 }
  ];
  for (let b = 0; b < modBoutons.length; b++) {
    const mb = modBoutons[b];
    const wave = Math.sin(mb.y * Math.PI * 2.5 + pulseSpeed * 0.6) * 0.014;
    points.push({
      x: mb.x + wave,
      y: mb.y,
      z: 0.02,
      hue: isMulticolor ? 172 : (highlightHue ?? baseHue),
      size: 1.9,
      isCore: true
    });
  }

  // B. Directed Activation Stream Micro-Packets along weight channels (1,280 points)
  // Particles interpolated along weight connections representing forward tensor flow
  for (let i = 0; i < 1280; i++) {
    const tier = i % 3;
    const fromCount = tierYCounts[tier];
    const toCount = tierYCounts[tier + 1];
    const fromIdx = Math.floor((i / 1280) * fromCount * 7) % fromCount;
    const toIdx = (Math.floor((fromIdx / fromCount) * toCount) + (i % 2)) % toCount;

    const fromPos = getTierNodePos(tier, fromIdx);
    const toPos = getTierNodePos(tier + 1, toIdx);

    // Parametric flow progress along channel
    const t = ((i * 0.0078125 + pulseSpeed * 0.25) % 1.0 + 1.0) % 1.0;
    const midX = (fromPos.x + toPos.x) * 0.5;
    const midY = (fromPos.y + toPos.y) * 0.5 + Math.sin(fromIdx + toIdx) * 0.026;

    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * fromPos.x + 2 * oneMinusT * t * midX + t * t * toPos.x;
    const y = oneMinusT * oneMinusT * fromPos.y + 2 * oneMinusT * t * midY + t * t * toPos.y;
    const z = (fromPos.z * (1 - t) + toPos.z * t) + Math.sin(i * 3.1) * 0.015;

    const hue = isMulticolor ? (180 + tier * 35 + (i % 5) * 6) % 360 : baseHue;
    points.push({ x, y, z, hue, size: 0.85 + (i % 3) * 0.35, isCore: false });
  }

  // C. Latent Space Representation Manifold / Embedding Cloud (1,120 points)
  // Clustered symmetrically around Layer 3 (x ~ 0.08) representing the deep latent space
  for (let i = 0; i < 1120; i++) {
    const t = i / 1119;
    const angle = t * Math.PI * 2 * 9.4 + (i % 7) * 0.5;
    const rX = 0.045 + Math.sin(i * 2.3) * 0.035;
    const rY = 0.075 + Math.cos(i * 1.7) * 0.055;
    const yCenter = -0.32 + t * 0.64;

    const x = 0.08 + Math.cos(angle) * rX + Math.sin(t * Math.PI * 3 + pulseSpeed * 0.5) * 0.012;
    const y = yCenter + Math.sin(angle) * rY * 0.4;
    const z = Math.sin(angle * 2.0) * 0.038;

    const hue = isMulticolor
      ? (260 + (i * 7) % 80) % 360
      : (highlightHue ?? baseHue);

    points.push({ x, y, z, hue, size: 0.80 + (i % 3) * 0.35, isCore: false });
  }

  // D. Output Decision Wavefronts & Gradient Bias Filaments (750 points)
  // Luminous data ripples emanating outward from Layer 4 Output nodes into actionable decisions
  for (let i = 0; i < 750; i++) {
    const parentNode = i % tierYCounts[3];
    const parentPos = getTierNodePos(3, parentNode);
    const t = (i / 749);
    const sweepAngle = -Math.PI * 0.45 + (parentNode / 9) * Math.PI * 0.9;
    const reach = 0.025 + ((i * 11) % 43) * 0.0022;

    const x = parentPos.x + Math.cos(sweepAngle) * reach + Math.sin(i * 4.2 + pulseSpeed) * 0.008;
    const y = parentPos.y + Math.sin(sweepAngle) * reach;
    const z = parentPos.z + ((i % 5) - 2) * 0.008;

    const hue = isMulticolor ? (165 + (i * 9) % 65) : baseHue;
    points.push({ x, y, z, hue, size: 0.75 + (i % 2) * 0.35, isCore: false });
  }

  // ---------------------------------------------------------------------------
  // 5. BATCHED CANVAS 2D DEPTH RENDERING FOR SOLID 60 FPS
  // ---------------------------------------------------------------------------
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const { screenX, screenY, z } = project(pt.x, pt.y, pt.z);

    const isForeground = z >= 0;
    const baseAlpha = isForeground
      ? masterAlpha * (0.62 + z * 0.36)
      : masterAlpha * (0.24 + (z + 1) * 0.18);

    const ptAlpha = pt.isCore ? Math.min(1.0, baseAlpha * 1.40) : baseAlpha;
    const renderR = Math.max(0.60, pt.size + (isForeground ? z * 0.5 : 0));

    // Processing hub halo glow
    if (pt.isCore && isForeground && ptAlpha > 0.40) {
      const haloR = renderR * 3.5;
      const hubGlow = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, haloR);
      hubGlow.addColorStop(0, `hsla(${pt.hue}, 100%, 88%, ${ptAlpha * 0.45})`);
      hubGlow.addColorStop(1, `hsla(${pt.hue}, 90%, 50%, 0)`);
      ctx.fillStyle = hubGlow;
      ctx.beginPath();
      ctx.arc(screenX, screenY, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    const lightness = pt.isCore ? 96 : (isForeground ? 86 : 74);
    ctx.fillStyle = `hsla(${pt.hue}, 95%, ${lightness}%, ${ptAlpha})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, renderR, 0, Math.PI * 2);
    ctx.fill();
  }
}
