import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  SiteCatalogSchema,
  HorizonProfileSchema,
  TerrainManifestSchema
} from '../../src/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../public/data');
const CATALOG_PATH = path.join(DATA_DIR, 'catalog.json');
const HORIZON_DIR = path.join(DATA_DIR, 'horizon');
const TERRAIN_DIR = path.join(DATA_DIR, 'terrain');

console.log('[validateData] Starting strict data invariant validation on public/data/...');

let errors = 0;

function fail(msg: string) {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

// 1. Validate Catalog
if (!fs.existsSync(CATALOG_PATH)) {
  fail(`Missing canonical catalog at ${CATALOG_PATH}`);
  process.exit(1);
}

let catalogRaw: unknown;
try {
  catalogRaw = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
} catch (e) {
  fail(`catalog.json is not valid JSON: ${e}`);
  process.exit(1);
}

const catalogResult = SiteCatalogSchema.safeParse(catalogRaw);
if (!catalogResult.success) {
  fail(`catalog.json failed Zod validation: ${JSON.stringify(catalogResult.error.format())}`);
  process.exit(1);
}

const catalog = catalogResult.data;
console.log(`✓ catalog.json valid (${catalog.sites.length} sites).`);

// 2. Validate Horizon and Terrain for each site
for (const site of catalog.sites) {
  const horizonPath = path.join(HORIZON_DIR, `${site.id}.json`);
  const terrainManifestPath = path.join(TERRAIN_DIR, `${site.id}.json`);
  const terrainBinPath = path.join(TERRAIN_DIR, `${site.id}.bin`);

  // Check Horizon Profile
  if (!fs.existsSync(horizonPath)) {
    fail(`Missing horizon profile for site '${site.id}' at ${horizonPath}`);
  } else {
    try {
      const hRaw = JSON.parse(fs.readFileSync(horizonPath, 'utf-8'));
      const hResult = HorizonProfileSchema.safeParse(hRaw);
      if (!hResult.success) {
        fail(`Horizon profile '${site.id}' failed Zod validation: ${JSON.stringify(hResult.error.format())}`);
      } else {
        const h = hResult.data;
        if (h.elevDeg.length !== 360) {
          fail(`Horizon profile '${site.id}' has ${h.elevDeg.length} bins (expected exactly 360)`);
        }
        for (let i = 0; i < 360; i++) {
          const el = h.elevDeg[i];
          if (isNaN(el) || el < -15 || el > 90) {
            fail(`Horizon profile '${site.id}' bin ${i} out of bounds: ${el}`);
            break;
          }
        }
      }
    } catch (e) {
      fail(`Failed to parse horizon profile for '${site.id}': ${e}`);
    }
  }

  // Check Terrain Manifest & Binary
  if (!fs.existsSync(terrainManifestPath)) {
    fail(`Missing terrain manifest for site '${site.id}' at ${terrainManifestPath}`);
  } else if (!fs.existsSync(terrainBinPath)) {
    fail(`Missing terrain binary file for site '${site.id}' at ${terrainBinPath}`);
  } else {
    try {
      const tRaw = JSON.parse(fs.readFileSync(terrainManifestPath, 'utf-8'));
      const tResult = TerrainManifestSchema.safeParse(tRaw);
      if (!tResult.success) {
        fail(`Terrain manifest '${site.id}' failed Zod validation: ${JSON.stringify(tResult.error.format())}`);
      } else {
        const manifest = tResult.data;
        const expectedBytes = manifest.width * manifest.height * 4;
        const actualBytes = fs.statSync(terrainBinPath).size;

        if (actualBytes !== expectedBytes) {
          fail(
            `Terrain binary '${site.id}.bin' size mismatch: got ${actualBytes} bytes, expected ${expectedBytes} bytes (${manifest.width}x${manifest.height} Float32)`
          );
        }

        // Verify float buffer contents
        const buffer = fs.readFileSync(terrainBinPath);
        const floatArray = new Float32Array(
          buffer.buffer,
          buffer.byteOffset,
          buffer.byteLength / 4
        );
        let hasNan = false;
        for (let i = 0; i < floatArray.length; i++) {
          if (isNaN(floatArray[i])) {
            hasNan = true;
            break;
          }
        }
        if (hasNan) {
          fail(`Terrain binary '${site.id}.bin' contains NaN height values`);
        }
      }
    } catch (e) {
      fail(`Failed to parse terrain files for '${site.id}': ${e}`);
    }
  }
}

if (errors > 0) {
  console.error(`\n❌ [validateData] Validation failed with ${errors} error(s).`);
  process.exit(1);
} else {
  console.log(`\n✅ [validateData] All ${catalog.sites.length} sites passed strict invariant validation!`);
  process.exit(0);
}
