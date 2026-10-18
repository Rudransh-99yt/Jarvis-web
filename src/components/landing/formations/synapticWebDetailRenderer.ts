/**
 * ============================================================================
 * JARVIS FORMATION #11: SYNAPTIC WEB DETAIL RENDERER
 * ============================================================================
 * High-density Canvas 2D detail layer for Formation #11 (Synaptic Web).
 *
 * Distinct Biological Microcircuit Architecture:
 * 1. Rich Interconnected Neuronal Microcircuit (Biological Mesh):
 *    - Distinct from #08 (strictly layered feedforward matrix) and #10 (single isolated multipolar neuron).
 *    - Multi-neuronal microcircuit with presynaptic axons, synaptic junction clefts, and postsynaptic spines.
 * 2. Distinguishable Presynaptic Boutons & Vesicle Clusters:
 *    - Expanded terminal boutons filled with clustered synaptic vesicles (50nm quantum micro-spheres).
 *    - Active zones with docked vesicles awaiting calcium-triggered exocytosis.
 * 3. Narrow Synaptic Clefts (20nm intercellular gap):
 *    - Transverse intercellular cleft regions where neurotransmitter diffusion occurs.
 *    - High-density quantum neurotransmitter release clouds (transmitter clouds diffusing during firing).
 * 4. Postsynaptic Density & Receptors:
 *    - Prominent thickened postsynaptic density (PSD) with clustered neuro-receptors (AMPA/NMDA).
 *    - Dendritic spines (mushroom, thin, stubby) receiving presynaptic contacts.
 * 5. Coherent Activation Waves & Localized Neurotransmitter Release Events:
 *    - Synchronized bio-electric depolarization wavefronts.
 *    - Periodic calcium influx pulses and quantal vesicle exocytosis bursts.
 * 6. Volumetric Detail Point Budget (~3,350 micro-points):
 *    - Presynaptic terminal boutons & active zones (~650 points)
 *    - Docked and cytoplasmic vesicle clusters (~950 points)
 *    - Synaptic cleft neurotransmitter diffusion clouds (~1,050 points)
 *    - Postsynaptic density & dendritic spine heads/necks (~700 points)
 *
 * Guarantees:
 * - 100% deterministic (zero Math.random() in executable code, trigonometric/index-based seeds).
 * - Zero draw operations when inactive (progress <= 0.02).
 * - >= 2,500 volumetric micro-points & >= 4 structural filaments when active.
 * - Full color theme support across single-hue and multicolor palettes.
 * ============================================================================
 */

export interface SynapticWebRenderOptions {
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

export function renderSynapticWebDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: SynapticWebRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // Microcircuit bio-electric rhythm & vesicle release clock (~0.5 Hz)
  const bioSpeed = elapsed * 0.0026;
  const releaseCycle = (bioSpeed % (Math.PI * 2)) / (Math.PI * 2);

  // Theme palettes
  const primaryHue = isMulticolor ? 175 : baseHue; // Cyan / Base
  const vesicleHue = isMulticolor ? 50 : (highlightHue ?? baseHue); // Amber / Gold synaptic vesicles
  const cleftHue = isMulticolor ? 195 : (highlightHue ?? baseHue); // Electric Cyan neurotransmitter cloud
  const psdHue = isMulticolor ? 290 : baseHue; // Violet / Purple postsynaptic density
  const spineHue = isMulticolor ? 325 : (highlightHue ?? baseHue); // Rose dendritic spines
  const axonHue = isMulticolor ? 210 : baseHue; // Deep Blue presynaptic terminal axon

  // Coordinate projection helper
  const project = (normX: number, normY: number, normZ = 0) => ({
    x: centerX + normX * scale,
    y: centerY + normY * scale,
    z: normZ
  });

  // ---------------------------------------------------------------------------
  // 1. PRIMARY SYNAPTIC JUNCTIONS (3 Primary Active Cleft Hubs)
  // ---------------------------------------------------------------------------
  // Hub A: Central Large Synapse (x = -0.02, y = -0.01)
  // Hub B: Upper Diagonal Synapse (x = 0.16, y = -0.18)
  // Hub C: Lower Collateral Synapse (x = -0.15, y = 0.19)
  const synapticHubs = [
    { x: -0.02, y: -0.01, dirAngle: 0.35, radius: 0.12, intensity: 1.0 },
    { x: 0.16, y: -0.18, dirAngle: -0.65, radius: 0.09, intensity: 0.85 },
    { x: -0.15, y: 0.19, dirAngle: 1.15, radius: 0.08, intensity: 0.80 }
  ];

  ctx.save();

