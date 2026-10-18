/**
 * ============================================================================
 * JARVIS FORMATION #10: MULTIPOLAR SINGLE NEURON DETAIL RENDERER
 * ============================================================================
 * High-density Canvas 2D detail layer for Formation #10 (Single Neuron).
 *
 * Distinct Anatomical Architecture:
 * 1. Prominent Soma (Cell Body):
 *    - Central luminous spherical nucleus with dense nucleolus and chromatin granules.
 *    - Volumetric perikaryon texture with Nissl bodies (dense rough ER/ribosome granules).
 *    - Neurofilament cytoskeleton radiating organically outward toward dendritic roots.
 * 2. Multipolar Dendritic Arbor:
 *    - 5 primary dendritic trunks radiating organically away from the axon.
 *    - Secondary and tertiary bifurcations with tapered organic calibers.
 *    - Prominent dendritic spines (gemmules) with distinct necks and bulbous heads.
 * 3. Axon Hillock:
 *    - Anatomically distinct tapered funnel transition from soma to the axon initial segment.
 *    - Concentrated voltage-gated sodium channel trigger zone.
 * 4. Segmented Myelinated Axon:
 *    - Dominant elongated axon projecting across the field.
 *    - 4 distinct segmented myelin sheaths with concentric lamellar membranes and Schwann/oligodendrocyte nuclei.
 *    - Clearly visible, uninsulated Nodes of Ranvier gaps exhibiting saltatory conduction.
 * 5. Axon Terminals & Boutons:
 *    - Branching telodendria terminal arborization.
 *    - 6 distinct terminal boutons (synaptic knobs) filled with neurotransmitter vesicle clouds.
 * 6. Dynamic Bio-Electric Propagation:
 *    - Dendritic graded potentials converging on the soma.
 *    - Action potential initiation at the hillock and rapid saltatory leaping across Nodes of Ranvier.
 *    - Synaptic vesicle excitation and discharge glow at terminal boutons.
 *
 * Performance & Verification:
 * - 100% deterministic (zero Math.random() in executable code, trigonometric/index-based seeds).
 * - Zero draw operations when inactive (progress <= 0.02).
 * - >= 2,500 volumetric micro-points & >= 4 structural filaments when active.
 * - Full color theme support across single-hue and multicolor palettes.
 * ============================================================================
 */

export interface SingleNeuronRenderOptions {
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

export function renderSingleNeuronDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: SingleNeuronRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // Bio-electric firing clock cycle (~0.4 Hz cycle rate)
  const fireSpeed = elapsed * 0.0024;
  const cyclePhase = (fireSpeed % (Math.PI * 2)) / (Math.PI * 2); // 0 to 1

  // Color palette definitions
  const primaryHue = isMulticolor ? 185 : baseHue; // Cyan / Base
  const nucleusHue = isMulticolor ? 280 : (highlightHue ?? baseHue); // Luminous Purple / Gold
  const myelinHue = isMulticolor ? 198 : baseHue; // Electric Blue Myelin
  const spikeHue = isMulticolor ? 45 : (highlightHue ?? baseHue); // Gold Action Potential Spike
  const boutonHue = isMulticolor ? 320 : (highlightHue ?? baseHue); // Rose Synaptic Bouton

  // Anatomical Reference Coordinates (normalized scale units)
  const somaX = -0.14 * scale;
  const somaY = -0.02 * scale;
  const somaRadius = 0.095 * scale;
  const nucleusRadius = 0.040 * scale;

  // Coordinate projection helper
  const project = (normX: number, normY: number) => ({
    x: centerX + normX * scale,
    y: centerY + normY * scale
  });

  // ---------------------------------------------------------------------------
  // 1. PROMINENT SOMA & LUMINOUS NUCLEUS
  // ---------------------------------------------------------------------------
  // A. Luminous Nuclear Core Glow
  const nucGrad = ctx.createRadialGradient(
    centerX + somaX,
    centerY + somaY,
    0,
    centerX + somaX,
    centerY + somaY,
    nucleusRadius * 2.2
  );
  const nucAlpha = masterAlpha * 0.45;
  nucGrad.addColorStop(0, `hsla(${nucleusHue}, 100%, 94%, ${nucAlpha})`);
  nucGrad.addColorStop(0.35, `hsla(${primaryHue}, 90%, 75%, ${nucAlpha * 0.6})`);
  nucGrad.addColorStop(0.7, `hsla(${primaryHue}, 80%, 55%, ${nucAlpha * 0.2})`);
  nucGrad.addColorStop(1, `hsla(${primaryHue}, 70%, 40%, 0)`);

