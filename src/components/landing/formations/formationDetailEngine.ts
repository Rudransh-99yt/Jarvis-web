/**
 * External High-Density Formation Engine — Phase 3
 *
 * Coordinates and dispatches dedicated volumetric micro-detail rendering layers
 * for all featured formations in the Jarvis particle universe.
 *
 * Guarantees:
 * - 100% deterministic closed-form parametric equations (zero Math.random()).
 * - Clean external architectural boundary: micro-detail engines live outside CinematicParticleField.
 * - Zero interference with the 48 signature J particles, opening sequence, or color themes.
 * - Seamless integration with active universe color cycling.
 */

import { renderDnaDetailLayer, type DnaRenderOptions } from './dnaDetailRenderer.ts';
import { renderGalaxyDetailLayer, type GalaxyRenderOptions } from './galaxyDetailRenderer.ts';
import { renderNebulaDetailLayer, type NebulaRenderOptions } from './nebulaDetailRenderer.ts';
import { renderAtomicOrbitalsDetailLayer, type AtomicOrbitalsRenderOptions } from './atomicOrbitalsDetailRenderer.ts';
import { renderBlackHoleVortexDetailLayer, type BlackHoleVortexRenderOptions } from './blackHoleVortexDetailRenderer.ts';
import { renderKnowledgeConstellationDetailLayer, type KnowledgeConstellationRenderOptions } from './knowledgeConstellationDetailRenderer.ts';
import { renderOrbitalSystemDetailLayer, type OrbitalSystemRenderOptions } from './orbitalSystemDetailRenderer.ts';
import { renderCortexDetailLayer, type CortexRenderOptions } from './cortexDetailRenderer.ts';
import { renderSynapseDetailLayer, type SynapseRenderOptions } from './synapseDetailRenderer.ts';
import { renderNeuralNetworkDetailLayer, type NeuralNetworkRenderOptions } from './neuralNetworkDetailRenderer.ts';
import { renderSingleNeuronDetailLayer, type SingleNeuronRenderOptions } from './singleNeuronDetailRenderer.ts';
import { renderSynapticWebDetailLayer, type SynapticWebRenderOptions } from './synapticWebDetailRenderer.ts';
import { renderKnowledgeGraphDetailLayer, type KnowledgeGraphRenderOptions } from './knowledgeGraphDetailRenderer.ts';
import { renderInfinityLoopDetailLayer, type InfinityLoopRenderOptions } from './infinityLoopDetailRenderer.ts';
import { renderIntelligenceCrystalDetailLayer, type IntelligenceCrystalRenderOptions } from './intelligenceCrystalDetailRenderer.ts';
import { renderGeometricMandalaDetailLayer, type GeometricMandalaRenderOptions } from './geometricMandalaDetailRenderer.ts';

export type FormationDetailRenderOptions =
  | DnaRenderOptions
  | GalaxyRenderOptions
  | NebulaRenderOptions
  | AtomicOrbitalsRenderOptions
  | BlackHoleVortexRenderOptions
  | KnowledgeConstellationRenderOptions
  | OrbitalSystemRenderOptions
  | CortexRenderOptions
  | SynapseRenderOptions
  | NeuralNetworkRenderOptions
  | SingleNeuronRenderOptions
  | SynapticWebRenderOptions
  | KnowledgeGraphRenderOptions
  | InfinityLoopRenderOptions
  | IntelligenceCrystalRenderOptions
  | GeometricMandalaRenderOptions;

export interface SynchronizedTargetParams {
  family: string;
  index: number;
  totalParticipants: number;
  rawCoord: { x: number; y: number };
  scale: number;
  centerX: number;
  centerY: number;
  elapsed: number;
}

/**
 * Computes exact synchronized screen target coordinates for formation anchor particles.
 * Ensures 100% mathematical lockstep between constellation anchor particles and the
 * dedicated volumetric micro-detail layers (same 3D projection, inclination, rotation, and wave dynamics).
 */
