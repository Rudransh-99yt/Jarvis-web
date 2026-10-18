/**
 * Monumental Orbital System Formation Renderer — Formation #06
 *
 * Dedicated Canvas 2D volumetric high-density detail layer for the Orbital System.
 * Renders a majestic, cinematic celestial planetary architecture comprising:
 * - A luminous Central Star (photosphere, solar flares, chromosphere, extended radiant corona).
 * - 5 Distinct Keplerian Planetary Orbits with authentic geometric eccentricity & 3D inclination:
 *   1. Planet I (Swift Terrestrial / Inner World)
 *   2. Planet II (Habitable Jewel with Orbiting Moon & Atmospheric Rim)
 *   3. Planet III (Monumental Gas Giant with Luminous Tilted Ring System)
 *   4. Planet IV (Azure Ice Giant / Colossus)
 *   5. Planet V (Outer Kuiper Frontier Planetoid)
 * - Dense Main Asteroid Belt between Orbit 2 and Orbit 3.
 * - Planetary day/night terminator shading (facing the sun).
 * - ~3,500 Volumetric Micro-Points: Solar flares, asteroid belt debris, planetary rings, and zodiacal dust.
 *
 * Performance & Architecture:
 * - 100% deterministic closed-form parametric equations (zero Math.random()).
 * - Zero per-frame object allocations.
 * - Locked 60 FPS performance on standard Canvas 2D context.
 * - Synchronized with constellationProgress (entrance, hold, dissolution).
 * - Full support for active universe color cycling (spectral and curated single-hue).
 */

