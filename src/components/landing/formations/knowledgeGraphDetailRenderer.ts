/**
 * ============================================================================
 * JARVIS FORMATION #12: KNOWLEDGE GRAPH DETAIL RENDERER
 * ============================================================================
 * High-density Canvas 2D detail layer for Formation #12 (Knowledge Graph).
 *
 * Distinct Epistemic Concept Topology:
 * 1. Visual & Conceptual Distinction:
 *    - Distinct from #08 Neural Network (layered feedforward computational matrices).
 *    - Distinct from #10 Single Neuron (single multipolar cell with soma and neurites).
 *    - Distinct from #11 Synaptic Web (biological clefts, neurotransmitters, vesicle pools).
 *    - Distinct from #05 Knowledge Constellation (sparse celestial star-map).
 *    - Knowledge Graph represents an interconnected ontological knowledge network:
 *      dense concept clusters, semantic entity hubs, hierarchical concept tiers,
 *      directed relations (with distinct arrow/pulse vectors), cross-cluster bridges,
 *      and factual attribute nodes.
 *
 * 2. Multi-Tier Semantic Hierarchy & Hubs:
 *    - 3 Major Conceptual Hubs:
 *      * Hub Alpha (Core Ontology / Reasoning): x = -0.06, y = -0.04, radius = 0.13
 *      * Hub Beta (Empirical Data / World Knowledge): x = 0.17, y = -0.16, radius = 0.10
 *      * Hub Gamma (Action / Executive Synthesis): x = -0.14, y = 0.18, radius = 0.09
 *    - Dense local cluster halos around hubs (entity nodes, property leaves).
 *    - Long-range semantic relationship bridges connecting disparate concept domains.
 *
 * 3. Varied Directed & Undirected Semantic Relations:
 *    - Primary ontological backbone relations (heavy structural graph edges).
 *    - Directed semantic relation filaments with dynamic information pulses.
 *    - Fine relational sub-graphs and factual attribute linkages (>= 4 filaments).
 *
 * 4. Volumetric Detail Point Budget (~3,350 micro-points):
 *    - Major Concept Hub Kernels & Semantic Nuclei (~650 points)
 *    - Clustered Entity & Concept Sub-Nodes (~950 points)
 *    - Relational Edge Pulse Streams & Flow Vectors (~1,050 points)
 *    - Factual Attribute Clouds & Fine Epistemic Leaves (~700 points)
 *    Total: ~3,350 micro-points.
 *
 * Guarantees:
 * - 100% deterministic (zero Math.random() in executable code, closed-form trigonometric formulas).
 * - Zero draw operations when inactive (progress <= 0.02).
 * - >= 2,500 volumetric micro-points & >= 4 structural filaments when active.
 * - Full color theme support across single-hue and multicolor palettes.
 * ============================================================================
 */

export interface KnowledgeGraphRenderOptions {
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

export function renderKnowledgeGraphDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: KnowledgeGraphRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // Semantic query cycle speed & propagation phase clock
  const graphSpeed = elapsed * 0.0022;

  // Theme palettes: Crisp epistemic network colors
  const primaryHue = isMulticolor ? 195 : baseHue; // Cyan / Electric blue core
  const hubHue = isMulticolor ? 45 : (highlightHue ?? baseHue); // Amber/Gold conceptual hubs
  const entityHue = isMulticolor ? 165 : baseHue; // Emerald/Mint entity nodes
  const relationHue = isMulticolor ? 280 : (highlightHue ?? baseHue); // Violet/Purple relationship bridges
  const leafHue = isMulticolor ? 220 : baseHue; // Cobalt factual attribute leaves

  // Coordinate projection helper
  const project = (normX: number, normY: number, normZ = 0) => ({
    x: centerX + normX * scale,
    y: centerY + normY * scale,
    z: normZ
  });

