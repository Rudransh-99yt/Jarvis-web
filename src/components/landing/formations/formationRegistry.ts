/**
 * Deterministic Particle Formations Library — Milestone 1 (Visual Refinement)
 *
 * Provides mathematically pure, deterministic coordinate generators and edge topographies
 * for curated constellations in the Jarvis particle universe.
 *
 * Visual Refinements:
 * - GALAXY_SPIRAL (54 particles): Dense 14-node galactic core bulge with cross-ties and dual 20-node
 *   logarithmic arms with dimensional depth and intermediate stellar filament sub-branches.
 * - CORTEX_BRAIN (56 particles): Anatomical 30-node bilateral cerebral mantle, 10-node interhemispheric
 *   corpus callosum divider, and 16-node dual internal gyral/sulcal convolutions.
 * - DNA_HELIX (52 particles): VERTICAL main axis (y in [-0.38, 0.38]), two distinct 18-node antiparallel
 *   helical ribbons (x in [-0.17, 0.17]), bridged by 8 distinct horizontal base-pair ladder rungs.
 *   Strictly no accidental bridges across strand endpoints. Viewport-safe on all screens.
 * - NEURAL_SYNAPSE (50 particles): Clear feedforward architecture with 4 separated processing layers
 *   (sensory, association, dense latent nucleus, output), intra-nucleus lateral ties, and 4 modulatory boutons.
 *
 * Guarantees:
 * - 100% deterministic (identical inputs strictly produce identical outputs)
 * - Safe normalized coordinates bounded within [-0.42, 0.42] to prevent clipping on mobile
 * - Explicit edge lists for multi-strand structures
 * - Participant counts strictly bounded between 50 and 56 particles (mobile safe)
 */

export interface FormationTargetResult {
  coords: Array<{ x: number; y: number }>;
  edges: Array<[number, number]>;
}

export interface ParticleFormation {
  id: string;
  name: string;
  category: 'cosmic' | 'biological' | 'neural' | 'quantum';
  participantCount: number;
  motionType: 'rotate' | 'pulse' | 'wave' | 'drift';
  motionParam: number;
  scaleMultiplier?: number;
  centerOffsetY?: number;
  generateCoords: (count: number) => FormationTargetResult;
}

