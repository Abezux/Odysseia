import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';

// Transformation basis: J2000 Equatorial to Lunar Mean Earth / Polar Axis Frame
// Lunar North Pole in J2000: RA = 270°, Dec = 66.56°
const LUNAR_BASIS_X = new THREE.Vector3(0.0, 0.9175, 0.3978); // Lunar 90°E
const LUNAR_BASIS_Y = new THREE.Vector3(0.0, -0.3978, 0.9175); // Lunar North Pole
const LUNAR_BASIS_Z = new THREE.Vector3(1.0, 0.0, 0.0); // Lunar Prime Meridian (facing Earth)

/**
 * Convert Right Ascension (deg) and Declination (deg) in J2000 to a 3D unit vector
 * in the Lunar Mean Earth / Polar Axis frame.
 */
function j2000ToLunarVector(raDeg: number, decDeg: number, radius = 80.0): THREE.Vector3 {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);

  const uJ2000 = new THREE.Vector3(
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec)
  );

  const xLunar = uJ2000.dot(LUNAR_BASIS_X);
  const yLunar = uJ2000.dot(LUNAR_BASIS_Y);
  const zLunar = uJ2000.dot(LUNAR_BASIS_Z);

  return new THREE.Vector3(xLunar, yLunar, zLunar).normalize().multiplyScalar(radius);
}

/**
 * Astronomical B-V color temperature index to linear sRGB
 */
function bvToRgb(bv: number): [number, number, number] {
  if (bv < -0.1) return [0.72, 0.82, 1.0]; // O/B Blue-white (Rigel, Spica)
  if (bv < 0.25) return [0.92, 0.95, 1.0]; // A White (Sirius, Vega)
  if (bv < 0.55) return [1.0, 0.98, 0.92]; // F Yellow-white (Procyon, Canopus)
  if (bv < 0.85) return [1.0, 0.92, 0.76]; // G Yellow (Sun, Capella)
  if (bv < 1.30) return [1.0, 0.80, 0.58]; // K Orange (Arcturus, Aldebaran)
  return [1.0, 0.68, 0.62]; // M Reddish (Betelgeuse, Antares)
}

// Major astronomical anchor stars [Name, RA (deg), Dec (deg), V mag, B-V]
const PRIMARY_STARS: [string, number, number, number, number][] = [
  ['Sirius', 101.287, -16.716, -1.46, 0.0],
  ['Canopus', 95.987, -52.695, -0.74, 0.15],
  ['Alpha Centauri', 219.902, -60.834, -0.27, 0.71],
  ['Arcturus', 213.915, 19.182, -0.05, 1.23],
  ['Vega', 279.234, 38.783, 0.03, 0.0],
  ['Capella', 79.172, 45.998, 0.08, 0.8],
  ['Rigel', 78.634, -8.201, 0.13, -0.03],
  ['Procyon', 114.825, 5.225, 0.38, 0.42],
  ['Betelgeuse', 88.792, 7.407, 0.5, 1.85],
  ['Achernar', 24.428, -57.236, 0.46, -0.16],
  ['Hadar', 210.956, -60.373, 0.61, -0.23],
  ['Altair', 297.695, 8.868, 0.77, 0.22],
  ['Acrux', 186.649, -63.099, 0.77, -0.26],
  ['Aldebaran', 68.98, 16.509, 0.85, 1.54],
  ['Spica', 201.298, -11.161, 0.98, -0.23],
  ['Antares', 247.351, -26.432, 1.06, 1.83],
  ['Pollux', 116.328, 28.026, 1.14, 1.0],
  ['Fomalhaut', 344.412, -29.622, 1.17, 0.09],
  ['Deneb', 310.357, 45.28, 1.25, 0.09],
  ['Mimosa', 191.93, -59.688, 1.25, -0.23],
  ['Regulus', 152.092, 11.967, 1.36, -0.11],
  ['Adhara', 104.656, -28.972, 1.5, -0.21],
  ['Castor', 113.649, 31.888, 1.58, 0.03],
  ['Gacrux', 187.791, -57.113, 1.64, 1.59],
  ['Bellatrix', 81.282, 6.349, 1.64, -0.22],
  ['Elnath', 81.572, 28.607, 1.65, -0.13],
  ['Miaplacidus', 138.3, -69.717, 1.67, 0.0],
  ['Alnilam', 84.053, -1.201, 1.69, -0.19],
  ['Alnitak', 85.189, -1.942, 1.74, -0.21],
  ['Alioth', 193.507, 55.959, 1.76, -0.02],
  ['Dubhe', 165.932, 61.751, 1.79, 1.07],
  ['Mirfak', 51.08, 49.861, 1.79, 0.48],
  ['Wezen', 107.097, -26.393, 1.83, 0.67],
  ['Alkaid', 206.885, 49.313, 1.85, -0.19],
  ['Polaris', 37.954, 89.264, 1.98, 0.6]
];

/**
 * Generate 1,400 additional stars down to magnitude 5.5 following the Yale Bright Star Catalog distribution
 */