export function computeSynchronizedFormationTarget({
  family,
  index,
  totalParticipants,
  rawCoord,
  scale,
  centerX,
  centerY,
  elapsed
}: SynchronizedTargetParams): { x: number; y: number } {
  if (family === 'galaxy_spiral') {
    // 3D inclined disc rotation matching galaxyDetailRenderer
    const rotAngle = (elapsed * 0.00032) % (Math.PI * 2);
    const tiltFactor = 0.74;
    const discTiltAngle = -0.30;
    const cosSlant = Math.cos(discTiltAngle);
    const sinSlant = Math.sin(discTiltAngle);

    // Synchronize polar radius and base angle for 54-node galaxy
    let r = 0;
    let baseAngle = 0;

    if (index < 6) {
      // Inner nucleus (6 nodes)
      baseAngle = (index / 6) * Math.PI * 2;
      r = 0.016 + (index % 2) * 0.012;
    } else if (index < 14) {
      // Outer core halo (8 nodes)
      baseAngle = ((index - 6) / 8) * Math.PI * 2 + Math.PI / 8;
      r = 0.046 + ((index - 6) % 3) * 0.010;
    } else if (index < 34) {
      // Arm 1 (20 nodes)
      const t = (index - 14) / 19;
      baseAngle = t * (Math.PI * 1.94);
      r = 0.055 + Math.pow(t, 1.24) * 0.38;
    } else if (index < 54) {
      // Arm 2 (20 nodes)
      const t = (index - 34) / 19;
      baseAngle = t * (Math.PI * 1.94) + Math.PI;
      r = 0.055 + Math.pow(t, 1.24) * 0.38;
    } else {
      r = Math.hypot(rawCoord.x, rawCoord.y);
      baseAngle = Math.atan2(rawCoord.y, rawCoord.x);
    }

    const currentAngle = baseAngle + rotAngle;
    const rawX = Math.cos(currentAngle) * r * scale;
    const rawY = Math.sin(currentAngle) * r * scale * tiltFactor;

    return {
      x: centerX + rawX * cosSlant - rawY * sinSlant,
      y: centerY + rawX * sinSlant + rawY * cosSlant
    };
  }

  if (family === 'nebula') {
    // 3D volumetric turbulence drift matching nebulaDetailRenderer
    const driftTime = elapsed * 0.00024;
    const flowAngle = Math.sin(driftTime) * 0.08;
    const cosFlow = Math.cos(flowAngle);
    const sinFlow = Math.sin(flowAngle);

    // Depth z assignment for anchor nodes to provide lockstep parallax
    let z = 0;
    if (index < 12) {
      // Central Core
      z = Math.sin((index / 12) * Math.PI * 2) * 0.08;
    } else if (index < 26) {
      // NE Pillar
      const t = (index - 12) / 13;
      z = Math.cos(t * Math.PI * 2.0) * 0.10;
    } else if (index < 40) {
      // SW Veil
      const t = (index - 26) / 13;
      z = Math.sin(t * Math.PI * 2.5) * 0.12;
    } else if (index < 48) {
      // NW Arm
      const t = (index - 40) / 7;
      z = Math.sin(t * Math.PI * 3.0) * 0.07;
    } else {
      // East Canopy
      z = 0.06;
    }

    const pShiftX = z * Math.sin(driftTime * 1.4) * 0.024;
    const pShiftY = z * Math.cos(driftTime * 1.1) * 0.018;

    const rotX = (rawCoord.x + pShiftX) * cosFlow - (rawCoord.y + pShiftY) * sinFlow;
    const rotY = (rawCoord.x + pShiftX) * sinFlow + (rawCoord.y + pShiftY) * cosFlow;

    return {
      x: centerX + rotX * scale,
      y: centerY + rotY * scale
    };
  }

  if (family === 'atomic_orbitals') {
    // 3D quantum Larmor precession & inclination tilt matching atomicOrbitalsDetailRenderer
    const precAngle = (elapsed * 0.00030) % (Math.PI * 2);
    const cosPrec = Math.cos(precAngle);
    const sinPrec = Math.sin(precAngle);

    const tiltAngle = 0.38;
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);

    // Depth z assignment for anchor nodes to provide lockstep parallax
    let z = 0;
    if (index < 8) {
      // Central Nucleus: subtle 3D nucleon depth
      z = (index % 2 === 0 ? 1 : -1) * 0.025;
      if (index === 0) z = 0;
    } else if (index < 18) {
      // Vertical p_z lobes: upper (8..12) vs lower (13..17)
      if (index === 9 || index === 11) z = 0.035;
      else if (index === 14 || index === 16) z = -0.035;
      else z = 0;
    } else if (index < 28) {
      // Horizontal p_x lobes: right (18..22) vs left (23..27)
      if (index === 19 || index === 21) z = 0.035;
      else if (index === 24 || index === 26) z = -0.035;
      else z = 0;
    } else if (index < 40) {
      // Diagonal hybridized lobes: quadrants
      if (index >= 28 && index <= 30) z = 0.030;
      else if (index >= 31 && index <= 33) z = -0.030;
      else if (index >= 34 && index <= 36) z = 0.030;
      else z = -0.030;
    } else {
      // Toroidal collar ring (40..51)
      const theta = ((index - 40) / 12) * Math.PI * 2;
      z = Math.sin(theta * 2.0) * 0.025;
    }

    const px = rawCoord.x * cosPrec - rawCoord.y * sinPrec;
    const py = rawCoord.x * sinPrec + rawCoord.y * cosPrec;
    const pz = z;

    const finalX = px;
    const finalY = py * cosTilt - pz * sinTilt;

    return {
      x: centerX + finalX * scale,
      y: centerY + finalY * scale
    };
  }

  if (family === 'black_hole_vortex') {
    // 3D relativistic disk tilt & precession matching blackHoleVortexDetailRenderer
    const tiltAngle = 0.42;
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);

    const precAngle = (elapsed * 0.00022) % (Math.PI * 2);
    const cosPrec = Math.cos(precAngle);
    const sinPrec = Math.sin(precAngle);

    // Depth z assignment for anchor nodes to provide lockstep parallax
    let z = 0;
    if (index < 8) {
      // Photon sphere ring (0..7)
      z = 0;
    } else if (index < 22) {
      // Inner accretion disk (8..21)
      z = Math.sin(((index - 8) / 7) * Math.PI * 2) * 0.015;
    } else if (index < 38) {
      // Outer accretion disk (22..37)
      z = Math.cos(((index - 22) / 8) * Math.PI * 2) * 0.020;
    } else if (index < 46) {
      // Gravitational lensing arches (upper: 38..41, lower: 42..45)
      z = index < 42 ? 0.030 : -0.030;
    } else {
      // Polar jets (46..53)
      z = 0;
    }

    const px = rawCoord.x * cosPrec - rawCoord.y * sinPrec;
    const py = rawCoord.x * sinPrec + rawCoord.y * cosPrec;
    const pz = z;

    const finalX = px;
    const finalY = py * cosTilt - pz * sinTilt;

    return {
      x: centerX + finalX * scale,
      y: centerY + finalY * scale
    };
  }

  if (family === 'knowledge_constellation') {
    // 3D celestial inclination & drift matching knowledgeConstellationDetailRenderer
    const tiltAngle = 0.22;
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);

    const driftAngle = (elapsed * 0.00018) % (Math.PI * 2);
    const cosRot = Math.cos(driftAngle);
    const sinRot = Math.sin(driftAngle);

    // Depth z assignment for anchor nodes to provide lockstep parallax
    let z = 0;
    if (index < 10) {
      // Cluster Alpha: Prime Synthesis Core (0..9)
      z = index === 0 ? 0 : (index % 2 === 0 ? 0.010 : -0.010);
    } else if (index < 19) {
      // Cluster Beta: Empirical Spire (10..18)
      z = 0.035;
    } else if (index < 28) {
      // Cluster Gamma: Theoretical Bastion (19..27)
      z = -0.035;
    } else if (index < 37) {
      // Cluster Delta: Systems Pivot (28..36)
      z = 0.025;
    } else if (index < 46) {
      // Cluster Epsilon: Speculative Beacon (37..45)
      z = -0.025;
    } else {
      // Highway Relay Conduits (46..53)
      if (index === 46) z = -0.012;
      else if (index === 47) z = 0.018;
      else if (index === 48) z = -0.018;
      else if (index === 49) z = 0.012;
      else if (index === 50) z = -0.030;
      else if (index === 51) z = 0.030;
      else if (index === 52) z = 0.005;
      else z = -0.005;
    }

    const px = rawCoord.x * cosRot - rawCoord.y * sinRot;
    const py = rawCoord.x * sinRot + rawCoord.y * cosRot;
    const pz = z;

    const finalX = px;
    const finalY = py * cosTilt - pz * sinTilt;

    return {
      x: centerX + finalX * scale,
      y: centerY + finalY * scale
    };
  }

  if (family === 'orbital_system') {
    // 3D celestial inclination tilt & precession matching orbitalSystemDetailRenderer
    const tiltAngle = 0.38;
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);

    const precAngle = (elapsed * 0.00015) % (Math.PI * 2);
    const cosPrec = Math.cos(precAngle);
    const sinPrec = Math.sin(precAngle);

    let x = rawCoord.x;
    let y = rawCoord.y;
    let z = 0;

    if (index === 8) {
      // Planet 1: Swift inner terrestrial world
      const meanAnomaly = (elapsed * 0.0012 + 0.5) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * 0.08 * Math.sin(meanAnomaly);
      const r = (0.080 * (1 - 0.08 * 0.08)) / (1 + 0.08 * Math.cos(trueAnomaly));
      x = Math.cos(trueAnomaly) * r;
      y = Math.sin(trueAnomaly) * r;
      z = 0.005;
    } else if (index === 14) {
      // Planet 2: Habitable terrestrial world
      const meanAnomaly = (elapsed * 0.00075 + 2.1) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * 0.04 * Math.sin(meanAnomaly);
      const r = (0.145 * (1 - 0.04 * 0.04)) / (1 + 0.04 * Math.cos(trueAnomaly));
      x = Math.cos(trueAnomaly) * r;
      y = Math.sin(trueAnomaly) * r;
      z = 0.012;
    } else if (index === 15) {
      // Moon: Orbiting Planet 2
      const meanAnomaly = (elapsed * 0.00075 + 2.1) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * 0.04 * Math.sin(meanAnomaly);
      const r = (0.145 * (1 - 0.04 * 0.04)) / (1 + 0.04 * Math.cos(trueAnomaly));
      const px = Math.cos(trueAnomaly) * r;
      const py = Math.sin(trueAnomaly) * r;
      const moonPeriod = (elapsed * 0.0042) % (Math.PI * 2);
      x = px + Math.cos(moonPeriod) * 0.024;
      y = py + Math.sin(moonPeriod) * 0.024 * 0.7;
      z = 0.012;
    } else if (index === 22) {
      // Planet 3: Ringed Gas Giant
      const meanAnomaly = (elapsed * 0.00045 + 4.3) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * 0.05 * Math.sin(meanAnomaly);
      const r = (0.225 * (1 - 0.05 * 0.05)) / (1 + 0.05 * Math.cos(trueAnomaly));
      x = Math.cos(trueAnomaly) * r;
      y = Math.sin(trueAnomaly) * r;
      z = -0.010;
    } else if (index >= 23 && index <= 26) {
      // Planetary rings orbiting with Planet 3
      const meanAnomaly = (elapsed * 0.00045 + 4.3) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * 0.05 * Math.sin(meanAnomaly);
      const r = (0.225 * (1 - 0.05 * 0.05)) / (1 + 0.05 * Math.cos(trueAnomaly));
      const px = Math.cos(trueAnomaly) * r;
      const py = Math.sin(trueAnomaly) * r;
      const ringAngle = ((index - 23) / 4) * Math.PI * 2;
      x = px + Math.cos(ringAngle) * 0.038;
      y = py + Math.sin(ringAngle) * 0.038 * 0.85;
      z = -0.010;
    } else if (index === 32) {
      // Planet 4: Ice Giant Colossus
      const meanAnomaly = (elapsed * 0.00028 + 1.1) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * 0.07 * Math.sin(meanAnomaly);
      const r = (0.295 * (1 - 0.07 * 0.07)) / (1 + 0.07 * Math.cos(trueAnomaly));
      x = Math.cos(trueAnomaly) * r;
      y = Math.sin(trueAnomaly) * r;
      z = 0.015;
    } else if (index === 40) {
      // Planet 5: Trans-Neptunian Outlier
      const meanAnomaly = (elapsed * 0.00018 + 3.5) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * 0.12 * Math.sin(meanAnomaly);
      const r = (0.360 * (1 - 0.12 * 0.12)) / (1 + 0.12 * Math.cos(trueAnomaly));
      x = Math.cos(trueAnomaly) * r;
      y = Math.sin(trueAnomaly) * r;
      z = -0.018;
    } else if (index < 8) {
      // Central Star nodes
      z = 0;
    } else if (index >= 48 && index <= 53) {
      // Asteroid belt nodes
      z = 0.002;
    }

    const px = x * cosPrec - y * sinPrec;
    const py = x * sinPrec + y * cosPrec;
    const pz = z;

    const finalX = px;
    const finalY = py * cosTilt - pz * sinTilt;

    return {
      x: centerX + finalX * scale,
      y: centerY + finalY * scale
    };
  }

  if (family === 'dna_helix') {
    // 3D axial rotation matching dnaDetailRenderer
    const rotAngle = (elapsed * 0.00045) % (Math.PI * 2);
    const helixRadius = 0.185 * scale;
    const helixHalfHeight = 0.39 * scale;
    const turns = 2.85;

    // Strand 1: 0..17 (18 nodes)
    // Strand 2: 18..35 (18 nodes)
    // Ladder Rungs: 36..51 (8 rungs * 2 nodes = 16 nodes)
    if (index < 18) {
      const t = index / 17;
      const angle = t * Math.PI * 2 * turns + rotAngle;
      return {
        x: centerX + Math.sin(angle) * helixRadius,
        y: centerY + (-helixHalfHeight + t * 2 * helixHalfHeight)
      };
    } else if (index < 36) {
      const t = (index - 18) / 17;
      const angle = t * Math.PI * 2 * turns + rotAngle + Math.PI;
      return {
        x: centerX + Math.sin(angle) * helixRadius,
        y: centerY + (-helixHalfHeight + t * 2 * helixHalfHeight)
      };
    } else if (index < 52) {
      const rungIdx = Math.floor((index - 36) / 2);
      const nodeInRung = (index - 36) % 2;
      const rungStrandIndices = [1, 3, 5, 7, 9, 11, 13, 15];
      const sIdx = rungStrandIndices[rungIdx] ?? 1;
      const t = sIdx / 17;
      const angle1 = t * Math.PI * 2 * turns + rotAngle;
      const angle2 = angle1 + Math.PI;
      const x1 = centerX + Math.sin(angle1) * helixRadius;
      const x2 = centerX + Math.sin(angle2) * helixRadius;
      const y = centerY + (-helixHalfHeight + t * 2 * helixHalfHeight);

      return {
        x: nodeInRung === 0 ? x1 * 0.65 + x2 * 0.35 : x1 * 0.35 + x2 * 0.65,
        y
      };
    }

    return {
      x: centerX + rawCoord.x * scale,
      y: centerY + rawCoord.y * scale
    };
  }

  if (family === 'cortex_brain') {
    // 3D lateral yaw oscillation matching cortexDetailRenderer
    const yawAngle = Math.sin(elapsed * 0.00035) * 0.12;
    const cosYaw = Math.cos(yawAngle);

    return {
      x: centerX + (rawCoord.x * cosYaw) * scale,
      y: centerY + rawCoord.y * scale
    };
  }

  if (family === 'neural_synapse' || family === 'neural_network') {
    // Propagating action potential / tensor activation wave matching detail renderers
    const pulseSpeed = elapsed * 0.0028;
    let t = 0.5;
    if (index < 8) {
      t = index / 7;
    } else if (index < 20) {
      t = (index - 8) / 11;
    } else if (index < 36) {
      t = (index - 20) / 15;
    } else if (index < 46) {
      t = (index - 36) / 9;
    } else {
      t = Math.max(0, Math.min(1, (rawCoord.y + 0.34) / 0.68));
    }
    const wave = Math.sin(t * Math.PI * 2.5 + pulseSpeed * 0.6) * 0.014 * scale;

    return {
      x: centerX + rawCoord.x * scale + wave,
      y: centerY + rawCoord.y * scale
    };
  }

  if (family === 'single_neuron') {
    // Bio-electric firing wave & cytoplasmic undulation matching singleNeuronDetailRenderer
    const fireSpeed = elapsed * 0.0024;
    let waveX = 0;
    let waveY = 0;

    if (index < 14) {
      // Soma & nucleus: gentle organic metabolic breathing
      const breath = Math.sin(fireSpeed * 0.8 + rawCoord.x * 4) * 0.005 * scale;
      waveX = breath * Math.cos(rawCoord.y * 3);
      waveY = breath * Math.sin(rawCoord.x * 3);
    } else if (index < 32) {
      // Dendritic arbor: graded potential ripple converging toward soma
      const dRipple = Math.sin(fireSpeed * 1.5 - rawCoord.x * 6 + rawCoord.y * 4) * 0.008 * scale;
      waveX = dRipple * 0.7;
      waveY = dRipple * 0.5;
    } else if (index < 44) {
      // Axon & Nodes of Ranvier: saltatory action potential traveling rapidly from left to right along x
      const saltatoryPhase = (rawCoord.x + 0.14) * 12 - fireSpeed * 2.8;
      const spikeWave = Math.sin(saltatoryPhase) * 0.010 * scale;
      waveX = spikeWave * 0.4;
      waveY = spikeWave;
    } else {
      // Axon terminals & boutons: terminal synaptic discharge pulse
      const bPulse = Math.sin(fireSpeed * 2.0 + index) * 0.007 * scale;
      waveX = bPulse;
      waveY = bPulse * 0.6;
    }

    return {
      x: centerX + rawCoord.x * scale + waveX,
      y: centerY + rawCoord.y * scale + waveY
    };
  }

  if (family === 'synaptic_web') {
    // Multi-neuronal microcircuit synchronization:
    // - Presynaptic Axons (0..15): bio-electric depolarization wave moving along feeders
    // - Synaptic Clefts & Active Zones (16..27): quantal transmitter exocytosis burst oscillation
    // - Postsynaptic Density & Dendritic Arbors (28..51): postsynaptic excitatory potential (EPSP) ripple
    const bioSpeed = elapsed * 0.0026;
    let waveX = 0;
    let waveY = 0;

    if (index < 16) {
      // Presynaptic feeders: forward depolarization wave toward the cleft
      const axPhase = (rawCoord.x + rawCoord.y) * 8.0 - bioSpeed * 2.2;
      const spike = Math.sin(axPhase) * 0.008 * scale;
      waveX = spike * 0.7;
      waveY = spike * 0.7;
    } else if (index < 28) {
      // Synaptic cleft & active zones: localized quantal vesicle release surge
      const burstPhase = bioSpeed * 3.0 + (index % 3) * 1.5;
      const burst = Math.sin(burstPhase) * 0.009 * scale;
      waveX = burst * 0.5;
      waveY = burst;
    } else {
      // Postsynaptic spines & dendritic arbors: EPSP graded propagation
      const epspPhase = (rawCoord.x - rawCoord.y) * 6.0 - bioSpeed * 1.6;
      const epsp = Math.sin(epspPhase) * 0.007 * scale;
      waveX = epsp * 0.6;
      waveY = epsp * 0.4;
    }

    return {
      x: centerX + rawCoord.x * scale + waveX,
      y: centerY + rawCoord.y * scale + waveY
    };
  }

  if (family === 'knowledge_graph') {
    // Multi-tier knowledge graph synchronization:
    // - Primary Concept Hubs (0..11): stable epistemic radial breathing resonance
    // - Regional Entity Clusters (12..29): orbital semantic query oscillation
    // - Trans-domain loops & Distal Fact Leaves (30..53): continuous epistemic pulse along query pathways
    const graphSpeed = elapsed * 0.0022;
    let waveX = 0;
    let waveY = 0;

    if (index < 12) {
      // Hub core and satellites: synchronized epistemic breathing pulse
      const hubIdx = Math.floor(index / 4);
      const hubPulse = Math.sin(graphSpeed * 2.2 + hubIdx * 2.0) * 0.005 * scale;
      waveX = hubPulse * 0.7;
      waveY = hubPulse * 0.7;
    } else if (index < 30) {
      // Intermediate entity clusters: orbital harmonic query phase
      const clusterPhase = (rawCoord.x * 7.0 + rawCoord.y * 5.0) - graphSpeed * 2.5;
      const cPulse = Math.sin(clusterPhase) * 0.007 * scale;
      waveX = cPulse * 0.6;
      waveY = cPulse * 0.8;
    } else {
      // Fact leaves and trans-domain query loops: continuous query flow
      const queryPhase = (rawCoord.x - rawCoord.y) * 8.0 - graphSpeed * 3.2;
      const qFlow = Math.sin(queryPhase) * 0.008 * scale;
      waveX = qFlow * 0.8;
      waveY = qFlow * 0.5;
    }

    return {
      x: centerX + rawCoord.x * scale + waveX,
      y: centerY + rawCoord.y * scale + waveY
    };
  }

  if (family === 'infinity_loop') {
    // 3D Lemniscate continuous circulation synchronization:
    // Coordinates follow dynamic lemniscate flow and harmonic vibration:
    // - Backbone particles (0..31): flow smoothly along continuous lemniscate orbit
    // - Inner counter-stream (32..43): retrograde phase modulation
    // - Central crossover junction (44..51): energetic radial breathing pulse
    const loopSpeed = elapsed * 0.0018;
    let waveX = 0;
    let waveY = 0;

    if (index < 32) {
      // Primary backbone: traveling harmonic wave along loop perimeter
      const pathPhase = (index / 32) * Math.PI * 2 + loopSpeed * 1.5;
      const waveAmt = Math.sin(pathPhase * 2.0) * 0.006 * scale;
      waveX = waveAmt * Math.cos(pathPhase);
      waveY = waveAmt * Math.sin(pathPhase) * 0.6;
    } else if (index < 44) {
      // Inner braided counter-stream: counter-circulation oscillation
      const counterPhase = (index / 12) * Math.PI * 2 - loopSpeed * 2.0;
      const waveAmt = Math.cos(counterPhase * 2.0) * 0.007 * scale;
      waveX = waveAmt * 0.7;
      waveY = waveAmt * 0.9;
    } else {
      // Central crossover junction: breathing energy flux
      const pulsePhase = loopSpeed * 3.2 + index * 0.8;
      const junctionPulse = Math.sin(pulsePhase) * 0.008 * scale;
      waveX = junctionPulse * 0.8;
      waveY = junctionPulse * 0.8;
    }

    const cosR = Math.cos(-Math.PI / 4);
    const sinR = Math.sin(-Math.PI / 4);
    const rotWaveX = waveX * cosR - waveY * sinR;
    const rotWaveY = waveX * sinR + waveY * cosR;

    return {
      x: centerX + rawCoord.x * scale + rotWaveX,
      y: centerY + rawCoord.y * scale + rotWaveY
    };
  }

  if (family === 'intelligence_crystal') {
    // 3D Polyhedral Intelligence Crystal lockstep synchronization:
    // - Outer shell vertices (0..19): subtle crystalline facet breathing tension
    // - Inner octahedral core (20..33): high-frequency quantum refraction vibration
    // - Ridge midpoints & optical junctions (34..53): traveling prismatic flux wave
    let waveX = 0;
    let waveY = 0;

    if (index < 20) {
      // Outer shell vertices: breathing tension along facet normal
      const pulsePhase = elapsed * 0.0016 + index * 0.4;
      const breathe = Math.sin(pulsePhase) * 0.004 * scale;
      waveX = breathe * Math.cos(pulsePhase);
      waveY = breathe * Math.sin(pulsePhase) * 0.8;
    } else if (index < 34) {
      // Inner core octahedral lattice: quantum nucleus vibration
      const corePhase = elapsed * 0.0028 + index * 0.7;
      const corePulse = Math.cos(corePhase) * 0.005 * scale;
      waveX = corePulse * 0.7;
      waveY = corePulse * 0.9;
    } else {
      // Prismatic ridge midpoints: traveling edge flux wave
      const edgePhase = elapsed * 0.0022 - index * 0.5;
      const edgePulse = Math.sin(edgePhase) * 0.004 * scale;
      waveX = edgePulse * 0.6;
      waveY = edgePulse * 0.8;
    }

    return {
      x: centerX + rawCoord.x * scale + waveX,
      y: centerY + rawCoord.y * scale + waveY
    };
  }

  if (family === 'geometric_mandala') {
    // Multi-tier radial mandala lockstep synchronization:
    // - Core Seed (0..5): subtle central breathing resonance
    // - Interlocking Star (6..17): harmonic rotational orbital oscillation
    // - Intermediate Lotus Ring (18..35): counter-phase petal breathing wave
    // - Outer Cosmic Perimeter (36..53): traveling perimeter gate flux wave
    let waveX = 0;
    let waveY = 0;

    if (index < 6) {
      // Core seed: subtle radial expansion/contraction pulse
      const pulsePhase = elapsed * 0.0028 + index * 1.0;
      const breathe = Math.sin(pulsePhase) * 0.004 * scale;
      waveX = breathe * Math.cos(pulsePhase);
      waveY = breathe * Math.sin(pulsePhase);
    } else if (index < 18) {
      // Interlocking star vertices: rotational harmonic oscillation
      const starPhase = elapsed * 0.0020 + index * 0.5;
      const starPulse = Math.cos(starPhase) * 0.005 * scale;
      waveX = starPulse * 0.7;
      waveY = starPulse * 0.7;
    } else if (index < 36) {
      // Intermediate lotus petals: counter-phase breathing wave
      const petalPhase = elapsed * 0.0018 - index * 0.35;
      const petalPulse = Math.sin(petalPhase) * 0.005 * scale;
      waveX = petalPulse * 0.6;
      waveY = petalPulse * 0.8;
    } else {
      // Outer perimeter gates: traveling ripple wave
      const gatePhase = elapsed * 0.0022 + index * 0.4;
      const gatePulse = Math.sin(gatePhase) * 0.004 * scale;
      waveX = gatePulse * 0.8;
      waveY = gatePulse * 0.6;
    }

    return {
      x: centerX + rawCoord.x * scale + waveX,
      y: centerY + rawCoord.y * scale + waveY
    };
  }

  // Fallback for procedural formations
  return {
    x: centerX + rawCoord.x * scale,
    y: centerY + rawCoord.y * scale
  };
}