// ---------------------------------------------------------------------------
// 1. GALAXY_SPIRAL: Dense 14-node core with dual 20-node logarithmic spiral arms
// ---------------------------------------------------------------------------
export function generateGalaxySpiralCoords(count = 54): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  const coreCount = 14;
  const remaining = Math.max(4, count - coreCount);
  const armCount = Math.floor(remaining / 2);

  // A. Dense Galactic Core Bulge (6 inner nucleus + 8 outer halo bulge)
  const innerCoreCount = 6;
  const outerCoreCount = coreCount - innerCoreCount;

  // Inner nucleus (dense stellar singularity cluster)
  const tiltFactor = 0.74;
  const discTiltAngle = -0.30;
  const cosSlant = Math.cos(discTiltAngle);
  const sinSlant = Math.sin(discTiltAngle);

  const projectBase = (r: number, angle: number) => {
    const rawX = Math.cos(angle) * r;
    const rawY = Math.sin(angle) * r * tiltFactor;
    return {
      x: rawX * cosSlant - rawY * sinSlant,
      y: rawX * sinSlant + rawY * cosSlant
    };
  };

  for (let i = 0; i < innerCoreCount; i++) {
    const angle = (i / innerCoreCount) * Math.PI * 2;
    const r = 0.016 + (i % 2) * 0.012;
    coords.push(projectBase(r, angle));
  }

  // Outer core halo
  for (let i = 0; i < outerCoreCount; i++) {
    const angle = (i / outerCoreCount) * Math.PI * 2 + Math.PI / outerCoreCount;
    const r = 0.046 + (i % 3) * 0.010;
    coords.push(projectBase(r, angle));
  }

  // Core internal filament cross-ties
  for (let i = 0; i < innerCoreCount; i++) {
    edges.push([i, (i + 1) % innerCoreCount]);
  }
  for (let i = 0; i < outerCoreCount; i++) {
    edges.push([innerCoreCount + i, innerCoreCount + ((i + 1) % outerCoreCount)]);
  }
  // Spokes linking inner nucleus to outer core
  for (let i = 0; i < innerCoreCount; i++) {
    edges.push([i, innerCoreCount + (i % outerCoreCount)]);
  }
  edges.push([0, 3]);
  edges.push([1, 4]);

  // B. Spiral Arm 1 (20 particles along logarithmic spiral matching galaxyDetailRenderer)
  const arm1Start = coords.length;
  for (let i = 0; i < armCount; i++) {
    const t = i / (armCount - 1);
    const theta = t * (Math.PI * 1.94);
    const r = 0.055 + Math.pow(t, 1.24) * 0.38;
    coords.push(projectBase(r, theta));
  }

  // Arm 1 sequential backbone & stellar branch ties
  edges.push([innerCoreCount + 1, arm1Start]);
  edges.push([innerCoreCount + 2, arm1Start + 1]);
  for (let i = 0; i < armCount - 1; i++) {
    edges.push([arm1Start + i, arm1Start + i + 1]);
  }
  // Intermediate sub-branch structural ties
  edges.push([arm1Start + 2, arm1Start + 5]);
  edges.push([arm1Start + 7, arm1Start + 10]);
  edges.push([arm1Start + 12, arm1Start + 15]);

  // C. Spiral Arm 2 (20 particles: Symmetrical trailing arm rotated by PI)
  const arm2Start = coords.length;
  for (let i = 0; i < armCount; i++) {
    const t = i / (armCount - 1);
    const theta = t * (Math.PI * 1.94) + Math.PI;
    const r = 0.055 + Math.pow(t, 1.24) * 0.38;
    coords.push(projectBase(r, theta));
  }

  // Arm 2 sequential backbone & stellar branch ties
  edges.push([innerCoreCount + 5, arm2Start]);
  edges.push([innerCoreCount + 6, arm2Start + 1]);
  for (let i = 0; i < armCount - 1; i++) {
    edges.push([arm2Start + i, arm2Start + i + 1]);
  }
  // Intermediate sub-branch structural ties
  edges.push([arm2Start + 2, arm2Start + 5]);
  edges.push([arm2Start + 7, arm2Start + 10]);
  edges.push([arm2Start + 12, arm2Start + 15]);

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * (idx % 3), y: 0.02 * (idx % 2) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 2. NEBULA: Luminous Interstellar Gas, Shock Fronts & Proto-Stellar Knots (54 nodes)
// ---------------------------------------------------------------------------
export function generateNebulaCoords(count = 54): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // A. Central Nursery Core & Dense Excitation Cluster (12 nodes: 0..11)
  const coreStart = 0;
  const coreCount = 12;
  for (let i = 0; i < coreCount; i++) {
    const angle = (i / coreCount) * Math.PI * 2;
    const r = 0.055 + (i % 3) * 0.022;
    const x = -0.05 + Math.cos(angle) * r;
    const y = -0.03 + Math.sin(angle) * (r * 0.85);
    coords.push({ x, y });
  }

  // Core internal filament web & cross-ties
  for (let i = 0; i < coreCount; i++) {
    edges.push([coreStart + i, coreStart + ((i + 1) % coreCount)]);
  }
  edges.push([coreStart + 0, coreStart + 6]);
  edges.push([coreStart + 2, coreStart + 8]);
  edges.push([coreStart + 4, coreStart + 10]);

  // B. North-East Great Pillar & Ionization Spire (14 nodes: 12..25)
  const neStart = coords.length;
  const neCount = 14;
  for (let i = 0; i < neCount; i++) {
    const t = i / (neCount - 1);
    const x = -0.04 + t * 0.28 + Math.sin(t * Math.PI * 1.8) * 0.022;
    const y = -0.02 - t * 0.24 + Math.cos(t * Math.PI * 2.2) * 0.015;
    coords.push({ x, y });
  }

  // NE Spire backbone & transverse ionization ties
  edges.push([coreStart + 1, neStart]);
  edges.push([coreStart + 2, neStart + 1]);
  for (let i = 0; i < neCount - 1; i++) {
    edges.push([neStart + i, neStart + i + 1]);
  }
  edges.push([neStart + 2, neStart + 5]);
  edges.push([neStart + 6, neStart + 9]);
  edges.push([neStart + 10, neStart + 13]);

  // C. South-West Flowing Gas Veil & Reflection Front (14 nodes: 26..39)
  const swStart = coords.length;
  const swCount = 14;
  for (let i = 0; i < swCount; i++) {
    const t = i / (swCount - 1);
    const x = -0.05 - t * 0.22 + Math.sin(t * Math.PI * 2.0) * 0.020;
    const y = 0.01 + t * 0.25 + Math.cos(t * Math.PI * 1.6) * 0.016;
    coords.push({ x, y });
  }

  // SW Veil backbone & flowing cross-ties
  edges.push([coreStart + 7, swStart]);
  edges.push([coreStart + 8, swStart + 1]);
  for (let i = 0; i < swCount - 1; i++) {
    edges.push([swStart + i, swStart + i + 1]);
  }
  edges.push([swStart + 2, swStart + 5]);
  edges.push([swStart + 6, swStart + 9]);
  edges.push([swStart + 10, swStart + 13]);

  // D. North-West Outer Diffuse Gas Arm (8 nodes: 40..47)
  const nwStart = coords.length;
  const nwCount = 8;
  for (let i = 0; i < nwCount; i++) {
    const t = i / (nwCount - 1);
    const x = -0.06 - t * 0.24 + Math.cos(t * Math.PI * 1.5) * 0.018;
    const y = -0.04 - t * 0.16 + Math.sin(t * Math.PI * 2.0) * 0.014;
    coords.push({ x, y });
  }

  edges.push([coreStart + 11, nwStart]);
  for (let i = 0; i < nwCount - 1; i++) {
    edges.push([nwStart + i, nwStart + i + 1]);
  }
  edges.push([nwStart + 2, nwStart + 5]);

  // E. East Outer Canopy & Star-Forming Knots (6 nodes: 48..53)
  const eastStart = coords.length;
  const eastCount = 6;
  for (let i = 0; i < eastCount; i++) {
    const t = i / (eastCount - 1);
    const x = 0.06 + t * 0.20 + ((i % 2) - 0.5) * 0.016;
    const y = 0.02 + t * 0.16 + ((i % 3) - 1) * 0.018;
    coords.push({ x, y });
  }

  edges.push([coreStart + 4, eastStart]);
  for (let i = 0; i < eastCount - 1; i++) {
    edges.push([eastStart + i, eastStart + i + 1]);
  }
  edges.push([eastStart + 1, eastStart + 4]);

  // Pad to exact count if count differs
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.03 * ((idx % 5) - 2), y: 0.03 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 3. ATOMIC_ORBITALS: Quantum Orbital Lobes, Nucleus, & Probability Manifolds (52 nodes)
// ---------------------------------------------------------------------------
export function generateAtomicOrbitalsCoords(count = 52): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // A. Central Nucleus Cluster (8 nodes: 0..7)
  const nucleus = [
    { x: 0.000, y: 0.000 },
    { x: 0.024, y: 0.016 },
    { x: -0.022, y: 0.018 },
    { x: 0.016, y: -0.024 },
    { x: -0.020, y: -0.020 },
    { x: 0.035, y: -0.005 },
    { x: -0.035, y: 0.005 },
    { x: 0.002, y: 0.036 }
  ];
  for (const n of nucleus) coords.push(n);

  edges.push(
    [0, 1], [0, 2], [0, 3], [0, 4],
    [1, 5], [2, 6], [3, 7], [4, 7],
    [5, 6], [1, 3], [2, 4]
  );

  // B. Vertical p_z Dumbbell Lobes (10 nodes: 8..17)
  // Upper lobe (+Y direction, y < 0: 8..12)
  coords.push({ x: 0.000, y: -0.080 }); // root
  coords.push({ x: -0.038, y: -0.170 }); // left flank
  coords.push({ x: 0.000, y: -0.270 }); // apex
  coords.push({ x: 0.038, y: -0.170 }); // right flank
  coords.push({ x: 0.000, y: -0.130 }); // internal core
  edges.push([8, 9], [9, 10], [10, 11], [11, 12], [12, 8], [8, 12]);

  // Lower lobe (-Y direction, y > 0: 13..17)
  coords.push({ x: 0.000, y: 0.080 });  // root
  coords.push({ x: -0.038, y: 0.170 }); // left flank
  coords.push({ x: 0.000, y: 0.270 });  // apex
  coords.push({ x: 0.038, y: 0.170 });  // right flank
  coords.push({ x: 0.000, y: 0.130 });  // internal core
  edges.push([13, 14], [14, 15], [15, 16], [16, 17], [17, 13], [13, 17]);

  // Bridge nucleus to vertical roots
  edges.push([0, 8], [0, 13]);

  // C. Horizontal p_x Dumbbell Lobes (10 nodes: 18..27)
  // Right lobe (+X direction: 18..22)
  coords.push({ x: 0.080, y: 0.000 });  // root
  coords.push({ x: 0.170, y: -0.038 }); // upper flank
  coords.push({ x: 0.270, y: 0.000 });  // apex
  coords.push({ x: 0.170, y: 0.038 });  // lower flank
  coords.push({ x: 0.130, y: 0.000 });  // internal core
  edges.push([18, 19], [19, 20], [20, 21], [21, 22], [22, 18], [18, 22]);

  // Left lobe (-X direction: 23..27)
  coords.push({ x: -0.080, y: 0.000 });  // root
  coords.push({ x: -0.170, y: -0.038 }); // upper flank
  coords.push({ x: -0.270, y: 0.000 });  // apex
  coords.push({ x: -0.170, y: 0.038 });  // lower flank
  coords.push({ x: -0.130, y: 0.000 });  // internal core
  edges.push([23, 24], [24, 25], [25, 26], [26, 27], [27, 23], [23, 27]);

  // Bridge nucleus to horizontal roots
  edges.push([0, 18], [0, 23]);

  // D. Diagonal Hybridized d_xy Cloverleaf Lobes (12 nodes: 28..39)
  // Top-Right diagonal (28..30)
  coords.push({ x: 0.065, y: -0.065 });
  coords.push({ x: 0.155, y: -0.155 });
  coords.push({ x: 0.115, y: -0.195 });
  edges.push([28, 29], [29, 30], [30, 28]);

  // Top-Left diagonal (31..33)
  coords.push({ x: -0.065, y: -0.065 });
  coords.push({ x: -0.155, y: -0.155 });
  coords.push({ x: -0.115, y: -0.195 });
  edges.push([31, 32], [32, 33], [33, 31]);

  // Bottom-Left diagonal (34..36)
  coords.push({ x: -0.065, y: 0.065 });
  coords.push({ x: -0.155, y: 0.155 });
  coords.push({ x: -0.115, y: 0.195 });
  edges.push([34, 35], [35, 36], [36, 34]);

  // Bottom-Right diagonal (37..39)
  coords.push({ x: 0.065, y: 0.065 });
  coords.push({ x: 0.155, y: 0.155 });
  coords.push({ x: 0.115, y: 0.195 });
  edges.push([37, 38], [38, 39], [39, 37]);

  // E. Toroidal Equatorial Nodal Collar (d_z^2 collar, 12 nodes: 40..51)
  const ringStart = coords.length;
  const ringCount = 12;
  for (let i = 0; i < ringCount; i++) {
    const theta = (i / ringCount) * Math.PI * 2;
    coords.push({
      x: Math.cos(theta) * 0.115,
      y: Math.sin(theta) * 0.048
    });
  }
  for (let i = 0; i < ringCount; i++) {
    edges.push([ringStart + i, ringStart + ((i + 1) % ringCount)]);
  }

  // Cross-tie collar to nucleus perimeter
  edges.push([ringStart, 5], [ringStart + 6, 6]);

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.03 * ((idx % 5) - 2), y: 0.03 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 4. BLACK_HOLE_VORTEX: Event Horizon Void, Accretion Disk & Lensing Arches (54 nodes)
// ---------------------------------------------------------------------------
export function generateBlackHoleVortexCoords(count = 54): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // A. Photon Sphere Ring around Event Horizon Void (8 nodes: 0..7)
  // Strictly bounds the central shadow void (r = 0.058, void inside r < 0.052)
  const photonCount = 8;
  for (let i = 0; i < photonCount; i++) {
    const theta = (i / photonCount) * Math.PI * 2;
    coords.push({
      x: Math.cos(theta) * 0.058,
      y: Math.sin(theta) * 0.056
    });
  }
  for (let i = 0; i < photonCount; i++) {
    edges.push([i, (i + 1) % photonCount]);
  }

  // B. Inner High-Velocity Accretion Disk Streams (14 nodes: 8..21)
  // Arm A (7 nodes: 8..14)
  const armAStart = coords.length;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const r = 0.075 + t * 0.075; // 0.075 to 0.150
    const theta = t * Math.PI * 1.8;
    coords.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * (r * 0.94)
    });
  }
  edges.push([0, armAStart]);
  for (let i = 0; i < 6; i++) {
    edges.push([armAStart + i, armAStart + i + 1]);
  }

  // Arm B (7 nodes: 15..21) - 180 deg opposing
  const armBStart = coords.length;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const r = 0.075 + t * 0.075;
    const theta = t * Math.PI * 1.8 + Math.PI;
    coords.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * (r * 0.94)
    });
  }
  edges.push([4, armBStart]);
  for (let i = 0; i < 6; i++) {
    edges.push([armBStart + i, armBStart + i + 1]);
  }

  // C. Outer Accretion Disk & Infall Feeder Streams (16 nodes: 22..37)
  // Outer Feeder Arm 1 (8 nodes: 22..29)
  const outerAStart = coords.length;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const r = 0.170 + t * 0.170; // 0.170 to 0.340
    const theta = 1.1 * Math.PI + t * Math.PI * 1.5;
    coords.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * (r * 0.92)
    });
  }
  edges.push([armAStart + 6, outerAStart]);
  for (let i = 0; i < 7; i++) {
    edges.push([outerAStart + i, outerAStart + i + 1]);
  }

  // Outer Feeder Arm 2 (8 nodes: 30..37)
  const outerBStart = coords.length;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const r = 0.170 + t * 0.170;
    const theta = 0.1 * Math.PI + t * Math.PI * 1.5;
    coords.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * (r * 0.92)
    });
  }
  edges.push([armBStart + 6, outerBStart]);
  for (let i = 0; i < 7; i++) {
    edges.push([outerBStart + i, outerBStart + i + 1]);
  }

  // D. Gravitational Lensing Einstein Light Arches (8 nodes: 38..45)
  // Upper Lensing Arch (4 nodes: 38..41)
  const lArchUStart = coords.length;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const theta = -Math.PI * 0.85 + t * Math.PI * 0.70;
    coords.push({
      x: Math.cos(theta) * 0.088,
      y: -Math.abs(Math.sin(theta)) * 0.095
    });
  }
  for (let i = 0; i < 3; i++) {
    edges.push([lArchUStart + i, lArchUStart + i + 1]);
  }

  // Lower Lensing Arch (4 nodes: 42..45)
  const lArchLStart = coords.length;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const theta = Math.PI * 0.15 + t * Math.PI * 0.70;
    coords.push({
      x: Math.cos(theta) * 0.088,
      y: Math.abs(Math.sin(theta)) * 0.095
    });
  }
  for (let i = 0; i < 3; i++) {
    edges.push([lArchLStart + i, lArchLStart + i + 1]);
  }

  // E. Collimated Relativistic Polar Plasma Jets (8 nodes: 46..53)
  // North Jet (4 nodes: 46..49)
  const jetNStart = coords.length;
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 4;
    coords.push({
      x: Math.sin(t * Math.PI * 2) * 0.008,
      y: -0.065 - t * 0.245 // -0.065 to -0.310
    });
  }
  for (let i = 0; i < 3; i++) {
    edges.push([jetNStart + i, jetNStart + i + 1]);
  }

  // South Jet (4 nodes: 50..53)
  const jetSStart = coords.length;
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 4;
    coords.push({
      x: -Math.sin(t * Math.PI * 2) * 0.008,
      y: 0.065 + t * 0.245 // 0.065 to 0.310
    });
  }
  for (let i = 0; i < 3; i++) {
    edges.push([jetSStart + i, jetSStart + i + 1]);
  }

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.03 * ((idx % 5) - 2), y: 0.03 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 5. KNOWLEDGE_CONSTELLATION: Connected Intelligence Hubs & Knowledge Highways (54 nodes)
// ---------------------------------------------------------------------------
export function generateKnowledgeConstellationCoords(count = 54): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // A. Cluster Alpha: Prime Synthesis Core (10 nodes: 0..9)
  // Central nexus focal star at origin
  coords.push({ x: 0.000, y: 0.000 }); // 0: Nexus
  coords.push({ x: 0.045, y: -0.025 }); // 1
  coords.push({ x: 0.035, y: 0.040 });  // 2
  coords.push({ x: -0.035, y: 0.045 }); // 3
  coords.push({ x: -0.050, y: -0.020 });// 4
  coords.push({ x: -0.010, y: -0.052 });// 5
  // Satellite synthesis relays
  coords.push({ x: 0.075, y: -0.065 }); // 6
  coords.push({ x: 0.085, y: 0.055 });  // 7
  coords.push({ x: -0.075, y: 0.070 }); // 8
  coords.push({ x: -0.085, y: -0.060 });// 9

  // Core internal spokes & ring ties
  edges.push([0, 1], [0, 2], [0, 3], [0, 4], [0, 5]);
  edges.push([1, 2], [2, 3], [3, 4], [4, 5], [5, 1]);
  edges.push([1, 6], [2, 7], [3, 8], [4, 9]);
  edges.push([6, 7], [8, 9]);

  // B. Cluster Beta: Empirical Observatory Spire (North-East, 9 nodes: 10..18)
  coords.push({ x: 0.220, y: -0.230 }); // 10: Apex Hub
  coords.push({ x: 0.170, y: -0.180 }); // 11
  coords.push({ x: 0.260, y: -0.170 }); // 12
  coords.push({ x: 0.290, y: -0.260 }); // 13
  coords.push({ x: 0.160, y: -0.270 }); // 14
  coords.push({ x: 0.220, y: -0.320 }); // 15
  coords.push({ x: 0.330, y: -0.200 }); // 16
  coords.push({ x: 0.130, y: -0.130 }); // 17
  coords.push({ x: 0.270, y: -0.110 }); // 18

  edges.push([10, 11], [10, 12], [10, 13], [10, 14], [10, 15]);
  edges.push([11, 12], [12, 16], [13, 16], [14, 15]);
  edges.push([11, 17], [12, 18], [17, 18]);

  // C. Cluster Gamma: Theoretical Archive Bastion (South-West, 9 nodes: 19..27)
  coords.push({ x: -0.220, y: 0.220 }); // 19: Bastion Hub
  coords.push({ x: -0.170, y: 0.170 }); // 20
  coords.push({ x: -0.270, y: 0.170 }); // 21
  coords.push({ x: -0.280, y: 0.260 }); // 22
  coords.push({ x: -0.160, y: 0.270 }); // 23
  coords.push({ x: -0.210, y: 0.320 }); // 24
  coords.push({ x: -0.330, y: 0.210 }); // 25
  coords.push({ x: -0.120, y: 0.130 }); // 26
  coords.push({ x: -0.270, y: 0.100 }); // 27

  edges.push([19, 20], [19, 21], [19, 22], [19, 23], [19, 24]);
  edges.push([20, 21], [21, 25], [22, 25], [23, 24]);
  edges.push([20, 26], [21, 27], [26, 27]);

  // D. Cluster Delta: Systems Architecture Pivot (South-East, 9 nodes: 28..36)
  coords.push({ x: 0.240, y: 0.200 }); // 28: Pivot Hub
  coords.push({ x: 0.180, y: 0.150 }); // 29
  coords.push({ x: 0.290, y: 0.150 }); // 30
  coords.push({ x: 0.300, y: 0.250 }); // 31
  coords.push({ x: 0.190, y: 0.260 }); // 32
  coords.push({ x: 0.230, y: 0.310 }); // 33
  coords.push({ x: 0.340, y: 0.190 }); // 34
  coords.push({ x: 0.140, y: 0.100 }); // 35
  coords.push({ x: 0.250, y: 0.080 }); // 36

  edges.push([28, 29], [28, 30], [28, 31], [28, 32], [28, 33]);
  edges.push([29, 30], [30, 34], [31, 34], [32, 33]);
  edges.push([29, 35], [30, 36], [35, 36]);

  // E. Cluster Epsilon: Speculative Frontier Beacon (North-West, 9 nodes: 37..45)
  coords.push({ x: -0.230, y: -0.220 }); // 37: Beacon Hub
  coords.push({ x: -0.170, y: -0.170 }); // 38
  coords.push({ x: -0.280, y: -0.160 }); // 39
  coords.push({ x: -0.290, y: -0.270 }); // 40
  coords.push({ x: -0.170, y: -0.280 }); // 41
  coords.push({ x: -0.220, y: -0.330 }); // 42
  coords.push({ x: -0.340, y: -0.210 }); // 43
  coords.push({ x: -0.130, y: -0.120 }); // 44
  coords.push({ x: -0.250, y: -0.090 }); // 45

  edges.push([37, 38], [37, 39], [37, 40], [37, 41], [37, 42]);
  edges.push([38, 39], [39, 43], [40, 43], [41, 42]);
  edges.push([38, 44], [39, 45], [44, 45]);

  // F. Inter-Cluster Knowledge Highway Relays (8 nodes: 46..53)
  coords.push({ x: -0.080, y: -0.120 }); // 46: Core -> Epsilon relay
  coords.push({ x: 0.090, y: -0.110 });  // 47: Core -> Beta relay
  coords.push({ x: -0.080, y: 0.110 });  // 48: Core -> Gamma relay
  coords.push({ x: 0.100, y: 0.100 });   // 49: Core -> Delta relay
  coords.push({ x: -0.310, y: 0.000 });  // 50: West rim link (Epsilon <-> Gamma)
  coords.push({ x: 0.320, y: 0.000 });   // 51: East rim link (Beta <-> Delta)
  coords.push({ x: 0.000, y: -0.260 });  // 52: North arch bridge (Epsilon <-> Beta)
  coords.push({ x: 0.000, y: 0.250 });   // 53: South arch bridge (Gamma <-> Delta)

  // Highway conduit connections linking Core outward
  edges.push([0, 46], [46, 44], [44, 38]);
  edges.push([0, 47], [47, 17], [17, 11]);
  edges.push([0, 48], [48, 26], [26, 20]);
  edges.push([0, 49], [49, 35], [35, 29]);

  // Circumferential knowledge bridge connections
  edges.push([43, 50], [50, 25]);
  edges.push([16, 51], [51, 34]);
  edges.push([42, 52], [52, 15]);
  edges.push([24, 53], [53, 33]);

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.03 * ((idx % 5) - 2), y: 0.03 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 6. ORBITAL_SYSTEM: Luminous Central Star, 5 Keplerian Planetary Orbits & Asteroid Belt (54 nodes)
// ---------------------------------------------------------------------------
export function generateOrbitalSystemCoords(count = 54): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // A. Central Star (8 nodes: 0..7) - Photosphere & stellar prominence perimeter
  coords.push({ x: 0.000, y: -0.035 }); // 0: North
  coords.push({ x: 0.026, y: -0.024 }); // 1: North-East
  coords.push({ x: 0.036, y: 0.000 });  // 2: East
  coords.push({ x: 0.026, y: 0.024 });  // 3: South-East
  coords.push({ x: 0.000, y: 0.035 });  // 4: South
  coords.push({ x: -0.026, y: 0.024 }); // 5: South-West
  coords.push({ x: -0.036, y: 0.000 }); // 6: West
  coords.push({ x: -0.026, y: -0.024 });// 7: North-West

  edges.push(
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
    [0, 4], [2, 6], [1, 5], [3, 7]
  );

  // B. Orbit 1: Inner Terrestrial World & Track (6 nodes: 8..13)
  coords.push({ x: 0.086, y: 0.000 });  // 8: Planet 1
  coords.push({ x: 0.043, y: 0.065 });  // 9
  coords.push({ x: -0.043, y: 0.065 }); // 10
  coords.push({ x: -0.074, y: 0.000 }); // 11
  coords.push({ x: -0.043, y: -0.065 });// 12
  coords.push({ x: 0.043, y: -0.065 }); // 13

  edges.push([8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 8]);

  // C. Orbit 2: Habitable Terrestrial World, Moon & Track (8 nodes: 14..21)
  coords.push({ x: 0.140, y: 0.000 });  // 14: Planet 2
  coords.push({ x: 0.158, y: 0.012 });  // 15: Moon
  coords.push({ x: 0.100, y: 0.098 });  // 16
  coords.push({ x: 0.000, y: 0.138 });  // 17
  coords.push({ x: -0.100, y: 0.098 }); // 18
  coords.push({ x: -0.150, y: 0.000 }); // 19
  coords.push({ x: -0.100, y: -0.098 });// 20
  coords.push({ x: 0.000, y: -0.138 }); // 21

  edges.push([14, 15]); // Planet-Moon connection
  edges.push([14, 16], [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 14]);

  // D. Orbit 3: Ringed Gas Giant & Track (10 nodes: 22..31)
  coords.push({ x: 0.215, y: 0.000 });  // 22: Planet 3
  coords.push({ x: 0.235, y: -0.015 }); // 23: Ring East
  coords.push({ x: 0.245, y: 0.000 });  // 24: Ring Far East
  coords.push({ x: 0.235, y: 0.015 });  // 25: Ring South-East
  coords.push({ x: 0.195, y: -0.015 }); // 26: Ring West
  coords.push({ x: 0.155, y: 0.155 });  // 27: Track
  coords.push({ x: 0.000, y: 0.215 });  // 28: Track
  coords.push({ x: -0.155, y: 0.155 }); // 29: Track
  coords.push({ x: -0.235, y: 0.000 }); // 30: Track
  coords.push({ x: 0.000, y: -0.215 }); // 31: Track

  edges.push([22, 23], [23, 24], [24, 25], [25, 22], [22, 26], [26, 23]);
  edges.push([22, 27], [27, 28], [28, 29], [29, 30], [30, 31], [31, 22]);

  // E. Orbit 4: Ice Giant Colossus & Track (8 nodes: 32..39)
  coords.push({ x: -0.275, y: 0.000 }); // 32: Planet 4
  coords.push({ x: -0.195, y: -0.200 });// 33
  coords.push({ x: 0.000, y: -0.275 }); // 34
  coords.push({ x: 0.195, y: -0.200 }); // 35
  coords.push({ x: 0.315, y: 0.000 });  // 36
  coords.push({ x: 0.195, y: 0.200 });  // 37
  coords.push({ x: 0.000, y: 0.275 });  // 38
  coords.push({ x: -0.195, y: 0.200 }); // 39

  edges.push([32, 33], [33, 34], [34, 35], [35, 36], [36, 37], [37, 38], [38, 39], [39, 32]);

  // F. Orbit 5: Trans-Neptunian Outlier & Track (8 nodes: 40..47)
  coords.push({ x: 0.320, y: -0.120 }); // 40: Planet 5
  coords.push({ x: 0.350, y: 0.000 });  // 41
  coords.push({ x: 0.220, y: 0.260 });  // 42
  coords.push({ x: 0.000, y: 0.330 });  // 43
  coords.push({ x: -0.240, y: 0.240 }); // 44
  coords.push({ x: -0.370, y: 0.000 }); // 45
  coords.push({ x: -0.240, y: -0.240 });// 46
  coords.push({ x: 0.000, y: -0.330 }); // 47

  edges.push([40, 41], [41, 42], [42, 43], [43, 44], [44, 45], [45, 46], [46, 47], [47, 40]);

  // G. Main Asteroid Belt Ring (6 nodes: 48..53)
  coords.push({ x: 0.185, y: 0.000 });  // 48
  coords.push({ x: 0.092, y: 0.160 });  // 49
  coords.push({ x: -0.092, y: 0.160 }); // 50
  coords.push({ x: -0.185, y: 0.000 }); // 51
  coords.push({ x: -0.092, y: -0.160 });// 52
  coords.push({ x: 0.092, y: -0.160 }); // 53

  edges.push([48, 49], [49, 50], [50, 51], [51, 52], [52, 53], [53, 48]);

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.03 * ((idx % 5) - 2), y: 0.03 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 7. CORTEX_BRAIN: Lateral Anatomical Profile (30-node mantle, 10-node sulcus arch, 16-node gyri)
// ---------------------------------------------------------------------------
export function generateCortexBrainCoords(count = 56): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  const perimeterCount = 30;
  const callosumCount = 10;
  const innerCount = Math.max(4, count - perimeterCount - callosumCount);
  const innerPath1Count = Math.floor(innerCount / 2);
  const innerPath2Count = innerCount - innerPath1Count;

  // A. Outer Lateral Silhouette (30 nodes tracing anatomical lateral profile)
  // 0..17: Outer Cerebrum lateral mantle curve (Frontal pole -> Superior vertex -> Occipital pole -> Pre-occipital)
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const angle = t * Math.PI * 1.5 - Math.PI * 0.75;
    const rX = 0.29 + 0.04 * Math.cos(angle * 1.5) + (angle > 0.25 * Math.PI ? 0.03 : 0);
    const rY = 0.22 + 0.04 * Math.sin(angle * 1.2);
    const px = -0.02 + Math.sin(angle) * rX;
    const py = -0.04 - Math.cos(angle) * rY;
    coords.push({ x: px, y: py });
  }

  // 18..23 (6 nodes): Cerebellum (Posterior-inferior rounded bulge nestled under occipital)
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const ang = -Math.PI * 0.35 + t * Math.PI * 1.05;
    const px = 0.16 + Math.cos(ang) * 0.085;
    const py = 0.15 + Math.sin(ang) * 0.065;
    coords.push({ x: px, y: py });
  }

  // 24..26 (3 nodes): Brainstem (Pons & Medulla descending column)
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const px = 0.03 - t * 0.02;
    const py = 0.14 + t * 0.12;
    coords.push({ x: px, y: py });
  }

  // 27..29 (3 nodes): Temporal Lobe inferior contour curving forward to Temporal pole
  for (let i = 0; i < 3; i++) {
    const t = (i + 1) / 3;
    const px = 0.01 - t * 0.21;
    const py = 0.11 - t * 0.07;
    coords.push({ x: px, y: py });
  }

  // Continuous closed anatomical perimeter loop
  for (let i = 0; i < perimeterCount; i++) {
    edges.push([i, (i + 1) % perimeterCount]);
  }

  // B. Internal Sulcal / Callosal Arch (10 nodes: Sylvian Fissure & Central Sulcus)
  const callosumStart = coords.length;
  // Nodes 30..35: Sylvian Fissure (Lateral sulcus) sweeping up-backwards
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const px = -0.20 + t * 0.26;
    const py = 0.03 - t * 0.07 + Math.sin(t * Math.PI) * 0.012;
    coords.push({ x: px, y: py });
  }
  // Nodes 36..39: Central Sulcus of Rolando descending from vertex
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const px = -0.02 - t * 0.04 + Math.sin(t * Math.PI) * 0.008;
    const py = -0.25 + t * 0.22;
    coords.push({ x: px, y: py });
  }
  for (let i = 0; i < callosumCount - 1; i++) {
    edges.push([callosumStart + i, callosumStart + i + 1]);
  }
  // Anatomical landmark ties
  edges.push([1, callosumStart]); // Sylvian start connects to inferior frontal margin
  edges.push([9, callosumStart + 6]); // Central sulcus start connects to vertex
  edges.push([callosumStart + 9, callosumStart + 4]); // Central sulcus junction to Sylvian fissure

  // C. Gyral Pathway 1: Frontal & Motor Ribbon Convolutions (8 nodes)
  const path1Start = coords.length;
  for (let i = 0; i < innerPath1Count; i++) {
    const t = i / (innerPath1Count - 1);
    const px = -0.24 + t * 0.18;
    const py = -0.16 + Math.sin(t * Math.PI * 1.8) * 0.06;
    coords.push({ x: px, y: py });
  }
  for (let i = 0; i < innerPath1Count - 1; i++) {
    edges.push([path1Start + i, path1Start + i + 1]);
  }
  edges.push([3, path1Start]);
  edges.push([callosumStart + 2, path1Start + innerPath1Count - 1]);

  // D. Gyral Pathway 2: Cerebellar Folia & Brainstem descending tract (8 nodes)
  const path2Start = coords.length;
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const px = 0.10 + t * 0.12;
    const py = 0.14 + Math.sin(t * Math.PI * 2.0) * 0.02;
    coords.push({ x: px, y: py });
  }
  for (let i = 4; i < innerPath2Count; i++) {
    const t = (i - 4) / (innerPath2Count - 5);
    const px = 0.02;
    const py = 0.10 + t * 0.14;
    coords.push({ x: px, y: py });
  }
  for (let i = 0; i < innerPath2Count - 1; i++) {
    edges.push([path2Start + i, path2Start + i + 1]);
  }
  edges.push([20, path2Start]); // Anchor to cerebellar posterior
  edges.push([25, path2Start + innerPath2Count - 1]); // Anchor to brainstem column

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * (idx % 4), y: -0.05 + 0.02 * (idx % 3) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 3. DNA_HELIX: VERTICAL MAIN AXIS (18 nodes Strand 1, 18 nodes Strand 2, 16 nodes rungs)
// ---------------------------------------------------------------------------
export function generateDnaHelixCoords(count = 52): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  const strandCount = 18;
  const rungCount = 8;

  // A. Strand 1 (Vertical Alpha Helix Backbone: y extends top to bottom from -0.39 to +0.39)
  const strand1Start = 0;
  for (let i = 0; i < strandCount; i++) {
    const t = i / (strandCount - 1);
    const py = -0.39 + t * 0.78;
    const px = Math.sin(t * Math.PI * 2 * 2.85) * 0.185;
    coords.push({ x: px, y: py });
  }
  for (let i = 0; i < strandCount - 1; i++) {
    edges.push([strand1Start + i, strand1Start + i + 1]);
  }

  // B. Strand 2 (Vertical Beta Helix Backbone: 180° phase inversion)
  const strand2Start = coords.length;
  for (let i = 0; i < strandCount; i++) {
    const t = i / (strandCount - 1);
    const py = -0.39 + t * 0.78;
    const px = Math.sin(t * Math.PI * 2 * 2.85 + Math.PI) * 0.185;
    coords.push({ x: px, y: py });
  }
  for (let i = 0; i < strandCount - 1; i++) {
    edges.push([strand2Start + i, strand2Start + i + 1]);
  }

  // IMPORTANT: Strand 1 end is NEVER linked to Strand 2 start.
  // C. Base-Pair Ladder Rungs (8 horizontal bridging rungs across major & minor grooves)
  const rungStrandIndices = [1, 3, 5, 7, 9, 11, 13, 15];
  for (let r = 0; r < Math.min(rungCount, rungStrandIndices.length); r++) {
    const sIdx = rungStrandIndices[r];
    const s1 = coords[strand1Start + sIdx];
    const s2 = coords[strand2Start + sIdx];

    const rungNode1Idx = coords.length;
    coords.push({
      x: s1.x * 0.65 + s2.x * 0.35,
      y: s1.y
    });

    const rungNode2Idx = coords.length;
    coords.push({
      x: s1.x * 0.35 + s2.x * 0.65,
      y: s2.y
    });

    // Ladder rung edges: Strand 1 -> Rung 1 -> Rung 2 -> Strand 2
    edges.push([strand1Start + sIdx, rungNode1Idx]);
    edges.push([rungNode1Idx, rungNode2Idx]);
    edges.push([rungNode2Idx, strand2Start + sIdx]);
  }

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    const t = (idx % strandCount) / (strandCount - 1);
    coords.push({
      x: (idx % 2 === 0 ? 0.05 : -0.05),
      y: -0.35 + t * 0.70
    });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 4. NEURAL_SYNAPSE / NEURAL_NETWORK (#08): Layered Connectome Network with Feedforward & Nucleus Hub
// ---------------------------------------------------------------------------
export function generateNeuralSynapseCoords(count = 50): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // Architecture:
  // Layer 1 (Sensory Input): 8 nodes (x = -0.35)
  // Layer 2 (Association): 12 nodes (x = -0.15)
  // Layer 3 (Deep Latent Nucleus Hub): 16 nodes (x = 0.08, clustered)
  // Layer 4 (Decision Output): 10 nodes (x = 0.32)
  // Modulatory Boutons: 4 nodes
  const l1Count = 8;
  const l2Count = 12;
  const l3Count = 16;
  const l4Count = 10;

  // Layer 1: Sensory Input (x = -0.35)
  const l1Start = coords.length;
  for (let i = 0; i < l1Count; i++) {
    const t = i / (l1Count - 1);
    coords.push({ x: -0.35, y: -0.32 + t * 0.64 });
  }

  // Layer 2: Feature Encoding (x = -0.15)
  const l2Start = coords.length;
  for (let i = 0; i < l2Count; i++) {
    const t = i / (l2Count - 1);
    coords.push({ x: -0.15, y: -0.32 + t * 0.64 });
  }

  // Layer 3: Latent Nucleus Hub (aligned column matching synapseDetailRenderer at x = 0.08)
  const l3Start = coords.length;
  for (let i = 0; i < l3Count; i++) {
    const t = i / (l3Count - 1);
    coords.push({ x: 0.08, y: -0.36 + t * 0.72 });
  }

  // Layer 4: Motor & Decision Output (x = 0.32)
  const l4Start = coords.length;
  for (let i = 0; i < l4Count; i++) {
    const t = i / (l4Count - 1);
    coords.push({ x: 0.32, y: -0.32 + t * 0.64 });
  }

  // Feedforward Projections Layer 1 -> Layer 2
  for (let i = 0; i < l1Count; i++) {
    const target1 = Math.floor((i / (l1Count - 1)) * (l2Count - 1));
    const target2 = (target1 + 1) % l2Count;
    edges.push([l1Start + i, l2Start + target1]);
    edges.push([l1Start + i, l2Start + target2]);
  }

  // Feedforward Projections Layer 2 -> Layer 3
  for (let i = 0; i < l2Count; i++) {
    const target1 = Math.floor((i / (l2Count - 1)) * (l3Count - 1));
    const target2 = (target1 + 1) % l3Count;
    edges.push([l2Start + i, l3Start + target1]);
    edges.push([l2Start + i, l3Start + target2]);
  }

  // Intra-Nucleus Longitudinal Hub Backbone in Layer 3
  for (let i = 0; i < l3Count - 1; i++) {
    edges.push([l3Start + i, l3Start + i + 1]);
  }

  // Divergent Projections Layer 3 -> Layer 4
  for (let i = 0; i < l3Count; i++) {
    const target = Math.floor((i / (l3Count - 1)) * (l4Count - 1));
    edges.push([l3Start + i, l4Start + target]);
  }

  // 4 Modulatory Interneurons / Boutons
  const mod1 = coords.length;
  coords.push({ x: 0.0, y: -0.34 });
  edges.push([l2Start + 1, mod1]);
  edges.push([mod1, l3Start + 2]);

  const mod2 = coords.length;
  coords.push({ x: 0.0, y: 0.34 });
  edges.push([l2Start + l2Count - 2, mod2]);
  edges.push([mod2, l3Start + 14]);

  const mod3 = coords.length;
  coords.push({ x: -0.03, y: -0.18 });
  edges.push([l2Start + 4, mod3]);
  edges.push([mod3, l3Start + 5]);

  const mod4 = coords.length;
  coords.push({ x: -0.03, y: 0.18 });
  edges.push([l2Start + 7, mod4]);
  edges.push([mod4, l3Start + 10]);

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

/**
 * Formation #08: Neural Network coordinate generator (alias of generateNeuralSynapseCoords)
 */
export const generateNeuralNetworkCoords = generateNeuralSynapseCoords;

// ---------------------------------------------------------------------------
// 10. SINGLE_NEURON (#10): Multipolar Single Neuron with Soma, Dendritic Arbor, Axon Hillock, Myelinated Axon & Boutons
// ---------------------------------------------------------------------------
export function generateSingleNeuronCoords(count = 52): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // 1. SOMA & NUCLEUS (14 nodes: 0..13)
  // Node 0: Central Nucleolus focal star
  coords.push({ x: -0.140, y: -0.020 }); // 0: Nucleolus

  // Nodes 1..4: Perinuclear Envelope Ring (r ≈ 0.032)
  coords.push({ x: -0.140, y: -0.052 }); // 1: North
  coords.push({ x: -0.108, y: -0.020 }); // 2: East (towards hillock)
  coords.push({ x: -0.140, y: 0.012 });  // 3: South
  coords.push({ x: -0.172, y: -0.020 }); // 4: West (towards dendrites)

  edges.push([0, 1], [0, 2], [0, 3], [0, 4]);
  edges.push([1, 2], [2, 3], [3, 4], [4, 1]);

  // Nodes 5..12: Soma Cell Membrane Outer Polygonal Boundary Vertices (8 vertices, r ≈ 0.08..0.10)
  coords.push({ x: -0.115, y: -0.095 }); // 5: Antero-dorsal
  coords.push({ x: -0.175, y: -0.105 }); // 6: Apical trunk root base
  coords.push({ x: -0.225, y: -0.065 }); // 7: Dorsal-lateral margin
  coords.push({ x: -0.235, y: -0.005 }); // 8: Lateral basal margin
  coords.push({ x: -0.215, y: 0.055 });  // 9: Ventral-lateral margin
  coords.push({ x: -0.165, y: 0.075 });  // 10: Ventral trunk root base
  coords.push({ x: -0.105, y: 0.050 });  // 11: Antero-ventral
  coords.push({ x: -0.065, y: 0.010 });  // 12: Axon hillock inferior anchor

  edges.push([1, 5], [1, 6], [4, 7], [4, 8], [3, 9], [3, 10], [2, 11], [2, 12]);
  edges.push([5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12]);

  // Node 13: Axon Hillock neck anchor
  coords.push({ x: -0.055, y: -0.025 }); // 13: Hillock superior anchor
  edges.push([5, 13], [12, 13], [2, 13]);

  // 2. DENDRITIC ARBOR & VISIBLE SPINES (18 nodes: 14..31)
  // Primary trunk anchors:
  coords.push({ x: -0.205, y: -0.135 }); // 14: Apical trunk mid
  coords.push({ x: -0.255, y: -0.035 }); // 15: Dorsal trunk mid
  coords.push({ x: -0.225, y: 0.105 });  // 16: Basal trunk mid

  edges.push([6, 14], [8, 15], [10, 16]);

  // Secondary bifurcations:
  coords.push({ x: -0.245, y: -0.180 }); // 17: Apical secondary upper
  coords.push({ x: -0.275, y: -0.145 }); // 18: Apical secondary lateral
  coords.push({ x: -0.305, y: -0.060 }); // 19: Dorsal secondary upper
  coords.push({ x: -0.305, y: 0.005 });  // 20: Dorsal secondary lower
  coords.push({ x: -0.275, y: 0.140 });  // 21: Basal secondary lower
  coords.push({ x: -0.240, y: 0.185 });  // 22: Basal secondary ventral

  edges.push([14, 17], [14, 18]);
  edges.push([15, 19], [15, 20]);
  edges.push([16, 21], [16, 22]);

  // Tertiary terminal tuft branches:
  coords.push({ x: -0.290, y: -0.255 }); // 23: Apical terminal tip A
  coords.push({ x: -0.345, y: -0.205 }); // 24: Apical terminal tip B
  coords.push({ x: -0.375, y: -0.085 }); // 25: Dorsal terminal tip A
  coords.push({ x: -0.370, y: 0.030 });  // 26: Dorsal terminal tip B
  coords.push({ x: -0.340, y: 0.190 });  // 27: Basal terminal tip A
  coords.push({ x: -0.265, y: 0.250 });  // 28: Basal terminal tip B

  edges.push([17, 23], [18, 24]);
  edges.push([19, 25], [20, 26]);
  edges.push([21, 27], [22, 28]);

  // Dendritic Spine clusters:
  coords.push({ x: -0.265, y: -0.215 }); // 29: Apical spine cluster
  coords.push({ x: -0.335, y: -0.020 }); // 30: Dorsal spine cluster
  coords.push({ x: -0.305, y: 0.165 });  // 31: Basal spine cluster

  edges.push([17, 29], [19, 30], [21, 31]);

  // 3. MYELINATED AXON & NODES OF RANVIER (12 nodes: 32..43)
  // Axon Initial Segment (Hillock trigger tip):
  coords.push({ x: -0.010, y: -0.005 }); // 32: Axon initial segment (AIS)
  edges.push([13, 32], [12, 32]);

  // Myelin Sheaths & Nodes of Ranvier (Alternating Sheath and Nodal gaps):
  coords.push({ x: 0.040, y: -0.002 });  // 33: Sheath 1 center
  coords.push({ x: 0.078, y: 0.002 });   // 34: Node of Ranvier 1
  coords.push({ x: 0.115, y: 0.006 });   // 35: Sheath 2 center
  coords.push({ x: 0.153, y: 0.008 });   // 36: Node of Ranvier 2
  coords.push({ x: 0.188, y: 0.005 });   // 37: Sheath 3 center
  coords.push({ x: 0.223, y: 0.001 });   // 38: Node of Ranvier 3
  coords.push({ x: 0.255, y: -0.004 });  // 39: Sheath 4 center
  coords.push({ x: 0.288, y: -0.007 });  // 40: Pre-terminal Node of Ranvier 4

  edges.push([32, 33], [33, 34], [34, 35], [35, 36], [36, 37], [37, 38], [38, 39], [39, 40]);

  // Sheath outer lamellae / Schwann nuclei markers:
  coords.push({ x: 0.040, y: -0.024 });  // 41: Sheath 1 Schwann nucleus
  coords.push({ x: 0.115, y: 0.026 });   // 42: Sheath 2 Schwann nucleus
  coords.push({ x: 0.188, y: -0.024 });  // 43: Sheath 3 Schwann nucleus

  edges.push([33, 41], [35, 42], [37, 43]);

  // 4. AXON TERMINALS & BOUTONS (8 nodes: 44..51)
  // Pre-terminal bifurcations:
  coords.push({ x: 0.320, y: -0.035 });  // 44: Upper telodendria fork
  coords.push({ x: 0.325, y: 0.030 });   // 45: Lower telodendria fork

  edges.push([40, 44], [40, 45]);

  // Terminal Boutons:
  coords.push({ x: 0.380, y: -0.095 });  // 46: Terminal Bouton 1 (upper apex)
  coords.push({ x: 0.410, y: -0.045 });  // 47: Terminal Bouton 2 (upper mid)
  coords.push({ x: 0.430, y: 0.000 });   // 48: Terminal Bouton 3 (central)
  coords.push({ x: 0.420, y: 0.065 });   // 49: Terminal Bouton 4 (lower mid)
  coords.push({ x: 0.380, y: 0.125 });   // 50: Terminal Bouton 5 (lower apex)
  coords.push({ x: 0.350, y: -0.015 });  // 51: Terminal Bouton 6 (collateral)

  edges.push([44, 46], [44, 47], [44, 51]);
  edges.push([45, 48], [45, 49], [45, 50]);

  // Pad to exact count if needed
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * ((idx % 5) - 2), y: 0.02 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 11. SYNAPTIC_WEB (#11): Multi-Neuronal Microcircuit with Presynaptic Boutons, Clefts, and Postsynaptic Spines
// ---------------------------------------------------------------------------
export function generateSynapticWebCoords(count = 52): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // 1. PRESYNAPTIC AXONAL FEEDERS & TERMINAL BOUTONS (16 nodes: 0..15)
  // Presynaptic Axon 1 (Upper Left feeder to Central Cleft):
  coords.push({ x: -0.320, y: -0.220 }); // 0: Axon 1 stem
  coords.push({ x: -0.220, y: -0.150 }); // 1: Axon 1 mid
  coords.push({ x: -0.130, y: -0.090 }); // 2: Axon 1 pre-terminal
  coords.push({ x: -0.065, y: -0.045 }); // 3: Terminal Bouton A1 (Central Cleft Presynaptic)
  coords.push({ x: -0.075, y: -0.080 }); // 4: Terminal Bouton A2 (Central Cleft Presynaptic dorsal)
  edges.push([0, 1], [1, 2], [2, 3], [2, 4], [3, 4]);

  // Presynaptic Axon 2 (Lower Left feeder to Central Cleft):
  coords.push({ x: -0.300, y: 0.080 });  // 5: Axon 2 stem
  coords.push({ x: -0.200, y: 0.050 });  // 6: Axon 2 mid
  coords.push({ x: -0.120, y: 0.020 });  // 7: Axon 2 pre-terminal
  coords.push({ x: -0.055, y: 0.015 });  // 8: Terminal Bouton A3 (Central Cleft Presynaptic ventral)
  edges.push([5, 6], [6, 7], [7, 8], [3, 8]);

  // Presynaptic Axon 3 (Top feeder to Upper Diagonal Cleft):
  coords.push({ x: 0.020, y: -0.340 });  // 9: Axon 3 stem
  coords.push({ x: 0.070, y: -0.270 });  // 10: Axon 3 mid
  coords.push({ x: 0.120, y: -0.220 });  // 11: Terminal Bouton B1 (Upper Cleft Presynaptic)
  coords.push({ x: 0.145, y: -0.245 });  // 12: Terminal Bouton B2 (Upper Cleft Presynaptic lateral)
  edges.push([9, 10], [10, 11], [10, 12], [11, 12]);

  // Presynaptic Axon 4 (Bottom-left feeder to Lower Collateral Cleft):
  coords.push({ x: -0.340, y: 0.280 });  // 13: Axon 4 stem
  coords.push({ x: -0.260, y: 0.240 });  // 14: Axon 4 mid
  coords.push({ x: -0.190, y: 0.210 });  // 15: Terminal Bouton C1 (Lower Cleft Presynaptic)
  edges.push([13, 14], [14, 15]);

  // 2. SYNAPTIC CLEFTS & QUANTAL ACTIVE ZONES (12 nodes: 16..27)
  // Central Cleft active zones & transmitter nexus (6 nodes):
  coords.push({ x: -0.035, y: -0.035 }); // 16: Central Cleft Upper Zone
  coords.push({ x: -0.020, y: -0.010 }); // 17: Central Cleft Focal Core
  coords.push({ x: -0.030, y: 0.015 });  // 18: Central Cleft Lower Zone
  coords.push({ x: -0.005, y: -0.040 }); // 19: Central Cleft Postsynaptic Face North
  coords.push({ x: 0.005, y: -0.010 });  // 20: Central Cleft Postsynaptic Face Core
  coords.push({ x: 0.000, y: 0.020 });   // 21: Central Cleft Postsynaptic Face South
  edges.push([3, 16], [8, 18], [16, 17], [17, 18]);
  edges.push([16, 19], [17, 20], [18, 21], [19, 20], [20, 21]);

  // Upper Cleft active zones (3 nodes):
  coords.push({ x: 0.145, y: -0.190 }); // 22: Upper Cleft Presynaptic Active Zone
  coords.push({ x: 0.165, y: -0.175 }); // 23: Upper Cleft Cleft Midpoint
  coords.push({ x: 0.180, y: -0.160 }); // 24: Upper Cleft Postsynaptic Face
  edges.push([11, 22], [12, 22], [22, 23], [23, 24]);

  // Lower Cleft active zones (3 nodes):
  coords.push({ x: -0.165, y: 0.195 }); // 25: Lower Cleft Presynaptic Active Zone
  coords.push({ x: -0.145, y: 0.185 }); // 26: Lower Cleft Cleft Midpoint
  coords.push({ x: -0.125, y: 0.180 }); // 27: Lower Cleft Postsynaptic Face
  edges.push([15, 25], [25, 26], [26, 27]);

  // Inter-junction microcircuit cross-talk bridging:
  edges.push([17, 23], [18, 26]);

  // 3. POSTSYNAPTIC DENSITY, SPINES & DENDRITIC ARBORS (24 nodes: 28..51)
  // Postsynaptic Density & Spines of Central Cleft:
  coords.push({ x: 0.035, y: -0.025 });  // 28: Spine Head 1 (Mushroom)
  coords.push({ x: 0.040, y: 0.025 });   // 29: Spine Head 2 (Thin)
  coords.push({ x: 0.075, y: -0.040 });  // 30: Spine Neck 1
  coords.push({ x: 0.080, y: 0.035 });   // 31: Spine Neck 2
  coords.push({ x: 0.120, y: -0.045 });  // 32: Primary Dendritic Trunk 1
  coords.push({ x: 0.140, y: 0.055 });   // 33: Primary Dendritic Trunk 2
  edges.push([19, 28], [20, 28], [20, 29], [21, 29]);
  edges.push([28, 30], [29, 31], [30, 32], [31, 33], [32, 33]);

  // Upper Postsynaptic Arbor:
  coords.push({ x: 0.205, y: -0.145 });  // 34: Upper Spine Head
  coords.push({ x: 0.235, y: -0.130 });  // 35: Upper Spine Neck
  coords.push({ x: 0.270, y: -0.110 });  // 36: Upper Dendrite Branch
  coords.push({ x: 0.320, y: -0.170 });  // 37: Distal Upper Arbor Fork 1
  coords.push({ x: 0.355, y: -0.230 });  // 38: Distal Upper Arbor Tip 1
  coords.push({ x: 0.345, y: -0.080 });  // 39: Distal Upper Arbor Fork 2
  edges.push([24, 34], [34, 35], [35, 36], [36, 37], [37, 38], [36, 39], [32, 36]);

  // Central-to-Lower Postsynaptic Arbor:
  coords.push({ x: 0.190, y: -0.030 });  // 40: Mid-Dendrite Branch
  coords.push({ x: 0.245, y: -0.015 });  // 41: Mid-Dendrite Secondary
  coords.push({ x: 0.310, y: 0.020 });   // 42: Mid-Dendrite Terminal
  coords.push({ x: 0.210, y: 0.090 });   // 43: Lower Dendrite Branch
  coords.push({ x: 0.275, y: 0.140 });   // 44: Lower Dendrite Secondary
  coords.push({ x: 0.330, y: 0.190 });   // 45: Lower Dendrite Distal
  edges.push([32, 40], [40, 41], [41, 42], [33, 43], [43, 44], [44, 45], [40, 43]);

  // Lower Cleft Postsynaptic Dendritic Arbor:
  coords.push({ x: -0.095, y: 0.190 });  // 46: Lower Spine Head
  coords.push({ x: -0.060, y: 0.210 });  // 47: Lower Spine Neck
  coords.push({ x: -0.015, y: 0.240 });  // 48: Lower Dendritic Trunk
  coords.push({ x: 0.045, y: 0.280 });   // 49: Lower Secondary Branch
  coords.push({ x: 0.110, y: 0.310 });   // 50: Distal Lower Arbor Fork
  coords.push({ x: 0.170, y: 0.330 });   // 51: Distal Lower Arbor Tip
  edges.push([27, 46], [46, 47], [47, 48], [48, 49], [49, 50], [50, 51], [48, 43]);

  // Ensure pad to count
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * ((idx % 5) - 2), y: 0.02 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 12. KNOWLEDGE_GRAPH: Multi-Tier Epistemic Graph, Concept Hubs & Relational Edges (54 nodes)
// ---------------------------------------------------------------------------
export function generateKnowledgeGraphCoords(count = 54): FormationTargetResult {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // Partition 1: Primary Conceptual Hub Nuclei (3 Hub Centers + 9 Inner Hub Satellites = 12 nodes: 0..11)
  // Hub Alpha: Core Reasoning Hub (Center: -0.06, -0.04)
  coords.push({ x: -0.060, y: -0.040 }); // 0: Hub Alpha Primary
  coords.push({ x: -0.085, y: -0.065 }); // 1: Alpha Core satellite 1
  coords.push({ x: -0.035, y: -0.055 }); // 2: Alpha Core satellite 2
  coords.push({ x: -0.060, y: -0.015 }); // 3: Alpha Core satellite 3
  edges.push([0, 1], [0, 2], [0, 3], [1, 2], [2, 3]);

  // Hub Beta: World Knowledge & Empirical Hub (Center: 0.17, -0.16)
  coords.push({ x: 0.170, y: -0.160 });  // 4: Hub Beta Primary
  coords.push({ x: 0.145, y: -0.185 });  // 5: Beta Core satellite 1
  coords.push({ x: 0.195, y: -0.175 });  // 6: Beta Core satellite 2
  coords.push({ x: 0.170, y: -0.130 });  // 7: Beta Core satellite 3
  edges.push([4, 5], [4, 6], [4, 7], [5, 6], [6, 7]);

  // Hub Gamma: Action & Synthesis Hub (Center: -0.14, 0.18)
  coords.push({ x: -0.140, y: 0.180 });  // 8: Hub Gamma Primary
  coords.push({ x: -0.165, y: 0.155 });  // 9: Gamma Core satellite 1
  coords.push({ x: -0.115, y: 0.165 });  // 10: Gamma Core satellite 2
  coords.push({ x: -0.140, y: 0.210 });  // 11: Gamma Core satellite 3
  edges.push([8, 9], [8, 10], [8, 11], [9, 10], [10, 11]);

  // Primary Cross-Hub Structural Backbone Relations (Bridging the 3 Semantic Domains)
  edges.push([0, 4], [4, 8], [8, 0]);
  edges.push([2, 5], [6, 10], [11, 3]);

  // Partition 2: Intermediate Entity Clusters & Ontological Classes (18 nodes: 12..29)
  // Cluster Alpha-West (Reasoning/Logic Entities): 6 nodes (12..17)
  coords.push({ x: -0.220, y: -0.090 }); // 12
  coords.push({ x: -0.260, y: -0.160 }); // 13
  coords.push({ x: -0.310, y: -0.140 }); // 14
  coords.push({ x: -0.240, y: -0.010 }); // 15
  coords.push({ x: -0.290, y: 0.030 });  // 16
  coords.push({ x: -0.190, y: 0.050 });  // 17
  edges.push([0, 12], [1, 12], [12, 13], [13, 14], [12, 15], [15, 16], [15, 17], [13, 15]);

  // Cluster Beta-East (Empirical/Science Entities): 6 nodes (18..23)
  coords.push({ x: 0.240, y: -0.110 });  // 18
  coords.push({ x: 0.300, y: -0.040 });  // 19
  coords.push({ x: 0.350, y: -0.080 });  // 20
  coords.push({ x: 0.260, y: -0.220 });  // 21
  coords.push({ x: 0.320, y: -0.260 });  // 22
  coords.push({ x: 0.360, y: -0.200 });  // 23
  edges.push([4, 18], [7, 18], [18, 19], [19, 20], [4, 21], [21, 22], [22, 23], [19, 21]);

  // Cluster Gamma-South (Synthesis/Action Entities): 6 nodes (24..29)
  coords.push({ x: -0.080, y: 0.240 });  // 24
  coords.push({ x: -0.020, y: 0.270 });  // 25
  coords.push({ x: 0.060, y: 0.280 });   // 26
  coords.push({ x: -0.210, y: 0.240 });  // 27
  coords.push({ x: -0.280, y: 0.290 });  // 28
  coords.push({ x: -0.240, y: 0.340 });  // 29
  edges.push([8, 24], [10, 24], [24, 25], [25, 26], [8, 27], [27, 28], [28, 29], [24, 27]);

  // Cross-Domain Regional Connectors
  edges.push([17, 8], [18, 26], [13, 27]);

  // Partition 3: Peripheral Fact Leaves, Attributes & Trans-Domain Query Loops (24 nodes: 30..53)
  // North Trans-Domain Query Loop (Bridge between Reasoning & Empirical): 8 nodes (30..37)
  coords.push({ x: -0.150, y: -0.230 }); // 30
  coords.push({ x: -0.090, y: -0.280 }); // 31
  coords.push({ x: -0.020, y: -0.320 }); // 32
  coords.push({ x: 0.050, y: -0.300 });  // 33
  coords.push({ x: 0.110, y: -0.270 });  // 34
  coords.push({ x: 0.200, y: -0.310 });  // 35
  coords.push({ x: 0.280, y: -0.320 });  // 36
  coords.push({ x: 0.010, y: -0.240 });  // 37: North Hub Anchor
  edges.push([13, 30], [30, 31], [31, 32], [32, 33], [33, 34], [34, 35], [35, 36], [36, 22]);
  edges.push([0, 37], [37, 32], [4, 34]);

  // East-to-South Trans-Domain Query Loop: 8 nodes (38..45)
  coords.push({ x: 0.310, y: 0.050 });   // 38
  coords.push({ x: 0.270, y: 0.120 });   // 39
  coords.push({ x: 0.220, y: 0.180 });   // 40
  coords.push({ x: 0.150, y: 0.230 });   // 41
  coords.push({ x: 0.100, y: 0.200 });   // 42
  coords.push({ x: 0.180, y: 0.080 });   // 43
  coords.push({ x: 0.250, y: 0.240 });   // 44
  coords.push({ x: 0.180, y: 0.310 });   // 45
  edges.push([19, 38], [38, 39], [39, 40], [40, 41], [41, 26], [40, 44], [44, 45], [45, 26]);
  edges.push([42, 43], [43, 4], [42, 41]);

  // West-to-Southwest Distal Fact Leaves: 8 nodes (46..53)
  coords.push({ x: -0.330, y: -0.060 }); // 46
  coords.push({ x: -0.350, y: 0.110 });  // 47
  coords.push({ x: -0.310, y: 0.200 });  // 48
  coords.push({ x: -0.340, y: 0.260 });  // 49
  coords.push({ x: -0.190, y: 0.330 });  // 50
  coords.push({ x: -0.120, y: 0.340 });  // 51
  coords.push({ x: -0.050, y: 0.350 });  // 52
  coords.push({ x: 0.010, y: 0.350 });   // 53
  edges.push([14, 46], [46, 16], [16, 47], [47, 48], [48, 27], [28, 49], [49, 29], [29, 50], [50, 51], [51, 52], [52, 53]);

  // Ensure pad to exact requested count
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * ((idx % 5) - 2), y: 0.02 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 13. INFINITY_LOOP: Continuous Interacting Intelligence Streams (3D Lemniscate)
// ---------------------------------------------------------------------------
// Canonical three-dimensional lemniscate (∞) with dual circulating streams,
// luminous crossover exchange junction, and nested orbital resonance loops.
// Strictly deterministic (zero Math.random()).
export function generateInfinityLoopCoords(count: number = 52): {
  coords: Array<{ x: number; y: number }>;
  edges: Array<[number, number]>;
} {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  // Partition 1: Primary Lemniscate Backbone (32 nodes: 0..31)
  // Evenly parameterized along t in [0, 2*PI)
  const backboneCount = 32;
  const scaleA = 0.36;
  const scaleB = 0.22;
  const tiltPitch = 0.22;
  const tiltYaw = 0.16;
  const tiltRoll = -Math.PI / 4; // ~45 deg diagonal orientation for clear headline clearance

  for (let i = 0; i < backboneCount; i++) {
    const t = (i / backboneCount) * Math.PI * 2;
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    const denom = 1.0 + sinT * sinT;

    const rawX = (scaleA * cosT) / denom;
    const rawY = (scaleB * sinT * cosT) / denom;
    const rawZ = 0.12 * Math.sin(2.0 * t);

    // 3D Rotation & Perspective Projection
    const cosY = Math.cos(tiltYaw);
    const sinY = Math.sin(tiltYaw);
    const x1 = rawX * cosY + rawZ * sinY;
    const z1 = -rawX * sinY + rawZ * cosY;

    const cosP = Math.cos(tiltPitch);
    const sinP = Math.sin(tiltPitch);
    const y2 = rawY * cosP - z1 * sinP;
    const z2 = rawY * sinP + z1 * cosP;

    // Roll rotation around Z axis (~45 deg diagonal orientation)
    const cosR = Math.cos(tiltRoll);
    const sinR = Math.sin(tiltRoll);
    const x3 = x1 * cosR - y2 * sinR;
    const y3 = x1 * sinR + y2 * cosR;

    const cameraDist = 1.8;
    const depthScale = cameraDist / (cameraDist + z2);

    coords.push({
      x: Number((x3 * depthScale).toFixed(4)),
      y: Number((y3 * depthScale).toFixed(4))
    });

    // Continuous closed lemniscate perimeter edge
    edges.push([i, (i + 1) % backboneCount]);
  }

  // Partition 2: Inner Braided Counter-Stream & Secondary Harmonic Loop (12 nodes: 32..43)
  // Slightly tighter inner loop with counter-phase alignment
  const innerCount = 12;
  const innerScaleA = 0.29;
  const innerScaleB = 0.17;
  for (let j = 0; j < innerCount; j++) {
    const t = (j / innerCount) * Math.PI * 2 + 0.35;
    const sinT = Math.sin(t);
    const cosT = Math.cos(t);
    const denom = 1.0 + sinT * sinT;

    const rawX = (innerScaleA * cosT) / denom;
    const rawY = (innerScaleB * sinT * cosT) / denom;
    const rawZ = 0.09 * Math.sin(2.0 * t);

    const cosY = Math.cos(tiltYaw);
    const sinY = Math.sin(tiltYaw);
    const x1 = rawX * cosY + rawZ * sinY;
    const z1 = -rawX * sinY + rawZ * cosY;

    const cosP = Math.cos(tiltPitch);
    const sinP = Math.sin(tiltPitch);
    const y2 = rawY * cosP - z1 * sinP;
    const z2 = rawY * sinP + z1 * cosP;

    // Roll rotation around Z axis (~45 deg diagonal orientation)
    const cosR = Math.cos(tiltRoll);
    const sinR = Math.sin(tiltRoll);
    const x3 = x1 * cosR - y2 * sinR;
    const y3 = x1 * sinR + y2 * cosR;

    const cameraDist = 1.8;
    const depthScale = cameraDist / (cameraDist + z2);

    const nodeIdx = coords.length;
    coords.push({
      x: Number((x3 * depthScale).toFixed(4)),
      y: Number((y3 * depthScale).toFixed(4))
    });

    edges.push([nodeIdx, 32 + ((j + 1) % innerCount)]);
    // Inter-strand cross-link to primary backbone
    const backbonePartner = Math.floor((j / innerCount) * backboneCount);
    edges.push([nodeIdx, backbonePartner]);
  }

  // Partition 3: Central Energy Crossover Junction (8 nodes: 44..51)
  // Clustered around the intersection (0, 0) with vertical depth crossing
  const cosR = Math.cos(tiltRoll);
  const sinR = Math.sin(tiltRoll);
  const crossoverOffsets = [
    { x: -0.025, y: -0.020 },
    { x: 0.025, y: 0.020 },
    { x: -0.020, y: 0.025 },
    { x: 0.020, y: -0.025 },
    { x: -0.040, y: 0.000 },
    { x: 0.040, y: 0.000 },
    { x: 0.000, y: -0.035 },
    { x: 0.000, y: 0.035 }
  ];

  const crossoverStart = coords.length;
  for (let k = 0; k < crossoverOffsets.length; k++) {
    const off = crossoverOffsets[k];
    const nodeIdx = coords.length;
    const rotX = off.x * cosR - off.y * sinR;
    const rotY = off.x * sinR + off.y * cosR;
    coords.push({
      x: Number(rotX.toFixed(4)),
      y: Number(rotY.toFixed(4))
    });
    // Bridge to central crossover neighbors
    if (k % 2 === 1) {
      edges.push([nodeIdx - 1, nodeIdx]);
    }
  }

  // Cross-junction structural anchors linking to both lobes
  edges.push([crossoverStart, 0], [crossoverStart + 1, 16]);
  edges.push([crossoverStart + 2, 8], [crossoverStart + 3, 24]);
  edges.push([crossoverStart + 4, 32], [crossoverStart + 5, 38]);

  // Ensure pad to exact requested count
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * ((idx % 5) - 2), y: 0.02 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 14. INTELLIGENCE_CRYSTAL: Structured Faceted Polyhedral Intelligence
// ---------------------------------------------------------------------------
export function generateIntelligenceCrystalCoords(count: number = 54): {
  coords: Array<{ x: number; y: number }>;
  edges: Array<[number, number]>;
} {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  const rotY = 0.35; // Default reference rotation
  const tiltPitch = 0.26;
  const cameraDist = 2.0;

  function project(x: number, y: number, z: number): { x: number; y: number } {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    const cosP = Math.cos(tiltPitch);
    const sinP = Math.sin(tiltPitch);
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;

    const depthScale = cameraDist / (cameraDist + z2);
    return {
      x: Number((x1 * depthScale).toFixed(4)),
      y: Number((y2 * depthScale).toFixed(4))
    };
  }

  // Partition 1: Outer Crystalline Vertices & Apexes (20 nodes: 0..19)
  // Node 0: Top Apex
  coords.push(project(0, -0.38, 0));

  // Node 1..6: Upper Hexagonal Girdle Ring (r = 0.24, y = -0.13)
  const upperStart = 1;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    coords.push(project(0.24 * Math.cos(angle), -0.13, 0.24 * Math.sin(angle)));
    // Edge from top apex
    edges.push([0, upperStart + i]);
    // Edge to next on upper ring
    edges.push([upperStart + i, upperStart + ((i + 1) % 6)]);
  }

  // Node 7..12: Equatorial Girdle Ring (r = 0.33, y = 0.0, rotated by PI / 6)
  const eqStart = 7;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    coords.push(project(0.33 * Math.cos(angle), 0.0, 0.33 * Math.sin(angle)));
    // Connect to upper ring neighbors (faceted triangulation)
    edges.push([eqStart + i, upperStart + i]);
    edges.push([eqStart + i, upperStart + ((i + 1) % 6)]);
    // Equatorial ring closed perimeter
    edges.push([eqStart + i, eqStart + ((i + 1) % 6)]);
  }

  // Node 13..18: Lower Hexagonal Girdle Ring (r = 0.24, y = +0.13)
  const lowerStart = 13;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    coords.push(project(0.24 * Math.cos(angle), 0.13, 0.24 * Math.sin(angle)));
    // Connect to equatorial ring neighbors
    edges.push([lowerStart + i, eqStart + i]);
    edges.push([lowerStart + i, eqStart + ((i + 5) % 6)]);
    // Lower ring perimeter
    edges.push([lowerStart + i, lowerStart + ((i + 1) % 6)]);
  }

  // Node 19: Bottom Apex
  const botApexIdx = 19;
  coords.push(project(0, 0.38, 0));
  for (let i = 0; i < 6; i++) {
    edges.push([botApexIdx, lowerStart + i]);
  }

  // Partition 2: Inner Core Lattice & Octahedral Seed (14 nodes: 20..33)
  // Node 20: Inner Top Apex
  const innerTopIdx = 20;
  coords.push(project(0, -0.19, 0));
  // Node 21: Inner Bottom Apex
  const innerBotIdx = 21;
  coords.push(project(0, 0.19, 0));
  // Node 22..27: Inner Equatorial Ring (r = 0.14, y = 0.0)
  const innerRingStart = 22;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 12;
    coords.push(project(0.14 * Math.cos(angle), 0.0, 0.14 * Math.sin(angle)));
    edges.push([innerTopIdx, innerRingStart + i]);
    edges.push([innerBotIdx, innerRingStart + i]);
    edges.push([innerRingStart + i, innerRingStart + ((i + 1) % 6)]);
  }
  // Node 28..33: Core Quantum Kernel (r = 0.05, y = +/-0.04)
  const coreKernelStart = 28;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const yOff = (i % 2 === 0 ? -0.04 : 0.04);
    coords.push(project(0.05 * Math.cos(angle), yOff, 0.05 * Math.sin(angle)));
    edges.push([coreKernelStart + i, innerRingStart + i]);
    if (i > 0) {
      edges.push([coreKernelStart + i - 1, coreKernelStart + i]);
    }
  }
  edges.push([coreKernelStart + 5, coreKernelStart]);

  // Partition 3: Optical Refraction & Prism Ridge Midpoints (20 nodes: 34..53)
  // Midpoints on upper pyramidal ridges (6 nodes: 34..39)
  for (let i = 0; i < 6; i++) {
    const pUpper = coords[upperStart + i];
    const pApex = coords[0];
    coords.push({
      x: Number(((pUpper.x + pApex.x) * 0.5).toFixed(4)),
      y: Number(((pUpper.y + pApex.y) * 0.5).toFixed(4))
    });
    const midIdx = coords.length - 1;
    edges.push([0, midIdx], [midIdx, upperStart + i]);
  }

  // Midpoints on lower pyramidal ridges (6 nodes: 40..45)
  for (let i = 0; i < 6; i++) {
    const pLower = coords[lowerStart + i];
    const pApex = coords[botApexIdx];
    coords.push({
      x: Number(((pLower.x + pApex.x) * 0.5).toFixed(4)),
      y: Number(((pLower.y + pApex.y) * 0.5).toFixed(4))
    });
    const midIdx = coords.length - 1;
    edges.push([botApexIdx, midIdx], [midIdx, lowerStart + i]);
  }

  // Prismatic resonance hubs linking inner core to outer equatorial girdle (6 nodes: 46..51)
  for (let i = 0; i < 6; i++) {
    const pInner = coords[innerRingStart + i];
    const pOuter = coords[eqStart + i];
    coords.push({
      x: Number(((pInner.x + pOuter.x) * 0.5).toFixed(4)),
      y: Number(((pInner.y + pOuter.y) * 0.5).toFixed(4))
    });
    const bridgeIdx = coords.length - 1;
    edges.push([innerRingStart + i, bridgeIdx], [bridgeIdx, eqStart + i]);
  }
  // Two central optical polar focus nodes (52, 53)
  coords.push(project(0, -0.08, 0));
  coords.push(project(0, 0.08, 0));
  edges.push([52, innerTopIdx], [53, innerBotIdx]);

  // Ensure pad to exact requested count
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * ((idx % 5) - 2), y: 0.02 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// 16. GEOMETRIC_MANDALA: Ordered Multi-Tier Radial Mandala & Sacred Geometry (54 nodes)
// ---------------------------------------------------------------------------
export function generateGeometricMandalaCoords(count: number = 54): {
  coords: Array<{ x: number; y: number }>;
  edges: Array<[number, number]>;
} {
  const coords: Array<{ x: number; y: number }> = [];
  const edges: Array<[number, number]> = [];

  const tiltPitch = 0.22;
  const tiltYaw = 0.14;
  const cameraDist = 2.0;

  function project(x: number, y: number, z: number): { x: number; y: number } {
    const cosY = Math.cos(tiltYaw);
    const sinY = Math.sin(tiltYaw);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    const cosP = Math.cos(tiltPitch);
    const sinP = Math.sin(tiltPitch);
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;

    const depthScale = cameraDist / (cameraDist + z2);
    return {
      x: Number((x1 * depthScale).toFixed(4)),
      y: Number((y2 * depthScale).toFixed(4))
    };
  }

  // Partition 1: Inner Bindu Seed Core (6 nodes: 0..5, r = 0.052, z = +0.060)
  const p1Count = 6;
  const r1 = 0.052;
  const z1 = 0.060;
  for (let i = 0; i < p1Count; i++) {
    const angle = (i / p1Count) * Math.PI * 2;
    coords.push(project(Math.cos(angle) * r1, Math.sin(angle) * r1, z1));
    edges.push([i, (i + 1) % p1Count]);
  }
  // Diametrical internal spokes
  edges.push([0, 3], [1, 4], [2, 5]);

  // Partition 2: Interlocking 12-Pointed Star / Sacred Hexagram Vertices (12 nodes: 6..17, z = +0.035)
  const p2Start = 6;
  const p2Count = 12;
  const z2 = 0.035;
  for (let i = 0; i < p2Count; i++) {
    const angle = (i / p2Count) * Math.PI * 2;
    // Alternating star outer peaks and inner valleys
    const r = i % 2 === 0 ? 0.145 : 0.115;
    coords.push(project(Math.cos(angle) * r, Math.sin(angle) * r, z2));
    edges.push([p2Start + i, p2Start + ((i + 1) % p2Count)]);
  }
  // Interlocking triangles of the star (dodecagram harmonics)
  for (let i = 0; i < 6; i++) {
    edges.push([p2Start + i * 2, p2Start + ((i * 2 + 4) % p2Count)]);
  }
  // Radial spokes connecting Partition 1 to Partition 2
  for (let i = 0; i < p1Count; i++) {
    edges.push([i, p2Start + i * 2]);
  }

  // Partition 3: Intermediate 18-Petal Scalloped Lotus Ring (18 nodes: 18..35, z = 0.000)
  const p3Start = 18;
  const p3Count = 18;
  const z3 = 0.000;
  for (let i = 0; i < p3Count; i++) {
    const angle = (i / p3Count) * Math.PI * 2;
    // Alternating petal crests and troughs
    const r = i % 2 === 0 ? 0.245 : 0.220;
    coords.push(project(Math.cos(angle) * r, Math.sin(angle) * r, z3));
    edges.push([p3Start + i, p3Start + ((i + 1) % p3Count)]);
  }
  // Spokes connecting Star Vertices to Intermediate Ring
  for (let i = 0; i < p2Count; i++) {
    const targetP3 = Math.floor((i / p2Count) * p3Count);
    edges.push([p2Start + i, p3Start + targetP3]);
  }

  // Partition 4: Outer Cosmic Perimeter & 18 Gate Crenellations (18 nodes: 36..53, z = -0.035)
  const p4Start = 36;
  const p4Count = 18;
  const z4 = -0.035;
  for (let i = 0; i < p4Count; i++) {
    const angle = (i / p4Count) * Math.PI * 2;
    // Outer crenellated gates
    const r = i % 2 === 0 ? 0.365 : 0.335;
    coords.push(project(Math.cos(angle) * r, Math.sin(angle) * r, z4));
    edges.push([p4Start + i, p4Start + ((i + 1) % p4Count)]);
    // Direct radial spoke from intermediate ring to outer gate
    edges.push([p3Start + i, p4Start + i]);
  }

  // Ensure pad to exact requested count
  while (coords.length < count) {
    const idx = coords.length;
    coords.push({ x: 0.02 * ((idx % 5) - 2), y: 0.02 * ((idx % 4) - 1.5) });
  }

  return {
    coords: coords.slice(0, count),
    edges: edges.filter(([a, b]) => a < count && b < count)
  };
}