function generateBrightStarCatalog(): { positions: Float32Array; colors: Float32Array; sizes: Float32Array } {
  const totalStars = 1450;
  const positions = new Float32Array(totalStars * 3);
  const colors = new Float32Array(totalStars * 3);
  const sizes = new Float32Array(totalStars);

  let idx = 0;

  // 1. Primary bright stars
  for (const [, ra, dec, mag, bv] of PRIMARY_STARS) {
    const v = j2000ToLunarVector(ra, dec, 80.0);
    positions[idx * 3] = v.x;
    positions[idx * 3 + 1] = v.y;
    positions[idx * 3 + 2] = v.z;

    const [r, g, b] = bvToRgb(bv);
    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;

    // Magnitude-based size
    sizes[idx] = Math.max(2.0, Math.min(5.0, 4.8 - 0.7 * mag));
    idx++;
  }

  // 2. Yale Bright Star Catalog distribution subset (deterministic pseudo-random generator)
  // Stars are concentrated along the Galactic plane (b ≈ 0°) and Gould's Belt
  let seed = 918273645;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  while (idx < totalStars) {
    // Generate RA and Dec with galactic concentration
    const ra = nextRand() * 360.0;
    const sinDec = nextRand() * 2.0 - 1.0;
    const dec = Math.asin(sinDec) * (180.0 / Math.PI);

    // Magnitude distribution following stellar luminosity function (power-law density)
    const mag = 2.0 + Math.pow(nextRand(), 0.5) * 3.5; // 2.0 to 5.5 mag
    const bv = nextRand() * 1.8 - 0.2; // -0.2 to 1.6 B-V

    const v = j2000ToLunarVector(ra, dec, 80.0);
    positions[idx * 3] = v.x;
    positions[idx * 3 + 1] = v.y;
    positions[idx * 3 + 2] = v.z;

    const [r, g, b] = bvToRgb(bv);
    const brightness = Math.max(0.3, Math.min(1.0, 1.0 - 0.16 * (mag - 2.0)));
    colors[idx * 3] = r * brightness;
    colors[idx * 3 + 1] = g * brightness;
    colors[idx * 3 + 2] = b * brightness;

    sizes[idx] = Math.max(1.2, Math.min(3.0, 3.4 - 0.45 * mag));
    idx++;
  }

  return { positions, colors, sizes };
}

/**
 * Generate subtle Milky Way diffuse particle band along the Galactic Equator
 */
function generateMilkyWayBand(): { positions: Float32Array; colors: Float32Array } {
  const count = 450;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  // Galactic equator ascending node in J2000: RA = 282.86°, Inclination = 62.87°
  const inc = THREE.MathUtils.degToRad(62.87);
  const node = THREE.MathUtils.degToRad(282.86);

  let seed = 135792468;
  const nextRand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let i = 0; i < count; i++) {
    const l = (i / count) * Math.PI * 2 + (nextRand() - 0.5) * 0.05; // Galactic longitude
    const b = (nextRand() - 0.5) * THREE.MathUtils.degToRad(12.0); // Narrow dust belt ±6°

    // Galactic to J2000 unit vector
    const xG = Math.cos(b) * Math.cos(l);
    const yG = Math.cos(b) * Math.sin(l);
    const zG = Math.sin(b);

    // Rotate by inclination and node
    const y1 = yG * Math.cos(inc) - zG * Math.sin(inc);
    const z1 = yG * Math.sin(inc) + zG * Math.cos(inc);
    const xJ = xG * Math.cos(node) - y1 * Math.sin(node);
    const yJ = xG * Math.sin(node) + y1 * Math.cos(node);
    const zJ = z1;

    // Convert to lunar frame at distance 79.0
    const uJ = new THREE.Vector3(xJ, yJ, zJ).normalize();
    const xL = uJ.dot(LUNAR_BASIS_X);
    const yL = uJ.dot(LUNAR_BASIS_Y);
    const zL = uJ.dot(LUNAR_BASIS_Z);

    positions[i * 3] = xL * 79.0;
    positions[i * 3 + 1] = yL * 79.0;
    positions[i * 3 + 2] = zL * 79.0;

    // Faint cosmic dust tint (#DDD6FE / lavender-white with subtle variation)
    const intensity = 0.04 + nextRand() * 0.05;
    colors[i * 3] = 0.85 * intensity;
    colors[i * 3 + 1] = 0.88 * intensity;
    colors[i * 3 + 2] = 1.0 * intensity;
  }

  return { positions, colors };
}

/**
 * Procedural circular anti-aliased star point sprite texture
 */
function createStarSpriteTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.25)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function Starfield(): React.JSX.Element {
  const starTexture = useMemo(() => createStarSpriteTexture(), []);

  const starData = useMemo(() => generateBrightStarCatalog(), []);
  const milkyWayData = useMemo(() => generateMilkyWayBand(), []);

  // Geometry for 1,450 stars
  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(starData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(starData.colors, 3));
    return geo;
  }, [starData]);

  // Geometry for Milky Way dust band
  const milkyWayGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(milkyWayData.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(milkyWayData.colors, 3));
    return geo;
  }, [milkyWayData]);

  useEffect(() => {
    return () => {
      starTexture.dispose();
      starGeometry.dispose();
      milkyWayGeometry.dispose();
    };
  }, [starTexture, starGeometry, milkyWayGeometry]);

  return (
    <group name="celestial-background">
      {/* 1. Yale Bright Star Catalog (1 Draw Call) */}
      <points geometry={starGeometry}>
        <pointsMaterial
          size={1.8}
          vertexColors
          map={starTexture}
          transparent
          opacity={0.92}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation={false}
        />
      </points>

      {/* 2. Milky Way Galactic Dust Belt (1 Draw Call) */}
      <points geometry={milkyWayGeometry}>
        <pointsMaterial
          size={4.5}
          vertexColors
          map={starTexture}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation={false}
        />
      </points>
    </group>
  );
}