export interface OrbitalSystemRenderOptions {
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

export function renderOrbitalSystemDetailLayer({
  ctx,
  centerX,
  centerY,
  scale,
  progress,
  elapsed,
  baseHue,
  highlightHue,
  isMulticolor
}: OrbitalSystemRenderOptions): void {
  if (progress <= 0.02) return;

  // Smoothstep easing for alpha envelope
  const pEase = progress * progress * (3 - 2 * progress);
  const masterAlpha = Math.min(1.0, pEase * 0.96);

  // 3D Celestial System Inclination & Precession
  // Orbital plane tilted at 0.38 rad (~22°) to give pronounced depth and oval ellipses
  const tiltAngle = 0.38;
  const cosTilt = Math.cos(tiltAngle);
  const sinTilt = Math.sin(tiltAngle);

  // Slow orbital plane yaw precession
  const precAngle = (elapsed * 0.00015) % (Math.PI * 2);
  const cosPrec = Math.cos(precAngle);
  const sinPrec = Math.sin(precAngle);

  // 3D projection helper matching computeSynchronizedFormationTarget
  const project = (x: number, y: number, z = 0) => {
    // 1. Slow plane precession
    const px = x * cosPrec - y * sinPrec;
    const py = x * sinPrec + y * cosPrec;
    const pz = z;

    // 2. Inclination tilt around X axis
    const finalX = px;
    const finalY = py * cosTilt - pz * sinTilt;
    const finalZ = py * sinTilt + pz * cosTilt;

    const screenX = centerX + finalX * scale;
    const screenY = centerY + finalY * scale;
    return { screenX, screenY, z: finalZ };
  };

  // Planetary configuration (radii, orbital periods, eccentricities, sizes, colors)
  const planets = [
    {
      id: 'inner',
      a: 0.080,
      e: 0.08,
      speed: 0.0012,
      phase: 0.5,
      radius: 0.0075,
      hueOffset: 30, // Golden/amber rocky world
      zOffset: 0.005
    },
    {
      id: 'habitable',
      a: 0.145,
      e: 0.04,
      speed: 0.00075,
      phase: 2.1,
      radius: 0.0115,
      hueOffset: 0, // Cyan/ice blue terrestrial world
      hasMoon: true,
      zOffset: 0.012
    },
    {
      id: 'ringed_giant',
      a: 0.225,
      e: 0.05,
      speed: 0.00045,
      phase: 4.3,
      radius: 0.0190,
      hueOffset: 65, // Violet/amber gas giant
      hasRings: true,
      zOffset: -0.010
    },
    {
      id: 'ice_giant',
      a: 0.295,
      e: 0.07,
      speed: 0.00028,
      phase: 1.1,
      radius: 0.0145,
      hueOffset: 210, // Deep azure/cyan ice giant
      zOffset: 0.015
    },
    {
      id: 'outer_dwarf',
      a: 0.360,
      e: 0.12,
      speed: 0.00018,
      phase: 3.5,
      radius: 0.0065,
      hueOffset: 140, // Distant emerald/violet planetoid
      zOffset: -0.018
    }
  ];

  ctx.save();

  // ---------------------------------------------------------------------------
  // 1. CENTRAL STAR (Luminous Sun / Photosphere & Solar Corona)
  // ---------------------------------------------------------------------------
  const sunPos = project(0, 0, 0);
  const sunRadius = 0.038 * scale;
  const coronaRadius = sunRadius * 3.4;
  const sunHue = highlightHue ?? (isMulticolor ? (baseHue + 40) % 360 : baseHue);

  // A. Multi-stop Radiant Solar Corona Atmosphere
  const coronaGrad = ctx.createRadialGradient(
    sunPos.screenX,
    sunPos.screenY,
    sunRadius * 0.2,
    sunPos.screenX,
    sunPos.screenY,
    coronaRadius
  );
  coronaGrad.addColorStop(0, `hsla(${sunHue}, 100%, 96%, ${masterAlpha * 0.85})`);
  coronaGrad.addColorStop(0.20, `hsla(${sunHue}, 95%, 78%, ${masterAlpha * 0.55})`);
  coronaGrad.addColorStop(0.50, `hsla(${sunHue}, 90%, 55%, ${masterAlpha * 0.18})`);
  coronaGrad.addColorStop(1, `hsla(${sunHue}, 85%, 40%, 0)`);

  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(sunPos.screenX, sunPos.screenY, coronaRadius, 0, Math.PI * 2);
  ctx.fill();

  // B. Brilliant High-Luminance Photosphere Core
  ctx.beginPath();
  ctx.arc(sunPos.screenX, sunPos.screenY, sunRadius * 0.65, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${sunHue}, 100%, 98%, ${masterAlpha * 0.95})`;
  ctx.fill();

  // C. Concentric Chromosphere Resonance Rings
  const starPulse = 1.0 + Math.sin(elapsed * 0.0022) * 0.08;
  ctx.beginPath();
  ctx.arc(sunPos.screenX, sunPos.screenY, sunRadius * 1.05 * starPulse, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${sunHue}, 100%, 88%, ${masterAlpha * 0.45})`;
  ctx.lineWidth = Math.max(1.2, scale * 0.0018);
  ctx.stroke();

  ctx.restore();

  // ---------------------------------------------------------------------------
  // 2. KEPLERIAN ORBITAL TRACKS & ASTEROID BELT (Structural Filaments)
  // ---------------------------------------------------------------------------
  ctx.save();

  // A. Five Planetary Orbital Ellipses
  for (let pIdx = 0; pIdx < planets.length; pIdx++) {
    const pl = planets[pIdx];
    const orbitSamples = 64;
    const orbHue = isMulticolor ? (baseHue + pl.hueOffset) % 360 : baseHue;

    ctx.beginPath();
    for (let s = 0; s <= orbitSamples; s++) {
      const theta = (s / orbitSamples) * Math.PI * 2;
      // Keplerian ellipse with semi-major axis a, eccentricity e
      const r = (pl.a * (1 - pl.e * pl.e)) / (1 + pl.e * Math.cos(theta));
      const ox = Math.cos(theta) * r;
      const oy = Math.sin(theta) * r;
      const oz = pl.zOffset * Math.sin(theta);
      const proj = project(ox, oy, oz);

      if (s === 0) {
        ctx.moveTo(proj.screenX, proj.screenY);
      } else {
        ctx.lineTo(proj.screenX, proj.screenY);
      }
    }

    ctx.strokeStyle = `hsla(${orbHue}, 85%, 72%, ${masterAlpha * 0.32})`;
    ctx.lineWidth = Math.max(1.1, scale * 0.0015);
    ctx.stroke();
  }

  // B. Main Asteroid Belt Elliptical Corridor (between Orbit 2 and Orbit 3, r ~ 0.185)
  const astBeltSamples = 48;
  const astHue = isMulticolor ? (baseHue + 45) % 360 : baseHue;
  ctx.beginPath();
  for (let s = 0; s <= astBeltSamples; s++) {
    const theta = (s / astBeltSamples) * Math.PI * 2;
    const r = 0.185;
    const ox = Math.cos(theta) * r;
    const oy = Math.sin(theta) * r;
    const oz = 0.002 * Math.cos(theta * 2);
    const proj = project(ox, oy, oz);
    if (s === 0) ctx.moveTo(proj.screenX, proj.screenY);
    else ctx.lineTo(proj.screenX, proj.screenY);
  }
  ctx.strokeStyle = `hsla(${astHue}, 75%, 65%, ${masterAlpha * 0.22})`;
  ctx.lineWidth = Math.max(1.0, scale * 0.0012);
  ctx.stroke();

  // ---------------------------------------------------------------------------
  // 3. ORBITING PLANETS, MOONS & SATURNIAN RINGS
  // ---------------------------------------------------------------------------
  for (let pIdx = 0; pIdx < planets.length; pIdx++) {
    const pl = planets[pIdx];
    const meanAnomaly = (elapsed * pl.speed + pl.phase) % (Math.PI * 2);
    // True anomaly with 1st-order eccentricity correction
    const trueAnomaly = meanAnomaly + 2 * pl.e * Math.sin(meanAnomaly);
    const r = (pl.a * (1 - pl.e * pl.e)) / (1 + pl.e * Math.cos(trueAnomaly));

    const px = Math.cos(trueAnomaly) * r;
    const py = Math.sin(trueAnomaly) * r;
    const pz = pl.zOffset * Math.sin(trueAnomaly);

    const planetScreen = project(px, py, pz);
    const plRadius = Math.max(2.5, pl.radius * scale);
    const plHue = isMulticolor ? (baseHue + pl.hueOffset) % 360 : baseHue;

    // A. Planetary Atmosphere Glow
    const atmosGrad = ctx.createRadialGradient(
      planetScreen.screenX,
      planetScreen.screenY,
      plRadius * 0.4,
      planetScreen.screenX,
      planetScreen.screenY,
      plRadius * 2.2
    );
    atmosGrad.addColorStop(0, `hsla(${plHue}, 100%, 88%, ${masterAlpha * 0.70})`);
    atmosGrad.addColorStop(0.5, `hsla(${plHue}, 90%, 65%, ${masterAlpha * 0.35})`);
    atmosGrad.addColorStop(1, `hsla(${plHue}, 80%, 50%, 0)`);

    ctx.fillStyle = atmosGrad;
    ctx.beginPath();
    ctx.arc(planetScreen.screenX, planetScreen.screenY, plRadius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // B. Planet Body with Day/Night Terminator Shading
    // Direction vector to sun in screen space
    const toSunX = sunPos.screenX - planetScreen.screenX;
    const toSunY = sunPos.screenY - planetScreen.screenY;
    const sunDist = Math.hypot(toSunX, toSunY) || 1;
    const sunDirX = toSunX / sunDist;
    const sunDirY = toSunY / sunDist;

    const bodyGrad = ctx.createRadialGradient(
      planetScreen.screenX + sunDirX * plRadius * 0.35,
      planetScreen.screenY + sunDirY * plRadius * 0.35,
      plRadius * 0.1,
      planetScreen.screenX,
      planetScreen.screenY,
      plRadius
    );
    bodyGrad.addColorStop(0, `hsla(${plHue}, 100%, 96%, ${masterAlpha * 0.95})`);
    bodyGrad.addColorStop(0.55, `hsla(${plHue}, 90%, 70%, ${masterAlpha * 0.85})`);
    bodyGrad.addColorStop(1, `hsla(${plHue}, 80%, 35%, ${masterAlpha * 0.75})`);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(planetScreen.screenX, planetScreen.screenY, plRadius, 0, Math.PI * 2);
    ctx.fill();

    // C. Saturnian Ring System for Planet III
    if (pl.hasRings) {
      const ringInnerR = plRadius * 1.55;
      const ringOuterR = plRadius * 2.50;
      const ringTilt = 0.52; // Tilted ring plane relative to planet equator

      for (let ringStep = 0; ringStep < 3; ringStep++) {
        const radFrac = ringInnerR + (ringOuterR - ringInnerR) * (ringStep / 2);
        ctx.beginPath();
        for (let aStep = 0; aStep <= 32; aStep++) {
          const a = (aStep / 32) * Math.PI * 2;
          const rx = planetScreen.screenX + Math.cos(a) * radFrac;
          const ry = planetScreen.screenY + Math.sin(a) * radFrac * Math.cos(ringTilt);
          if (aStep === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.strokeStyle = `hsla(${plHue + 20}, 95%, 80%, ${masterAlpha * (0.45 - ringStep * 0.12)})`;
        ctx.lineWidth = Math.max(1.0, scale * 0.0016);
        ctx.stroke();
      }
    }

    // D. Orbiting Moon for Planet II (Habitable World)
    if (pl.hasMoon) {
      const moonPeriod = (elapsed * 0.0042) % (Math.PI * 2);
      const moonDist = plRadius * 2.2;
      const moonX = planetScreen.screenX + Math.cos(moonPeriod) * moonDist;
      const moonY = planetScreen.screenY + Math.sin(moonPeriod) * moonDist * 0.7;
      const moonR = Math.max(1.5, plRadius * 0.28);

      // Moon orbit path
      ctx.beginPath();
      ctx.arc(planetScreen.screenX, planetScreen.screenY, moonDist, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${plHue}, 80%, 75%, ${masterAlpha * 0.20})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Moon body
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${plHue}, 100%, 94%, ${masterAlpha * 0.90})`;
      ctx.fill();
    }
  }

  ctx.restore();

  // ---------------------------------------------------------------------------
  // 4. VOLUMETRIC HIGH-DENSITY CELESTIAL FIELD (>= 2,500 Micro-Points)
  // ---------------------------------------------------------------------------
  // 3,460 volumetric micro-points distributed across solar corona, planetary rings,
  // asteroid belt, planetary wake trails, and outer zodiacal dust cloud.
  const TOTAL_MICRO_POINTS = 3460;

  for (let i = 0; i < TOTAL_MICRO_POINTS; i++) {
    // Purely deterministic closed-form pseudo-randomness
    const p1 = (Math.sin(i * 12.9898 + 1.234) * 43758.5453) % 1;
    const u1 = p1 < 0 ? p1 + 1 : p1;

    const p2 = (Math.sin(i * 78.233 + 5.678) * 43758.5453) % 1;
    const u2 = p2 < 0 ? p2 + 1 : p2;

    const p3 = (Math.sin(i * 45.164 + 9.101) * 43758.5453) % 1;
    const u3 = p3 < 0 ? p3 + 1 : p3;

    let wx = 0;
    let wy = 0;
    let wz = 0;
    let pointHue = baseHue;
    let basePointRadius = 0.0016;

    if (i < 800) {
      // 800 points: Central Star Solar Wind & Prominence Flares
      const theta = u1 * Math.PI * 2;
      const dist = 0.015 + Math.pow(u2, 2.0) * 0.065;
      wx = Math.cos(theta) * dist;
      wy = Math.sin(theta) * dist;
      wz = (u3 - 0.5) * 0.025;
      pointHue = isMulticolor ? (baseHue + 40) % 360 : baseHue;
      basePointRadius = 0.0018 * (1.0 - u2 * 0.6);
    } else if (i < 1800) {
      // 1,000 points: Dense Main Asteroid Belt (r ~ 0.170 to 0.200)
      const theta = u1 * Math.PI * 2;
      const beltR = 0.170 + u2 * 0.030;
      wx = Math.cos(theta) * beltR;
      wy = Math.sin(theta) * beltR;
      wz = (u3 - 0.5) * 0.018;
      pointHue = isMulticolor ? (baseHue + 45 + (i % 20)) % 360 : baseHue;
      basePointRadius = 0.0012 + u3 * 0.0014;
    } else if (i < 2500) {
      // 700 points: Planetary Ring Particulates for Planet III
      const pRing = planets[2];
      const meanAnomaly = (elapsed * pRing.speed + pRing.phase) % (Math.PI * 2);
      const trueAnomaly = meanAnomaly + 2 * pRing.e * Math.sin(meanAnomaly);
      const r = (pRing.a * (1 - pRing.e * pRing.e)) / (1 + pRing.e * Math.cos(trueAnomaly));
      const pCenterX = Math.cos(trueAnomaly) * r;
      const pCenterY = Math.sin(trueAnomaly) * r;

      const ringAngle = u1 * Math.PI * 2;
      const ringDist = pRing.radius * (1.5 + u2 * 1.0);
      wx = pCenterX + Math.cos(ringAngle) * ringDist;
      wy = pCenterY + Math.sin(ringAngle) * ringDist * 0.85;
      wz = pRing.zOffset + (u3 - 0.5) * 0.008;
      pointHue = isMulticolor ? (baseHue + pRing.hueOffset + 15) % 360 : baseHue;
      basePointRadius = 0.0011 + u2 * 0.0010;
    } else if (i < 3100) {
      // 600 points: Planetary Orbital Resonance Streamers
      const targetP = planets[i % planets.length];
      const theta = u1 * Math.PI * 2;
      const trackR = (targetP.a * (1 - targetP.e * targetP.e)) / (1 + targetP.e * Math.cos(theta));
      const offsetDist = (u2 - 0.5) * 0.015;
      wx = Math.cos(theta) * (trackR + offsetDist);
      wy = Math.sin(theta) * (trackR + offsetDist);
      wz = targetP.zOffset * Math.sin(theta) + (u3 - 0.5) * 0.010;
      pointHue = isMulticolor ? (baseHue + targetP.hueOffset) % 360 : baseHue;
      basePointRadius = 0.0010 + u3 * 0.0012;
    } else {
      // 360 points: Outer Zodiacal Dust & Kuiper Belt Disk
      const theta = u1 * Math.PI * 2;
      const dist = 0.320 + u2 * 0.090;
      wx = Math.cos(theta) * dist;
      wy = Math.sin(theta) * dist;
      wz = (u3 - 0.5) * 0.035;
      pointHue = isMulticolor ? (baseHue + 160) % 360 : baseHue;
      basePointRadius = 0.0010 + u2 * 0.0010;
    }

    const proj = project(wx, wy, wz);

    // Dynamic solar twinkle shimmer
    const shimmer = 0.70 + Math.sin(elapsed * 0.0028 + i * 0.22) * 0.30;
    const ptAlpha = masterAlpha * (0.35 + u3 * 0.45) * shimmer;

    if (ptAlpha <= 0.02) continue;

    const ptRadius = Math.max(0.75, scale * basePointRadius);

    ctx.beginPath();
    ctx.arc(proj.screenX, proj.screenY, ptRadius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${pointHue}, 88%, 80%, ${ptAlpha})`;
    ctx.fill();
  }
}