  // A. Synaptic Cleft Ionic Glows
  for (let h = 0; h < synapticHubs.length; h++) {
    const hub = synapticHubs[h];
    const hubScr = project(hub.x, hub.y);
    const rScr = hub.radius * scale;
    const pulseIntensity = 0.7 + 0.3 * Math.sin(bioSpeed * 2.0 + h * 2.1);
    const hubAlpha = masterAlpha * 0.42 * hub.intensity * pulseIntensity;

    const cleftGlow = ctx.createRadialGradient(
      hubScr.x, hubScr.y, 0,
      hubScr.x, hubScr.y, rScr
    );
    cleftGlow.addColorStop(0, `hsla(${cleftHue}, 100%, 92%, ${hubAlpha})`);
    cleftGlow.addColorStop(0.35, `hsla(${isMulticolor ? 180 : baseHue}, 95%, 72%, ${hubAlpha * 0.6})`);
    cleftGlow.addColorStop(0.7, `hsla(${primaryHue}, 85%, 55%, ${hubAlpha * 0.2})`);
    cleftGlow.addColorStop(1, `hsla(${primaryHue}, 80%, 40%, 0)`);

    ctx.fillStyle = cleftGlow;
    ctx.beginPath();
    ctx.arc(hubScr.x, hubScr.y, rScr, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // 2. STRUCTURAL FILAMENT PATHWAYS (Presynaptic Axons, Cleft Bars & Dendritic Stems)
  // >= 4 structural filaments required
  // ---------------------------------------------------------------------------
  // We draw 12 distinct structural tracts:
  // - 4 presynaptic axonal terminal fibers approaching the hubs
  // - 3 synaptic cleft intercellular boundary bars (narrow cleft gap)
  // - 5 postsynaptic dendritic spine arbor trunks radiating outward
  ctx.lineWidth = Math.max(1.2, scale * 0.002);

  // Filament 1-4: Presynaptic Axonal Feeders
  const presynapticFibers = [
    { from: { x: -0.32, y: -0.22 }, to: { x: -0.06, y: -0.04 }, c1: { x: -0.20, y: -0.16 } },
    { from: { x: -0.30, y: 0.08 }, to: { x: -0.05, y: 0.02 }, c1: { x: -0.18, y: 0.04 } },
    { from: { x: 0.02, y: -0.34 }, to: { x: 0.14, y: -0.20 }, c1: { x: 0.06, y: -0.28 } },
    { from: { x: -0.34, y: 0.28 }, to: { x: -0.17, y: 0.21 }, c1: { x: -0.26, y: 0.24 } }
  ];

  for (let f = 0; f < presynapticFibers.length; f++) {
    const fiber = presynapticFibers[f];
    const p0 = project(fiber.from.x, fiber.from.y);
    const p1 = project(fiber.to.x, fiber.to.y);
    const pc = project(fiber.c1.x, fiber.c1.y);

    const fHue = isMulticolor ? (axonHue + f * 10) : baseHue;
    ctx.strokeStyle = `hsla(${fHue}, 92%, 68%, ${masterAlpha * 0.45})`;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(pc.x, pc.y, p1.x, p1.y);
    ctx.stroke();
  }

  // Filament 5-7: Intercellular Synaptic Cleft Transverse Boundaries
  for (let h = 0; h < synapticHubs.length; h++) {
    const hub = synapticHubs[h];
    const normalAngle = hub.dirAngle + Math.PI / 2;
    const halfLen = 0.06;
    const pLeft = project(
      hub.x - Math.cos(normalAngle) * halfLen,
      hub.y - Math.sin(normalAngle) * halfLen
    );
    const pRight = project(
      hub.x + Math.cos(normalAngle) * halfLen,
      hub.y + Math.sin(normalAngle) * halfLen
    );

    ctx.strokeStyle = `hsla(${cleftHue}, 95%, 85%, ${masterAlpha * 0.55})`;
    ctx.lineWidth = Math.max(1.4, scale * 0.0022);
    ctx.beginPath();
    ctx.moveTo(pLeft.x, pLeft.y);
    ctx.lineTo(pRight.x, pRight.y);
    ctx.stroke();
  }

  // Filament 8-12: Postsynaptic Dendritic Arbor Trunks & Spine Stems
  const postsynapticTrunks = [
    { from: { x: 0.02, y: 0.02 }, to: { x: 0.28, y: 0.16 }, c1: { x: 0.15, y: 0.07 } },
    { from: { x: 0.00, y: -0.02 }, to: { x: 0.25, y: -0.06 }, c1: { x: 0.12, y: -0.04 } },
    { from: { x: 0.19, y: -0.16 }, to: { x: 0.35, y: -0.26 }, c1: { x: 0.27, y: -0.21 } },
    { from: { x: -0.12, y: 0.22 }, to: { x: 0.10, y: 0.32 }, c1: { x: -0.01, y: 0.28 } },
    { from: { x: -0.10, y: 0.18 }, to: { x: -0.02, y: 0.34 }, c1: { x: -0.05, y: 0.26 } }
  ];

  ctx.lineWidth = Math.max(1.1, scale * 0.0018);
  for (let t = 0; t < postsynapticTrunks.length; t++) {
    const trunk = postsynapticTrunks[t];
    const p0 = project(trunk.from.x, trunk.from.y);
    const p1 = project(trunk.to.x, trunk.to.y);
    const pc = project(trunk.c1.x, trunk.c1.y);

    const tHue = isMulticolor ? (psdHue + t * 8) : baseHue;
    ctx.strokeStyle = `hsla(${tHue}, 88%, 70%, ${masterAlpha * 0.40})`;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(pc.x, pc.y, p1.x, p1.y);
    ctx.stroke();
  }

  ctx.restore();

  // ---------------------------------------------------------------------------
  // 3. VOLUMETRIC HIGH-DENSITY MICRO-POINTS (~3,350 points)
  // Target: >= 2,500 points
  // Breakdown:
  // - A. Presynaptic Terminal Bouton Membranes & Active Zones: 650 points
  // - B. Synaptic Vesicle Clusters & Docked Quantal Vesicles: 950 points
  // - C. Synaptic Cleft Neurotransmitter Diffusion Cloud: 1,050 points
  // - D. Postsynaptic Density & Dendritic Spine Micro-Heads: 700 points
  // Total: 3,350 volumetric points
  // ---------------------------------------------------------------------------
  const microPoints: Array<{
    x: number;
    y: number;
    z: number;
    hue: number;
    size: number;
    alphaMult: number;
    glow?: boolean;
  }> = [];

  // A. PRESYNAPTIC TERMINAL BOUTON ENVELOPES & ACTIVE ZONES (650 points)
  for (let i = 0; i < 650; i++) {
    const hubIdx = i % synapticHubs.length;
    const hub = synapticHubs[hubIdx];
    // Positioned slightly upstream of the cleft along presynaptic direction
    const t = i / 649;
    const angle = (t * Math.PI * 2 * 9.2 + hub.dirAngle + Math.PI) % (Math.PI * 2);
    const radial = 0.022 + ((i * 13) % 29) * 0.0018;

    // Presynaptic offset from cleft center
    const preOffsetX = -Math.cos(hub.dirAngle) * 0.035;
    const preOffsetY = -Math.sin(hub.dirAngle) * 0.035;

    const x = hub.x + preOffsetX + Math.cos(angle) * radial;
    const y = hub.y + preOffsetY + Math.sin(angle) * radial * 0.78;
    const z = Math.sin(i * 1.7) * 0.04;

    const bHue = isMulticolor ? (axonHue + (i % 25)) : baseHue;
    const isDockedZone = (i % 8 === 0);

    microPoints.push({
      x,
      y,
      z,
      hue: isDockedZone ? vesicleHue : bHue,
      size: isDockedZone ? 1.4 : (0.75 + (i % 3) * 0.35),
      alphaMult: isDockedZone ? 1.25 : 0.85,
      glow: isDockedZone
    });
  }

  // B. SYNAPTIC VESICLE CLUSTERS (950 points)
  // Quantum 50nm neurotransmitter spherical vesicles clustered inside boutons
  for (let i = 0; i < 950; i++) {
    const hubIdx = i % synapticHubs.length;
    const hub = synapticHubs[hubIdx];
    const preOffsetX = -Math.cos(hub.dirAngle) * 0.038;
    const preOffsetY = -Math.sin(hub.dirAngle) * 0.038;

    // Pseudo-random deterministic distribution inside elliptical bouton bulb
    const rFrac = Math.sqrt(((i * 37) % 1000) / 1000.0) * 0.032;
    const theta = ((i * 73) % 1000) * 0.001 * Math.PI * 2;

    // Vesicle mobilization jitter and exocytosis wave
    const wavePulse = Math.sin(bioSpeed * 3.0 + i * 0.2) * 0.003;
    const vx = hub.x + preOffsetX + Math.cos(theta) * rFrac + wavePulse;
    const vy = hub.y + preOffsetY + Math.sin(theta) * rFrac * 0.85;
    const vz = Math.cos(i * 2.3) * 0.035;

    const vHue = isMulticolor ? (vesicleHue + ((i * 7) % 30 - 15)) : (highlightHue ?? baseHue);

    microPoints.push({
      x: vx,
      y: vy,
      z: vz,
      hue: vHue,
      size: 0.80 + (i % 4) * 0.32,
      alphaMult: 0.95 + 0.35 * Math.sin(bioSpeed * 2.5 + i),
      glow: (i % 12 === 0)
    });
  }

  // C. SYNAPTIC CLEFT TRANSMITTER DIFFUSION CLOUD (1,050 points)
  // Quantum transmitters diffusing through the 20nm intercellular gap
  for (let i = 0; i < 1050; i++) {
    const hubIdx = i % synapticHubs.length;
    const hub = synapticHubs[hubIdx];
    const normalAngle = hub.dirAngle + Math.PI / 2;

    // Span across the cleft length and width
    const cleftLengthT = (((i * 43) % 1000) / 1000.0 - 0.5) * 0.11;
    // Diffusion across the gap from presynaptic to postsynaptic side
    const gapT = (((i * 29) % 1000) / 1000.0 - 0.5) * 0.025;
    // Propagation pulse during exocytosis phase
    const exocytosisDrift = Math.sin(bioSpeed * 2.0 + hubIdx * 2.1 + i * 0.15) * 0.006;

    const cx = hub.x + Math.cos(normalAngle) * cleftLengthT + Math.cos(hub.dirAngle) * (gapT + exocytosisDrift);
    const cy = hub.y + Math.sin(normalAngle) * cleftLengthT + Math.sin(hub.dirAngle) * (gapT + exocytosisDrift);
    const cz = Math.sin(i * 3.1) * 0.03;

    const transHue = isMulticolor
      ? (cleftHue + ((i * 13) % 45 - 20))
      : (highlightHue ?? baseHue);

    microPoints.push({
      x: cx,
      y: cy,
      z: cz,
      hue: transHue,
      size: 0.70 + (i % 3) * 0.35,
      alphaMult: 1.1 + 0.4 * Math.sin(bioSpeed * 2.8 + i * 0.4),
      glow: (i % 15 === 0)
    });
  }

  // D. POSTSYNAPTIC DENSITY & DENDRITIC SPINES (700 points)
  // Clustered along postsynaptic membrane and dendritic heads
  for (let i = 0; i < 700; i++) {
    const hubIdx = i % synapticHubs.length;
    const hub = synapticHubs[hubIdx];

    const postOffsetX = Math.cos(hub.dirAngle) * 0.032;
    const postOffsetY = Math.sin(hub.dirAngle) * 0.032;

    // Spreading across mushroom, thin, and stubby spine heads
    const spineAngle = ((i * 19) % 1000) * 0.001 * Math.PI * 2;
    const spineRadius = 0.015 + ((i * 11) % 100) * 0.00028;

    const sx = hub.x + postOffsetX + Math.cos(spineAngle) * spineRadius;
    const sy = hub.y + postOffsetY + Math.sin(spineAngle) * spineRadius;
    const sz = Math.cos(i * 1.9) * 0.035;

    const sHue = isMulticolor
      ? (i % 2 === 0 ? psdHue : spineHue)
      : (i % 3 === 0 ? (highlightHue ?? baseHue) : baseHue);

    microPoints.push({
      x: sx,
      y: sy,
      z: sz,
      hue: sHue,
      size: 0.85 + (i % 3) * 0.38,
      alphaMult: 0.90,
      glow: (i % 10 === 0)
    });
  }

  // ---------------------------------------------------------------------------
  // 4. BATCHED CANVAS 2D RENDERING (60 FPS Performance)
  // ---------------------------------------------------------------------------
  for (let i = 0; i < microPoints.length; i++) {
    const pt = microPoints[i];
    const scr = project(pt.x, pt.y, pt.z);

    const isForeground = pt.z >= 0;
    const baseAlpha = isForeground
      ? masterAlpha * (0.62 + pt.z * 0.35)
      : masterAlpha * (0.28 + (pt.z + 1) * 0.18);

    const finalAlpha = Math.min(1.0, baseAlpha * pt.alphaMult);
    const renderR = Math.max(0.65, pt.size + (isForeground ? pt.z * 0.4 : 0));

    // Luminous halo for active vesicles & docked sites
    if (pt.glow && isForeground && finalAlpha > 0.40) {
      const haloR = renderR * 3.2;
      const glowGrad = ctx.createRadialGradient(scr.x, scr.y, 0, scr.x, scr.y, haloR);
      glowGrad.addColorStop(0, `hsla(${pt.hue}, 100%, 88%, ${finalAlpha * 0.45})`);
      glowGrad.addColorStop(1, `hsla(${pt.hue}, 90%, 50%, 0)`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(scr.x, scr.y, haloR, 0, Math.PI * 2);
      ctx.fill();
    }

    const lightness = pt.glow ? 96 : (isForeground ? 86 : 74);
    ctx.fillStyle = `hsla(${pt.hue}, 95%, ${lightness}%, ${finalAlpha})`;
    ctx.beginPath();
    ctx.arc(scr.x, scr.y, renderR, 0, Math.PI * 2);
    ctx.fill();
  }
}