  // ---------------------------------------------------------------------------
  // 1. CONCEPT HUBS & KERNEL GRADIENTS (3 Major Epistemic Hubs)
  // ---------------------------------------------------------------------------
  const conceptHubs = [
    { x: -0.06, y: -0.04, radius: 0.13, weight: 1.0, labelHue: hubHue },
    { x: 0.17, y: -0.16, radius: 0.10, weight: 0.88, labelHue: isMulticolor ? 285 : hubHue },
    { x: -0.14, y: 0.18, radius: 0.09, weight: 0.82, labelHue: isMulticolor ? 160 : hubHue }
  ];

  ctx.save();

  // A. Luminous Concept Hub Energy Fields
  for (let h = 0; h < conceptHubs.length; h++) {
    const hub = conceptHubs[h];
    const hubScr = project(hub.x, hub.y);
    const rScr = hub.radius * scale;
    const pulseIntensity = 0.72 + 0.28 * Math.sin(graphSpeed * 2.2 + h * 2.0);
    const hubAlpha = masterAlpha * 0.38 * hub.weight * pulseIntensity;

    const hubGlow = ctx.createRadialGradient(
      hubScr.x, hubScr.y, 0,
      hubScr.x, hubScr.y, rScr
    );
    hubGlow.addColorStop(0, `hsla(${hub.labelHue}, 100%, 92%, ${hubAlpha})`);
    hubGlow.addColorStop(0.35, `hsla(${isMulticolor ? 200 : baseHue}, 95%, 72%, ${hubAlpha * 0.6})`);
    hubGlow.addColorStop(0.7, `hsla(${primaryHue}, 85%, 55%, ${hubAlpha * 0.2})`);
    hubGlow.addColorStop(1, `hsla(${primaryHue}, 80%, 40%, 0)`);

    ctx.fillStyle = hubGlow;
    ctx.beginPath();
    ctx.arc(hubScr.x, hubScr.y, rScr, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // 2. STRUCTURAL RELATION FILAMENTS (Ontological Edges & Cross-Domain Bridges)
  // >= 4 structural filaments required
  // We draw 14 distinct structural pathways:
  // - 3 primary cross-hub backbone relations (inter-cluster bridges)
  // - 6 regional cluster spine relations (sub-concept spokes)
  // - 5 directed ontology query paths with gradient flow
  // ---------------------------------------------------------------------------
  ctx.lineWidth = Math.max(1.3, scale * 0.0022);

  // Filament 1-3: Inter-Cluster Hub Bridges (Triangular Semantic Core)
  const hubBridges = [
    { from: { x: -0.06, y: -0.04 }, to: { x: 0.17, y: -0.16 }, c: { x: 0.05, y: -0.12 } },
    { from: { x: -0.06, y: -0.04 }, to: { x: -0.14, y: 0.18 }, c: { x: -0.12, y: 0.06 } },
    { from: { x: 0.17, y: -0.16 }, to: { x: -0.14, y: 0.18 }, c: { x: 0.04, y: 0.04 } }
  ];

  for (let b = 0; b < hubBridges.length; b++) {
    const bridge = hubBridges[b];
    const p0 = project(bridge.from.x, bridge.from.y);
    const p1 = project(bridge.to.x, bridge.to.y);
    const pc = project(bridge.c.x, bridge.c.y);

    const bHue = isMulticolor ? (relationHue + b * 20) : (highlightHue ?? baseHue);
    ctx.strokeStyle = `hsla(${bHue}, 95%, 78%, ${masterAlpha * 0.58})`;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(pc.x, pc.y, p1.x, p1.y);
    ctx.stroke();
  }

  // Filament 4-9: Regional Entity Cluster Radiating Edges
  const regionalSpokes = [
    // Hub Alpha Outward Hierarchical Relations
    { from: { x: -0.06, y: -0.04 }, to: { x: -0.26, y: -0.16 }, c: { x: -0.17, y: -0.12 } },
    { from: { x: -0.06, y: -0.04 }, to: { x: -0.22, y: 0.02 }, c: { x: -0.15, y: -0.01 } },
    // Hub Beta Outward Hierarchical Relations
    { from: { x: 0.17, y: -0.16 }, to: { x: 0.32, y: -0.26 }, c: { x: 0.26, y: -0.22 } },
    { from: { x: 0.17, y: -0.16 }, to: { x: 0.30, y: -0.04 }, c: { x: 0.25, y: -0.10 } },
    // Hub Gamma Outward Hierarchical Relations
    { from: { x: -0.14, y: 0.18 }, to: { x: -0.28, y: 0.29 }, c: { x: -0.22, y: 0.25 } },
    { from: { x: -0.14, y: 0.18 }, to: { x: 0.06, y: 0.28 }, c: { x: -0.03, y: 0.25 } }
  ];

  ctx.lineWidth = Math.max(1.1, scale * 0.0018);
  for (let s = 0; s < regionalSpokes.length; s++) {
    const spoke = regionalSpokes[s];
    const p0 = project(spoke.from.x, spoke.from.y);
    const p1 = project(spoke.to.x, spoke.to.y);
    const pc = project(spoke.c.x, spoke.c.y);

    const sHue = isMulticolor ? (entityHue + s * 12) : baseHue;
    ctx.strokeStyle = `hsla(${sHue}, 90%, 70%, ${masterAlpha * 0.42})`;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(pc.x, pc.y, p1.x, p1.y);
    ctx.stroke();
  }

  // Filament 10-14: Trans-Domain Semantic Query Arcs (Directed Relational Loops)
  const queryLoops = [
    { from: { x: -0.26, y: -0.16 }, to: { x: 0.02, y: -0.30 }, c: { x: -0.11, y: -0.27 } },
    { from: { x: 0.02, y: -0.30 }, to: { x: 0.32, y: -0.26 }, c: { x: 0.18, y: -0.31 } },
    { from: { x: 0.30, y: -0.04 }, to: { x: 0.22, y: 0.18 }, c: { x: 0.28, y: 0.08 } },
    { from: { x: 0.22, y: 0.18 }, to: { x: 0.06, y: 0.28 }, c: { x: 0.15, y: 0.25 } },
    { from: { x: -0.28, y: 0.29 }, to: { x: -0.22, y: 0.02 }, c: { x: -0.27, y: 0.15 } }
  ];

  ctx.lineWidth = Math.max(1.0, scale * 0.0015);
  for (let q = 0; q < queryLoops.length; q++) {
    const loop = queryLoops[q];
    const p0 = project(loop.from.x, loop.from.y);
    const p1 = project(loop.to.x, loop.to.y);
    const pc = project(loop.c.x, loop.c.y);

    const qHue = isMulticolor ? (primaryHue + q * 15) : baseHue;
    ctx.strokeStyle = `hsla(${qHue}, 85%, 68%, ${masterAlpha * 0.36})`;
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
  // - A. Concept Hub Kernels & Core Ontological Entities: 650 points
  // - B. Clustered Entity & Property Sub-Nodes: 950 points
  // - C. Relational Edge Pulse Streams & Flow Vectors: 1,050 points
  // - D. Factual Attribute Clouds & Leaf Property Tokens: 700 points
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

  // A. CONCEPT HUB KERNELS & CORE ONTOLOGICAL ENTITIES (650 points)
  // Concentrated micro-rings and central node clusters at the 3 hubs
  for (let i = 0; i < 650; i++) {
    const hubIdx = i % conceptHubs.length;
    const hub = conceptHubs[hubIdx];
    const t = i / 649;
    // Deterministic polar rings inside the concept hub core
    const ringAngle = (t * Math.PI * 2 * 11.4 + hubIdx * 2.1) % (Math.PI * 2);
    const ringRadius = 0.012 + ((i * 17) % 31) * 0.0015;

    const x = hub.x + Math.cos(ringAngle) * ringRadius;
    const y = hub.y + Math.sin(ringAngle) * ringRadius * 0.9;
    const z = Math.sin(i * 1.5 + hubIdx) * 0.04;

    const isCoreNode = (i % 7 === 0);
    const kHue = isMulticolor ? (hub.labelHue + (i % 20 - 10)) : (highlightHue ?? baseHue);

    microPoints.push({
      x,
      y,
      z,
      hue: isCoreNode ? (isMulticolor ? 50 : (highlightHue ?? baseHue)) : kHue,
      size: isCoreNode ? 1.5 : (0.80 + (i % 3) * 0.35),
      alphaMult: isCoreNode ? 1.3 : 0.88,
      glow: isCoreNode
    });
  }

  // B. CLUSTERED ENTITY & PROPERTY SUB-NODES (950 points)
  // Localized satellite clusters orbiting the 3 major conceptual domains
  // Plus intermediate hierarchy tier clusters
  const clusterCenters = [
    { x: -0.26, y: -0.16, r: 0.038, hue: isMulticolor ? 170 : baseHue },
    { x: -0.22, y: 0.02, r: 0.035, hue: isMulticolor ? 185 : baseHue },
    { x: 0.02, y: -0.30, r: 0.032, hue: isMulticolor ? 210 : baseHue },
    { x: 0.32, y: -0.26, r: 0.040, hue: isMulticolor ? 290 : baseHue },
    { x: 0.30, y: -0.04, r: 0.036, hue: isMulticolor ? 310 : baseHue },
    { x: 0.22, y: 0.18, r: 0.034, hue: isMulticolor ? 140 : baseHue },
    { x: 0.06, y: 0.28, r: 0.038, hue: isMulticolor ? 155 : baseHue },
    { x: -0.28, y: 0.29, r: 0.035, hue: isMulticolor ? 165 : baseHue }
  ];

  for (let i = 0; i < 950; i++) {
    const cIdx = i % clusterCenters.length;
    const cluster = clusterCenters[cIdx];

    // Deterministic distribution inside entity cluster radius
    const rFrac = Math.sqrt(((i * 41) % 1000) / 1000.0) * cluster.r;
    const theta = ((i * 79) % 1000) * 0.001 * Math.PI * 2;

    // Epistemic orbital resonance pulse
    const pulseOffset = Math.sin(graphSpeed * 2.8 + i * 0.3) * 0.0025;
    const ex = cluster.x + Math.cos(theta) * (rFrac + pulseOffset);
    const ey = cluster.y + Math.sin(theta) * (rFrac + pulseOffset) * 0.88;
    const ez = Math.cos(i * 2.1) * 0.035;

    const isSubHub = (i % 9 === 0);
    const eHue = isMulticolor ? (cluster.hue + ((i * 5) % 25 - 12)) : baseHue;

    microPoints.push({
      x: ex,
      y: ey,
      z: ez,
      hue: isSubHub ? (highlightHue ?? baseHue) : eHue,
      size: isSubHub ? 1.35 : (0.75 + (i % 4) * 0.30),
      alphaMult: 0.92 + 0.32 * Math.sin(graphSpeed * 2.4 + i),
      glow: (i % 14 === 0)
    });
  }

  // C. RELATIONAL EDGE PULSE STREAMS & FLOW VECTORS (1,050 points)
  // Packets of knowledge, queries, and semantic flow traveling along edges
  // We model flow along 8 core relational conduits
  const conduits = [
    // Conduits between hubs
    { from: { x: -0.06, y: -0.04 }, to: { x: 0.17, y: -0.16 }, flowDir: 1 },
    { from: { x: 0.17, y: -0.16 }, to: { x: -0.14, y: 0.18 }, flowDir: -1 },
    { from: { x: -0.14, y: 0.18 }, to: { x: -0.06, y: -0.04 }, flowDir: 1 },
    // Conduits to peripheral clusters
    { from: { x: -0.06, y: -0.04 }, to: { x: -0.26, y: -0.16 }, flowDir: 1 },
    { from: { x: -0.06, y: -0.04 }, to: { x: -0.22, y: 0.02 }, flowDir: 1 },
    { from: { x: 0.17, y: -0.16 }, to: { x: 0.32, y: -0.26 }, flowDir: 1 },
    { from: { x: 0.17, y: -0.16 }, to: { x: 0.30, y: -0.04 }, flowDir: 1 },
    { from: { x: -0.14, y: 0.18 }, to: { x: 0.06, y: 0.28 }, flowDir: 1 }
  ];

  for (let i = 0; i < 1050; i++) {
    const cIdx = i % conduits.length;
    const cond = conduits[cIdx];

    // Position along edge with deterministic continuous velocity
    const speedRate = 0.35 + (cIdx % 3) * 0.15;
    const baseT = (((i * 47) % 1000) / 1000.0);
    const flowT = (baseT + (graphSpeed * speedRate * cond.flowDir)) % 1.0;
    const posT = flowT < 0 ? flowT + 1.0 : flowT;

    // Slight lateral dispersion across the edge bundle
    const normalOffset = (((i * 23) % 1000) / 1000.0 - 0.5) * 0.012;
    const dx = cond.to.x - cond.from.x;
    const dy = cond.to.y - cond.from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const rx = cond.from.x + dx * posT + nx * normalOffset;
    const ry = cond.from.y + dy * posT + ny * normalOffset;
    const rz = Math.sin(posT * Math.PI * 2 + i) * 0.03;

    // Directed pulse intensity (bright wavefront along pulse position)
    const pulsePhase = Math.sin(posT * Math.PI * 4 - graphSpeed * 4.0);
    const isPulseFront = pulsePhase > 0.85;

    const rHue = isMulticolor
      ? (primaryHue + ((i * 11) % 50 - 25))
      : (isPulseFront ? (highlightHue ?? baseHue) : baseHue);

    microPoints.push({
      x: rx,
      y: ry,
      z: rz,
      hue: rHue,
      size: isPulseFront ? 1.4 : (0.70 + (i % 3) * 0.32),
      alphaMult: isPulseFront ? 1.35 : (0.85 + 0.3 * Math.sin(posT * Math.PI)),
      glow: isPulseFront
    });
  }

  // D. FACTUAL ATTRIBUTE CLOUDS & FINE EPISTEMIC LEAVES (700 points)
  // Micro-details representing leaf facts, ontology properties, and contextual metadata
  for (let i = 0; i < 700; i++) {
    // Distributed outward around the perimeter of the knowledge graph
    const t = i / 699;
    const baseAngle = t * Math.PI * 2 * 3.7;
    const distR = 0.22 + (((i * 33) % 100) / 100.0) * 0.12;

    // Modulate radius by quadrant to form organic polygon bounding envelope
    const polyShape = 1.0 + 0.15 * Math.sin(baseAngle * 3) + 0.08 * Math.cos(baseAngle * 5);
    const fx = Math.cos(baseAngle) * distR * polyShape;
    const fy = Math.sin(baseAngle) * distR * polyShape * 0.92;
    const fz = Math.cos(i * 1.8) * 0.04;

    const isLiteralVal = (i % 11 === 0);
    const lHue = isMulticolor
      ? (leafHue + ((i * 7) % 35 - 15))
      : (isLiteralVal ? (highlightHue ?? baseHue) : baseHue);

    microPoints.push({
      x: fx,
      y: fy,
      z: fz,
      hue: lHue,
      size: 0.70 + (i % 3) * 0.30,
      alphaMult: 0.78 + 0.25 * Math.sin(graphSpeed * 2.0 + i * 0.5),
      glow: isLiteralVal
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
      ? masterAlpha * (0.64 + pt.z * 0.36)
      : masterAlpha * (0.30 + (pt.z + 1) * 0.20);

    const finalAlpha = Math.min(1.0, baseAlpha * pt.alphaMult);
    const renderR = Math.max(0.65, pt.size + (isForeground ? pt.z * 0.4 : 0));

    // Luminous halo for active entity hubs and query pulses
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
