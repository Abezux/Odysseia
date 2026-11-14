import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import catalogData from '../../public/data/catalog.json';
import { HorizonProfileSchema, TerrainManifestSchema } from '../../src/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Deterministic pseudo-random number generator (Mulberry32) seeded by string.
 */
function createRng(seedStr: string): () => number {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return () => {
    h |= 0;
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DATA_DIR = path.resolve(__dirname, '../../public/data');
const HORIZON_DIR = path.join(DATA_DIR, 'horizon');
const TERRAIN_DIR = path.join(DATA_DIR, 'terrain');

fs.mkdirSync(HORIZON_DIR, { recursive: true });
fs.mkdirSync(TERRAIN_DIR, { recursive: true });

console.log('[generateMockData] Generating deterministic mock datasets for all catalog sites...');

for (const site of catalogData.sites) {
  const rng = createRng(`lunar-site-${site.id}`);

  // 1. Generate Horizon Profile (360 bins, 1° step)
  // For polar sites (lat < -75°), simulate mountainous crater rim horizons (-2° to +6°)
  // For equatorial sites, simulate smooth undulating maria (0° to +2.5°)
  const elevDeg: number[] = [];
  const baseNoiseFreq = 3 + Math.floor(rng() * 4); // 3 to 6 major massif ridges
  const isPolar = site.isSouthPoleRegion;

  for (let az = 0; az < 360; az++) {
    const rad = (az * Math.PI) / 180;
    const ridge1 = Math.sin(rad * baseNoiseFreq);
    const ridge2 = Math.cos(rad * (baseNoiseFreq * 2 + 1)) * 0.4;
    const microJitter = (rng() - 0.5) * 0.3;

    let elev: number;
    if (isPolar) {
      elev = 1.8 + ridge1 * 2.2 + ridge2 * 1.0 + microJitter;
    } else {
      elev = 0.6 + ridge1 * 0.5 + ridge2 * 0.2 + microJitter;
    }

    // Clamp between -10° and +25°
    elevDeg.push(Number(Math.max(-10, Math.min(25, elev)).toFixed(3)));
  }

  const horizonProfile = {
    siteId: site.id,
    azStepDeg: 1 as const,
    elevDeg,
    searchRadiusKm: isPolar ? 80 : 30,
    demSource: isPolar ? 'LOLA_POLAR_MOCK_80KM' : 'LOLA_GLOBAL_MOCK_30KM',
    source: 'mock' as const
  };

  // Validate with Zod before writing
  HorizonProfileSchema.parse(horizonProfile);
  fs.writeFileSync(
    path.join(HORIZON_DIR, `${site.id}.json`),
    JSON.stringify(horizonProfile, null, 2)
  );

  // 2. Generate 3D Terrain Tile (256x256 Float32Array)
  const width = 256;
  const height = 256;
  const metersPerPixel = 20.0; // 20m/px gives ~5.12 km x 5.12 km local landing zone
  const heights = new Float32Array(width * height);

  const baseElevationM = site.elevationM ?? 0;
  const terrainRoughness = isPolar ? 600.0 : 150.0;
  let minElevationM = Infinity;
  let maxElevationM = -Infinity;

  // Synthesize crater depressions and central peaks
  const craterX = 128 + (rng() - 0.5) * 40;
  const craterY = 128 + (rng() - 0.5) * 40;
  const craterRadius = 60 + rng() * 30;
  const craterDepth = isPolar ? 800 : 250;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Distance from synthesized local crater center
      const dx = x - craterX;
      const dy = y - craterY;
      const dist = Math.hypot(dx, dy);

      // Crater profile: raised rim + depression + optional central peak
      let craterFeature = 0;
      if (dist < craterRadius * 1.5) {
        const normDist = dist / craterRadius;
        if (normDist < 1.0) {
          // Inside bowl: parabolic depression
          craterFeature = -craterDepth * (1 - normDist * normDist);
          // Central peak
          if (normDist < 0.25) {
            craterFeature += craterDepth * 0.3 * (1 - normDist / 0.25);
          }
        } else {
          // Raised rim lip
          const rimDist = (normDist - 1.0) / 0.5;
          craterFeature = craterDepth * 0.2 * (1 - rimDist);
        }
      }

      // Procedural undulation
      const noise =
        Math.sin((x / 256) * Math.PI * 4) *
        Math.cos((y / 256) * Math.PI * 4) *
        terrainRoughness;
      const jitter = (rng() - 0.5) * 15.0;

      const elev = baseElevationM + craterFeature + noise + jitter;
      heights[idx] = elev;

      if (elev < minElevationM) minElevationM = elev;
      if (elev > maxElevationM) maxElevationM = elev;
    }
  }

  // Write binary .bin heightmap (Float32 little-endian row-major)
  const binBuffer = Buffer.from(heights.buffer);
  fs.writeFileSync(path.join(TERRAIN_DIR, `${site.id}.bin`), binBuffer);

  // Write Terrain Manifest JSON
  const manifest = {
    siteId: site.id,
    width,
    height,
    metersPerPixel,
    centerLat: site.latDeg,
    centerLon: site.lonDeg,
    elevationUnit: 'm' as const,
    referenceRadiusM: 1737400 as const,
    heightsFile: `${site.id}.bin`,
    minElevationM: Number(minElevationM.toFixed(1)),
    maxElevationM: Number(maxElevationM.toFixed(1)),
    source: 'mock' as const
  };

  // Validate with Zod
  TerrainManifestSchema.parse(manifest);
  fs.writeFileSync(path.join(TERRAIN_DIR, `${site.id}.json`), JSON.stringify(manifest, null, 2));
}

console.log(`[generateMockData] Generated horizon & terrain datasets for ${catalogData.sites.length} sites.`);