  ctx.fillStyle = nucGrad;
  ctx.beginPath();
  ctx.arc(centerX + somaX, centerY + somaY, nucleusRadius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // B. Nucleolus focal center mark
  ctx.fillStyle = `hsla(${nucleusHue}, 100%, 96%, ${masterAlpha * 0.85})`;
  ctx.beginPath();
  ctx.arc(centerX + somaX, centerY + somaY, Math.max(1.8, scale * 0.007), 0, Math.PI * 2);
  ctx.fill();

  // C. Nuclear Envelope Chromatin Granules (120 micro-points)
  const chromatinCount = 120;
  for (let i = 0; i < chromatinCount; i++) {
    const angle = (i * 2.399963) % (Math.PI * 2); // Golden angle step
    const rDist = (0.2 + 0.78 * ((i % 17) / 16)) * nucleusRadius;
    const px = centerX + somaX + Math.cos(angle) * rDist;
    const py = centerY + somaY + Math.sin(angle) * rDist;
    const pAlpha = masterAlpha * (0.35 + 0.45 * Math.sin(fireSpeed + i * 0.5));
    ctx.fillStyle = `hsla(${nucleusHue}, 90%, 82%, ${pAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.7, scale * 0.0016), 0, Math.PI * 2);
    ctx.fill();
  }

  // D. Perikaryon Nissl Bodies (Dense granular rough ER/ribosome clusters: 8 clusters, ~500 micro-points)
  const clusterAngles = [0.4, 1.1, 1.9, 2.7, 3.6, 4.3, 5.0, 5.8];
  const clusterRadii = [0.062, 0.068, 0.058, 0.072, 0.065, 0.070, 0.060, 0.075];
  const pointsPerCluster = 64; // 8 * 64 = 512 points
  for (let c = 0; c < clusterAngles.length; c++) {
    const cAngle = clusterAngles[c];
    const cDist = clusterRadii[c] * scale;
    const cX = centerX + somaX + Math.cos(cAngle) * cDist;
    const cY = centerY + somaY + Math.sin(cAngle) * cDist;

    for (let p = 0; p < pointsPerCluster; p++) {
      const pAng = (p * 2.39996) % (Math.PI * 2);
      const pRad = (0.15 + 0.82 * Math.sqrt((p % 23) / 22)) * (0.018 * scale);
      const gx = cX + Math.cos(pAng) * pRad;
      const gy = cY + Math.sin(pAng) * pRad;
      const granuleAlpha = masterAlpha * (0.28 + 0.35 * Math.sin(fireSpeed * 0.8 + c + p * 0.3));
      ctx.fillStyle = `hsla(${primaryHue}, 85%, 68%, ${granuleAlpha})`;
      ctx.beginPath();
      ctx.arc(gx, gy, Math.max(0.65, scale * 0.0014), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // E. Cytoskeletal Neurofilaments Radiating Through Perikaryon (280 micro-points)
  const neurofilamentSpokes = 14;
  const pointsPerSpoke = 20; // 280 points
  for (let s = 0; s < neurofilamentSpokes; s++) {
    const spokeAngle = (s / neurofilamentSpokes) * Math.PI * 2;
    for (let pt = 0; pt < pointsPerSpoke; pt++) {
      const frac = (pt + 1) / pointsPerSpoke;
      const r = (nucleusRadius * 0.9) + frac * (somaRadius - nucleusRadius * 0.9);
      // Slight curvature in filament path
      const curvedAngle = spokeAngle + Math.sin(frac * Math.PI * 1.5 + s) * 0.12;
      const fx = centerX + somaX + Math.cos(curvedAngle) * r;
      const fy = centerY + somaY + Math.sin(curvedAngle) * r;
      const filAlpha = masterAlpha * (0.22 + 0.28 * frac);
      ctx.fillStyle = `hsla(${primaryHue}, 80%, 75%, ${filAlpha})`;
      ctx.beginPath();
      ctx.arc(fx, fy, Math.max(0.6, scale * 0.0012), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // F. Soma Multipolar Cell Membrane Boundary (Structural Filament 1)
  const somaBoundaryPoints = 48;
  ctx.save();
  ctx.strokeStyle = `hsla(${primaryHue}, 90%, 72%, ${masterAlpha * 0.45})`;
  ctx.lineWidth = Math.max(1.2, scale * 0.0022);
  ctx.beginPath();
  for (let i = 0; i <= somaBoundaryPoints; i++) {
    const t = i / somaBoundaryPoints;
    const ang = t * Math.PI * 2;
    // Modulate radius to give multipolar concave contours between dendritic roots and hillock
    const bump =
      Math.sin(ang * 5 + 0.8) * 0.012 +
      Math.cos(ang * 3 - 0.4) * 0.008 +
      (Math.cos(ang) > 0.6 ? -0.015 : 0.005); // Taper towards axon hillock on right
    const rad = somaRadius + bump * scale;
    const bx = centerX + somaX + Math.cos(ang) * rad;
    const by = centerY + somaY + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.stroke();
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 2. MULTIPOLAR DENDRITIC ARBOR & VISIBLE DENDRITIC SPINES
  // ---------------------------------------------------------------------------
  // 5 Major Dendritic Trunks with Secondary & Tertiary Branch Paths
  interface DendriteBranch {
    startX: number;
    startY: number;
    ctrlX: number;
    ctrlY: number;
    endX: number;
    endY: number;
    width: number;
  }

  const dendritePaths: DendriteBranch[] = [
    // Trunk 1: Apical Main Trunk (upward-left)
    { startX: -0.19, startY: -0.09, ctrlX: -0.22, ctrlY: -0.14, endX: -0.25, endY: -0.18, width: 2.2 },
    // Branch 1A: Apical Upper Tuft
    { startX: -0.25, startY: -0.18, ctrlX: -0.27, ctrlY: -0.22, endX: -0.29, endY: -0.26, width: 1.5 },
    // Branch 1B: Apical Lateral Fork
    { startX: -0.25, startY: -0.18, ctrlX: -0.30, ctrlY: -0.18, endX: -0.35, endY: -0.21, width: 1.4 },

    // Trunk 2: Dorsal-Lateral Trunk (left-up)
    { startX: -0.22, startY: -0.04, ctrlX: -0.26, ctrlY: -0.06, endX: -0.30, endY: -0.05, width: 2.0 },
    // Branch 2A: Dorsal Upper Fork
    { startX: -0.30, startY: -0.05, ctrlX: -0.34, ctrlY: -0.08, endX: -0.38, endY: -0.09, width: 1.3 },
    // Branch 2B: Dorsal Lower Fork
    { startX: -0.30, startY: -0.05, ctrlX: -0.34, ctrlY: -0.01, endX: -0.38, endY: 0.02, width: 1.3 },

    // Trunk 3: Horizontal Basal Trunk (straight left)
    { startX: -0.23, startY: 0.01, ctrlX: -0.28, ctrlY: 0.02, endX: -0.32, endY: 0.03, width: 1.9 },
    // Branch 3A: Basal Lateral Tip
    { startX: -0.32, startY: 0.03, ctrlX: -0.36, ctrlY: 0.05, endX: -0.40, endY: 0.06, width: 1.2 },

    // Trunk 4: Ventral-Lateral Trunk (left-down)
    { startX: -0.21, startY: 0.06, ctrlX: -0.25, ctrlY: 0.11, endX: -0.28, endY: 0.14, width: 2.0 },
    // Branch 4A: Ventral Lower Fork
    { startX: -0.28, startY: 0.14, ctrlX: -0.31, ctrlY: 0.17, endX: -0.35, endY: 0.20, width: 1.3 },
    // Branch 4B: Ventral Recurrent Fork
    { startX: -0.28, startY: 0.14, ctrlX: -0.26, ctrlY: 0.19, endX: -0.28, endY: 0.25, width: 1.2 },

    // Trunk 5: Descending Basal Trunk (downward)
    { startX: -0.16, startY: 0.07, ctrlX: -0.18, ctrlY: 0.13, endX: -0.19, endY: 0.18, width: 1.8 },
    // Branch 5A: Descending Terminal Tip
    { startX: -0.19, startY: 0.18, ctrlX: -0.20, ctrlY: 0.23, endX: -0.22, endY: 0.28, width: 1.2 }
  ];

  // Draw Structural Filaments for Dendrites (13 structural filaments)
  ctx.save();
  for (let d = 0; d < dendritePaths.length; d++) {
    const branch = dendritePaths[d];
    const pStart = project(branch.startX, branch.startY);
    const pCtrl = project(branch.ctrlX, branch.ctrlY);
    const pEnd = project(branch.endX, branch.endY);

    ctx.strokeStyle = `hsla(${primaryHue}, 85%, 68%, ${masterAlpha * 0.45})`;
    ctx.lineWidth = Math.max(0.9, scale * 0.0012 * branch.width);
    ctx.beginPath();
    ctx.moveTo(pStart.x, pStart.y);
    ctx.quadraticCurveTo(pCtrl.x, pCtrl.y, pEnd.x, pEnd.y);
    ctx.stroke();
  }
  ctx.restore();

  // Volumetric Dendritic Cytoplasm Micro-Points along branches (650 micro-points)
  const totalDendriteCytoplasmPoints = 650;
  for (let i = 0; i < totalDendriteCytoplasmPoints; i++) {
    const bIdx = i % dendritePaths.length;
    const branch = dendritePaths[bIdx];
    const t = ((i * 7) % 100) / 100;
    // Quadratic bezier interpolation
    const invT = 1 - t;
    const bx = invT * invT * branch.startX + 2 * invT * t * branch.ctrlX + t * t * branch.endX;
    const by = invT * invT * branch.startY + 2 * invT * t * branch.ctrlY + t * t * branch.endY;

    // Organic cross-sectional scatter matching branch width
    const scatterAng = (i * 2.39996) % (Math.PI * 2);
    const scatterDist = ((i % 11) / 10) * 0.004 * branch.width;
    const px = centerX + (bx + Math.cos(scatterAng) * scatterDist) * scale;
    const py = centerY + (by + Math.sin(scatterAng) * scatterDist) * scale;

    // Graded dendritic potential wave traveling toward soma
    const dendriteWave = Math.sin(t * Math.PI * 4 - fireSpeed * 1.5 + bIdx) * 0.5 + 0.5;
    const ptAlpha = masterAlpha * (0.25 + 0.45 * dendriteWave);

    ctx.fillStyle = `hsla(${primaryHue}, 85%, 72%, ${ptAlpha})`;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.65, scale * 0.0014), 0, Math.PI * 2);
    ctx.fill();
  }

  // Visible Dendritic Spines: 48 spines distributed along secondary and tertiary branches
  // Each spine has a stem/neck and a swollen bulbous spine head (280 micro-points)
  const spineCount = 48;
  const eligibleBranches = [1, 2, 4, 5, 7, 9, 10, 12]; // Distal branches
  ctx.save();
  ctx.strokeStyle = `hsla(${primaryHue}, 80%, 75%, ${masterAlpha * 0.40})`;
  ctx.lineWidth = Math.max(0.7, scale * 0.0011);

  for (let s = 0; s < spineCount; s++) {
    const bIdx = eligibleBranches[s % eligibleBranches.length];
    const branch = dendritePaths[bIdx];
    const t = 0.15 + 0.75 * ((s * 13) % 29) / 28;

    const invT = 1 - t;
    const bx = invT * invT * branch.startX + 2 * invT * t * branch.ctrlX + t * t * branch.endX;
    const by = invT * invT * branch.startY + 2 * invT * t * branch.ctrlY + t * t * branch.endY;

    // Normal direction perpendicular to branch chord
    const dx = branch.endX - branch.startX;
    const dy = branch.endY - branch.startY;
    const chordLen = Math.hypot(dx, dy) || 1;
    const side = s % 2 === 0 ? 1 : -1;
    const normX = (-dy / chordLen) * side;
    const normY = (dx / chordLen) * side;

    const neckLen = (0.008 + ((s % 5) / 4) * 0.006) * scale;
    const stemBaseX = centerX + bx * scale;
    const stemBaseY = centerY + by * scale;
    const spineHeadX = stemBaseX + normX * neckLen;
    const spineHeadY = stemBaseY + normY * neckLen;

    // Draw spine neck filament
    ctx.beginPath();
    ctx.moveTo(stemBaseX, stemBaseY);
    ctx.lineTo(spineHeadX, spineHeadY);
    ctx.stroke();

    // Draw bulbous spine head and receptor micro-points (approx 5-6 points per spine head)
    const spineHeadRadius = Math.max(1.1, scale * 0.0028);
    const headAlpha = masterAlpha * (0.40 + 0.45 * Math.sin(fireSpeed * 1.2 + s));
    ctx.fillStyle = `hsla(${nucleusHue}, 90%, 82%, ${headAlpha})`;
    ctx.beginPath();
    ctx.arc(spineHeadX, spineHeadY, spineHeadRadius, 0, Math.PI * 2);
    ctx.fill();

    // Post-synaptic density micro-beads
    for (let bead = 0; bead < 5; bead++) {
      const bAng = bead * (Math.PI * 2 / 5);
      const bRad = spineHeadRadius * 0.7;
      const bX = spineHeadX + Math.cos(bAng) * bRad;
      const bY = spineHeadY + Math.sin(bAng) * bRad;
      ctx.fillStyle = `hsla(${isMulticolor ? 50 : primaryHue}, 100%, 85%, ${headAlpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(bX, bY, Math.max(0.5, scale * 0.0010), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // ---------------------------------------------------------------------------
  // 3. AXON HILLOCK (TRIGGER ZONE)
  // ---------------------------------------------------------------------------
  // Tapered transition from soma right margin (-0.05, -0.02) into initial segment (-0.01, 0.00)
  const hillockUpper = project(-0.055, -0.045);
  const hillockLower = project(-0.055, 0.015);
  const hillockApexUpper = project(-0.010, -0.012);
  const hillockApexLower = project(-0.010, 0.008);

  ctx.save();
  ctx.strokeStyle = `hsla(${primaryHue}, 90%, 75%, ${masterAlpha * 0.50})`;
  ctx.lineWidth = Math.max(1.3, scale * 0.0022);
  // Upper taper boundary
  ctx.beginPath();
  ctx.moveTo(hillockUpper.x, hillockUpper.y);
  ctx.lineTo(hillockApexUpper.x, hillockApexUpper.y);
  ctx.stroke();
  // Lower taper boundary
  ctx.beginPath();
  ctx.moveTo(hillockLower.x, hillockLower.y);
  ctx.lineTo(hillockApexLower.x, hillockApexLower.y);
  ctx.stroke();
  ctx.restore();

  // Voltage-Gated Sodium Channel Cluster Micro-Points at Hillock (180 micro-points)
  // Flashes brilliantly when cyclePhase reaches action potential initiation threshold (~0.25 to 0.35)
  const isInitiatingSpike = cyclePhase >= 0.22 && cyclePhase <= 0.38;
  const hillockFlash = isInitiatingSpike
    ? Math.sin(((cyclePhase - 0.22) / 0.16) * Math.PI)
    : 0;

  const hillockPointCount = 180;
  for (let i = 0; i < hillockPointCount; i++) {
    const t = (i % 20) / 19;
    const hx = -0.055 + t * 0.045;
    // Tapering envelope
    const halfWidth = (1 - t) * 0.030 + t * 0.010;
    const yOff = (((i * 7) % 19) / 18 - 0.5) * 2 * halfWidth;
    const hy = -0.015 + yOff;

    const hp = project(hx, hy);
    const baseAlpha = masterAlpha * (0.30 + 0.35 * Math.sin(fireSpeed * 2 + i * 0.4));
    const finalAlpha = Math.min(1.0, baseAlpha + hillockFlash * 0.65);
    const ptHue = hillockFlash > 0.4 ? spikeHue : primaryHue;

    ctx.fillStyle = `hsla(${ptHue}, 95%, ${hillockFlash > 0.4 ? '88%' : '72%'}, ${finalAlpha})`;
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, Math.max(0.65, scale * (hillockFlash > 0.4 ? 0.0019 : 0.0013)), 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // 4. ELONGATED MYELINATED AXON & NODES OF RANVIER (SALTATORY CONDUCTION)
  // ---------------------------------------------------------------------------
  // Dominant axon path extending from x = -0.01 to x = 0.28
  const axonStartX = -0.01;
  const axonEndX = 0.28;
  const getAxonY = (normX: number) => {
    // Gentle organic sinusoidal curvature
    const t = (normX - axonStartX) / (axonEndX - axonStartX);
    return -0.002 + Math.sin(t * Math.PI * 1.8) * 0.014;
  };

  // Central Bare Axon Core Filament (Structural Filament)
  ctx.save();
  ctx.strokeStyle = `hsla(${primaryHue}, 80%, 70%, ${masterAlpha * 0.38})`;
  ctx.lineWidth = Math.max(1.0, scale * 0.0016);
  ctx.beginPath();
  const axonStepCount = 40;
  for (let s = 0; s <= axonStepCount; s++) {
    const ax = axonStartX + (s / axonStepCount) * (axonEndX - axonStartX);
    const ay = getAxonY(ax);
    const pt = project(ax, ay);
    if (s === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  ctx.restore();

  // 4 Segmented Myelin Sheaths with Nodes of Ranvier Gaps between them
  interface MyelinSegment {
    startX: number;
    endX: number;
    centerX: number;
    sheathHeight: number;
    hasNucleus: boolean;
    nucSide: number;
  }

  const myelinSegments: MyelinSegment[] = [
    // Sheath 1 (Internode 1)
    { startX: 0.010, endX: 0.070, centerX: 0.040, sheathHeight: 0.024, hasNucleus: true, nucSide: -1 },
    // Sheath 2 (Internode 2)
    { startX: 0.085, endX: 0.145, centerX: 0.115, sheathHeight: 0.023, hasNucleus: true, nucSide: 1 },
    // Sheath 3 (Internode 3)
    { startX: 0.160, endX: 0.215, centerX: 0.187, sheathHeight: 0.022, hasNucleus: true, nucSide: -1 },
    // Sheath 4 (Internode 4)
    { startX: 0.230, endX: 0.280, centerX: 0.255, sheathHeight: 0.021, hasNucleus: true, nucSide: 1 }
  ];

  // Visible Nodes of Ranvier Gaps (Uninsulated gaps where bare axolemma is exposed)
  // Gap 1: between Sheath 1 & 2 at x ≈ 0.0775
  // Gap 2: between Sheath 2 & 3 at x ≈ 0.1525
  // Gap 3: between Sheath 3 & 4 at x ≈ 0.2225
  const nodesOfRanvierX = [0.0775, 0.1525, 0.2225, 0.288];

  // A. Render 4 Myelin Sheaths (Outer Lamellae wraps, Schwann nuclei, and Volumetric lipid micro-points)
  const pointsPerSheath = 188; // 4 * 188 = 752 points
  for (let m = 0; m < myelinSegments.length; m++) {
    const seg = myelinSegments[m];
    const segMidY = getAxonY(seg.centerX);
    const segWidth = seg.endX - seg.startX;
    const segScreenW = segWidth * scale;
    const segScreenH = seg.sheathHeight * scale;

    // Concentric Myelin Sheath Lamellar Wraps (Structural Filaments for each sheath)
    ctx.save();
    ctx.strokeStyle = `hsla(${myelinHue}, 85%, 65%, ${masterAlpha * 0.42})`;
    ctx.lineWidth = Math.max(0.9, scale * 0.0013);

    // Draw cylindrical outer boundary of myelin sheath
    const pTopLeft = project(seg.startX, getAxonY(seg.startX) - seg.sheathHeight * 0.5);
    const pTopRight = project(seg.endX, getAxonY(seg.endX) - seg.sheathHeight * 0.5);
    const pBotRight = project(seg.endX, getAxonY(seg.endX) + seg.sheathHeight * 0.5);
    const pBotLeft = project(seg.startX, getAxonY(seg.startX) + seg.sheathHeight * 0.5);

    ctx.beginPath();
    ctx.moveTo(pTopLeft.x, pTopLeft.y);
    ctx.lineTo(pTopRight.x, pTopRight.y);
    ctx.lineTo(pBotRight.x, pBotRight.y);
    ctx.lineTo(pBotLeft.x, pBotLeft.y);
    ctx.lineTo(pTopLeft.x, pTopLeft.y);
    ctx.stroke();

    // Inner compact myelin lamella line
    const pInTopL = project(seg.startX + segWidth * 0.08, getAxonY(seg.startX) - seg.sheathHeight * 0.25);
    const pInTopR = project(seg.endX - segWidth * 0.08, getAxonY(seg.endX) - seg.sheathHeight * 0.25);
    const pInBotR = project(seg.endX - segWidth * 0.08, getAxonY(seg.endX) + seg.sheathHeight * 0.25);
    const pInBotL = project(seg.startX + segWidth * 0.08, getAxonY(seg.startX) + seg.sheathHeight * 0.25);
    ctx.beginPath();
    ctx.moveTo(pInTopL.x, pInTopL.y);
    ctx.lineTo(pInTopR.x, pInTopR.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pInBotL.x, pInBotL.y);
    ctx.lineTo(pInBotR.x, pInBotR.y);
    ctx.stroke();
    ctx.restore();

    // Schwann cell / Oligodendrocyte nucleus bulge
    if (seg.hasNucleus) {
      const nucNormY = segMidY + seg.nucSide * (seg.sheathHeight * 0.55);
      const nucPt = project(seg.centerX, nucNormY);
      ctx.fillStyle = `hsla(${nucleusHue}, 90%, 82%, ${masterAlpha * 0.65})`;
      ctx.beginPath();
      ctx.arc(nucPt.x, nucPt.y, Math.max(1.4, scale * 0.0035), 0, Math.PI * 2);
      ctx.fill();
    }

    // Volumetric Multilamellar Lipid Points within the Sheath
    for (let pt = 0; pt < pointsPerSheath; pt++) {
      const fracX = (pt % 25) / 24;
      const xNorm = seg.startX + fracX * segWidth;
      const yBase = getAxonY(xNorm);

      const lamellaLayer = Math.floor(pt / 25) / (pointsPerSheath / 25);
      const yOffset = (lamellaLayer - 0.5) * seg.sheathHeight * 0.92;
      const p = project(xNorm, yBase + yOffset);

      const ptAlpha = masterAlpha * (0.22 + 0.32 * Math.sin(fireSpeed + m * 0.7 + fracX * 3.5));
      ctx.fillStyle = `hsla(${myelinHue}, 80%, 72%, ${ptAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.65, scale * 0.0013), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // B. Render Nodes of Ranvier Gaps (Saltatory Conduction Flash Points: 180 micro-points)
  // The action potential jumps across nodes: Node 0 (phase 0.35), Node 1 (phase 0.45), Node 2 (phase 0.55), Node 3 (phase 0.65)
  const nodePhases = [0.35, 0.45, 0.55, 0.65];
  const pointsPerNode = 45; // 4 * 45 = 180 points

  for (let n = 0; n < nodesOfRanvierX.length; n++) {
    const nodeX = nodesOfRanvierX[n];
    const nodeY = getAxonY(nodeX);
    const nodePt = project(nodeX, nodeY);
    const nPhase = nodePhases[n];

    // Saltatory pulse calculation
    const phaseDiff = Math.abs(cyclePhase - nPhase);
    const isNodeActive = phaseDiff < 0.08;
    const nodeIntensity = isNodeActive ? Math.cos((phaseDiff / 0.08) * (Math.PI / 2)) : 0;

    // Node bare axolemma constriction gap marker
    ctx.save();
    ctx.strokeStyle = `hsla(${primaryHue}, 95%, 85%, ${masterAlpha * (0.45 + nodeIntensity * 0.5)})`;
    ctx.lineWidth = Math.max(1.2, scale * 0.002);
    ctx.beginPath();
    ctx.moveTo(nodePt.x, nodePt.y - 0.007 * scale);
    ctx.lineTo(nodePt.x, nodePt.y + 0.007 * scale);
    ctx.stroke();
    ctx.restore();

    // Ion channel rings and saltatory flash beads
    for (let p = 0; p < pointsPerNode; p++) {
      const ringAng = (p / pointsPerNode) * Math.PI * 2;
      const ringR = (0.005 + ((p % 5) / 4) * 0.008) * scale;
      const px = nodePt.x + Math.cos(ringAng) * ringR * (nodeIntensity > 0 ? 1.5 : 1.0);
      const py = nodePt.y + Math.sin(ringAng) * ringR;

      const ptAlpha = masterAlpha * (0.28 + nodeIntensity * 0.65);
      const ptHue = nodeIntensity > 0.3 ? spikeHue : primaryHue;
      ctx.fillStyle = `hsla(${ptHue}, 100%, ${nodeIntensity > 0.3 ? '90%' : '75%'}, ${ptAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.65, scale * (nodeIntensity > 0.3 ? 0.0020 : 0.0013)), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // 5. AXON TERMINALS (TELODENDRIA) & TERMINAL BOUTONS (SYNAPTIC KNOBS)
  // ---------------------------------------------------------------------------
  // The distal axon splays out into telodendria branches ending in swollen terminal boutons
  interface BoutonTerminal {
    forkX: number;
    forkY: number;
    endX: number;
    endY: number;
    boutonRadius: number;
  }

  const terminals: BoutonTerminal[] = [
    // Bouton 1: Upper Apex Terminal
    { forkX: 0.31, forkY: -0.03, endX: 0.38, endY: -0.10, boutonRadius: 0.014 },
    // Bouton 2: Upper Mid Terminal
    { forkX: 0.32, forkY: -0.01, endX: 0.41, endY: -0.05, boutonRadius: 0.015 },
    // Bouton 3: Central Terminal
    { forkX: 0.33, forkY: 0.005, endX: 0.43, endY: 0.00, boutonRadius: 0.016 },
    // Bouton 4: Lower Mid Terminal
    { forkX: 0.32, forkY: 0.03, endX: 0.42, endY: 0.07, boutonRadius: 0.015 },
    // Bouton 5: Lower Apex Terminal
    { forkX: 0.31, forkY: 0.06, endX: 0.38, endY: 0.13, boutonRadius: 0.014 },
    // Bouton 6: Collateral Recurrent Fork
    { forkX: 0.30, forkY: -0.01, endX: 0.35, endY: -0.02, boutonRadius: 0.012 }
  ];

  // Draw Structural Filaments for Terminal Branches (Telodendria: 6 filaments)
  const preTerminalRoot = project(0.288, getAxonY(0.288));
  ctx.save();
  ctx.strokeStyle = `hsla(${primaryHue}, 85%, 70%, ${masterAlpha * 0.45})`;
  ctx.lineWidth = Math.max(0.9, scale * 0.0015);

  for (let t = 0; t < terminals.length; t++) {
    const term = terminals[t];
    const pFork = project(term.forkX, term.forkY);
    const pEnd = project(term.endX, term.endY);

    ctx.beginPath();
    ctx.moveTo(preTerminalRoot.x, preTerminalRoot.y);
    ctx.lineTo(pFork.x, pFork.y);
    ctx.lineTo(pEnd.x, pEnd.y);
    ctx.stroke();
  }
  ctx.restore();

  // Arrival of saltatory spike at boutons (phase ~0.70 to 0.88)
  const isBoutonActive = cyclePhase >= 0.70 && cyclePhase <= 0.88;
  const boutonExcitation = isBoutonActive
    ? Math.sin(((cyclePhase - 0.70) / 0.18) * Math.PI)
    : 0;

  // Render 6 Distinct Terminal Boutons (Swollen Synaptic Knobs with Vesicle Clouds: 450 micro-points)
  const pointsPerBouton = 75; // 6 * 75 = 450 points
  for (let b = 0; b < terminals.length; b++) {
    const term = terminals[b];
    const bPt = project(term.endX, term.endY);
    const bRad = term.boutonRadius * scale;

    // Bouton Synaptic Bulb Outer Envelope Glow
    const bulbGrad = ctx.createRadialGradient(bPt.x, bPt.y, 0, bPt.x, bPt.y, bRad * 1.5);
    const bulbAlpha = masterAlpha * (0.35 + boutonExcitation * 0.55);
    bulbGrad.addColorStop(0, `hsla(${boutonHue}, 95%, 90%, ${bulbAlpha})`);
    bulbGrad.addColorStop(0.4, `hsla(${primaryHue}, 90%, 75%, ${bulbAlpha * 0.5})`);
    bulbGrad.addColorStop(1, `hsla(${primaryHue}, 80%, 50%, 0)`);

    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(bPt.x, bPt.y, bRad * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Synaptic Vesicle Micro-Points inside the Bouton
    for (let v = 0; v < pointsPerBouton; v++) {
      const vAng = (v * 2.39996) % (Math.PI * 2);
      const vDist = Math.sqrt((v + 1) / pointsPerBouton) * bRad * 0.95;
      const vx = bPt.x + Math.cos(vAng) * vDist;
      const vy = bPt.y + Math.sin(vAng) * vDist;

      const vAlpha = masterAlpha * (0.28 + 0.35 * Math.sin(fireSpeed * 1.5 + b + v * 0.4) + boutonExcitation * 0.35);
      const vHue = boutonExcitation > 0.4 ? spikeHue : primaryHue;

      ctx.fillStyle = `hsla(${vHue}, 90%, ${boutonExcitation > 0.4 ? '88%' : '75%'}, ${vAlpha})`;
      ctx.beginPath();
      ctx.arc(vx, vy, Math.max(0.65, scale * 0.0014), 0, Math.PI * 2);
      ctx.fill();
    }

    // Pre-Synaptic Active Zone Release Face (Opposing distal side)
    const releaseNormAng = Math.atan2(term.endY - term.forkY, term.endX - term.forkX);
    const faceX = bPt.x + Math.cos(releaseNormAng) * bRad * 0.9;
    const faceY = bPt.y + Math.sin(releaseNormAng) * bRad * 0.9;
    ctx.save();
    ctx.strokeStyle = `hsla(${spikeHue}, 100%, 88%, ${masterAlpha * (0.45 + boutonExcitation * 0.5)})`;
    ctx.lineWidth = Math.max(1.0, scale * 0.0018);
    ctx.beginPath();
    ctx.arc(faceX, faceY, Math.max(1.5, scale * 0.003), releaseNormAng - Math.PI * 0.4, releaseNormAng + Math.PI * 0.4);
    ctx.stroke();
    ctx.restore();
  }
}