export function renderFormationDetailEngine(
  family: string,
  options: FormationDetailRenderOptions
): boolean {
  switch (family) {
    case 'dna_helix':
      renderDnaDetailLayer(options);
      return true;
    case 'galaxy_spiral':
      renderGalaxyDetailLayer(options);
      return true;
    case 'nebula':
      renderNebulaDetailLayer(options);
      return true;
    case 'atomic_orbitals':
      renderAtomicOrbitalsDetailLayer(options);
      return true;
    case 'black_hole_vortex':
      renderBlackHoleVortexDetailLayer(options);
      return true;
    case 'knowledge_constellation':
      renderKnowledgeConstellationDetailLayer(options);
      return true;
    case 'orbital_system':
      renderOrbitalSystemDetailLayer(options);
      return true;
    case 'cortex_brain':
      renderCortexDetailLayer(options);
      return true;
    case 'neural_network':
      renderNeuralNetworkDetailLayer(options);
      return true;
    case 'neural_synapse':
      renderSynapseDetailLayer(options);
      return true;
    case 'single_neuron':
      renderSingleNeuronDetailLayer(options);
      return true;
    case 'synaptic_web':
      renderSynapticWebDetailLayer(options);
      return true;
    case 'knowledge_graph':
      renderKnowledgeGraphDetailLayer(options);
      return true;
    case 'infinity_loop':
      renderInfinityLoopDetailLayer(options);
      return true;
    case 'intelligence_crystal':
      renderIntelligenceCrystalDetailLayer(options);
      return true;
    case 'geometric_mandala':
      renderGeometricMandalaDetailLayer(options);
      return true;
    default:
      return false;
  }
}

export {
  renderDnaDetailLayer,
  renderGalaxyDetailLayer,
  renderNebulaDetailLayer,
  renderAtomicOrbitalsDetailLayer,
  renderBlackHoleVortexDetailLayer,
  renderKnowledgeConstellationDetailLayer,
  renderOrbitalSystemDetailLayer,
  renderCortexDetailLayer,
  renderSynapseDetailLayer,
  renderNeuralNetworkDetailLayer,
  renderSingleNeuronDetailLayer,
  renderSynapticWebDetailLayer,
  renderKnowledgeGraphDetailLayer,
  renderInfinityLoopDetailLayer,
  renderIntelligenceCrystalDetailLayer,
  renderGeometricMandalaDetailLayer
};