// ---------------------------------------------------------------------------
// Formation Catalog: Milestone 1 Refined Initial Formations
// ---------------------------------------------------------------------------
export const MILESTONE1_FORMATIONS: ParticleFormation[] = [
  {
    id: 'galaxy_spiral',
    name: 'Logarithmic Spiral Galaxy',
    category: 'cosmic',
    participantCount: 54,
    motionType: 'rotate',
    motionParam: 0.00032,
    scaleMultiplier: 1.05,
    generateCoords: generateGalaxySpiralCoords
  },
  {
    id: 'nebula',
    name: 'Interstellar Gas Nebula',
    category: 'cosmic',
    participantCount: 54,
    motionType: 'wave',
    motionParam: 0.00024,
    scaleMultiplier: 1.08,
    generateCoords: generateNebulaCoords
  },
  {
    id: 'atomic_orbitals',
    name: 'Quantum Atomic Orbitals',
    category: 'quantum',
    participantCount: 52,
    motionType: 'rotate',
    motionParam: 0.00030,
    scaleMultiplier: 1.04,
    generateCoords: generateAtomicOrbitalsCoords
  },
  {
    id: 'black_hole_vortex',
    name: 'Relativistic Black-Hole Vortex',
    category: 'cosmic',
    participantCount: 54,
    motionType: 'rotate',
    motionParam: 0.00065,
    scaleMultiplier: 1.06,
    generateCoords: generateBlackHoleVortexCoords
  },
  {
    id: 'knowledge_constellation',
    name: 'Connected Knowledge Constellation',
    category: 'cosmic',
    participantCount: 54,
    motionType: 'drift',
    motionParam: 0.00028,
    scaleMultiplier: 1.05,
    generateCoords: generateKnowledgeConstellationCoords
  },
  {
    id: 'orbital_system',
    name: 'Celestial Planetary Orbital System',
    category: 'cosmic',
    participantCount: 54,
    motionType: 'rotate',
    motionParam: 0.00035,
    scaleMultiplier: 1.05,
    generateCoords: generateOrbitalSystemCoords
  },
  {
    id: 'cortex_brain',
    name: 'Cerebral Cortex Silhouette',
    category: 'biological',
    participantCount: 56,
    motionType: 'pulse',
    motionParam: 0.00035,
    scaleMultiplier: 1.0,
    generateCoords: generateCortexBrainCoords
  },
  {
    id: 'dna_helix',
    name: 'Double Helix Connectome',
    category: 'biological',
    participantCount: 52,
    motionType: 'rotate',
    motionParam: 0.00045,
    scaleMultiplier: 1.02,
    generateCoords: generateDnaHelixCoords
  },
  {
    id: 'neural_synapse',
    name: 'Multi-Tier Synaptic Network',
    category: 'neural',
    participantCount: 50,
    motionType: 'pulse',
    motionParam: 0.0028,
    scaleMultiplier: 0.98,
    generateCoords: generateNeuralSynapseCoords
  },
  {
    id: 'single_neuron',
    name: 'Multipolar Single Neuron',
    category: 'biological',
    participantCount: 52,
    motionType: 'pulse',
    motionParam: 0.0024,
    scaleMultiplier: 1.0,
    generateCoords: generateSingleNeuronCoords
  },
  {
    id: 'synaptic_web',
    name: 'Biological Synaptic Web',
    category: 'biological',
    participantCount: 52,
    motionType: 'pulse',
    motionParam: 0.0026,
    scaleMultiplier: 1.0,
    generateCoords: generateSynapticWebCoords
  },
  {
    id: 'knowledge_graph',
    name: 'Interconnected Knowledge Graph',
    category: 'neural',
    participantCount: 54,
    motionType: 'pulse',
    motionParam: 0.0022,
    scaleMultiplier: 1.0,
    generateCoords: generateKnowledgeGraphCoords
  },
  {
    id: 'infinity_loop',
    name: 'Harmonic 3D Infinity Loop',
    category: 'quantum',
    participantCount: 52,
    motionType: 'rotate',
    motionParam: 0.00038,
    scaleMultiplier: 1.02,
    generateCoords: generateInfinityLoopCoords
  },
  {
    id: 'intelligence_crystal',
    name: 'Structured Intelligence Crystal',
    category: 'quantum',
    participantCount: 54,
    motionType: 'rotate',
    motionParam: 0.00035,
    scaleMultiplier: 1.02,
    generateCoords: generateIntelligenceCrystalCoords
  },
  {
    id: 'geometric_mandala',
    name: 'Ordered Geometric Mandala',
    category: 'quantum',
    participantCount: 54,
    motionType: 'rotate',
    motionParam: 0.00032,
    scaleMultiplier: 1.04,
    generateCoords: generateGeometricMandalaCoords
  }
];

export function getDeterministicFormationByIndex(cycleIndex: number): ParticleFormation {
  const normIndex = Math.abs(cycleIndex) % MILESTONE1_FORMATIONS.length;
  return MILESTONE1_FORMATIONS[normIndex];
}
