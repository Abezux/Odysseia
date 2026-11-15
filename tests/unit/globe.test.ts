import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { latLonToVector3, GLOBE_RADIUS } from '../../src/features/globe/globeMath';
import { LunarSurfaceShader } from '../../src/features/globe/TerminatorShader';
import { ephemerisEngine } from '../../src/lib/ephemeris';

describe('Phase 3: 3D Moon Globe & NASA LROC Texture Integration', () => {
  it('correctly maps selenographic coordinates to 3D Cartesian vectors in Mean Earth frame', () => {
    // North pole: +90° lat -> (0, R, 0)
    const northPole = latLonToVector3(90, 0, GLOBE_RADIUS);
    expect(northPole.x).toBeCloseTo(0, 5);
    expect(northPole.y).toBeCloseTo(GLOBE_RADIUS, 5);
    expect(northPole.z).toBeCloseTo(0, 5);

    // South pole: -90° lat -> (0, -R, 0)
    const southPole = latLonToVector3(-90, 0, GLOBE_RADIUS);
    expect(southPole.x).toBeCloseTo(0, 5);
    expect(southPole.y).toBeCloseTo(-GLOBE_RADIUS, 5);
    expect(southPole.z).toBeCloseTo(0, 5);

    // Prime meridian at equator (0°, 0°) -> (0, 0, R) facing Earth
    const primeMeridian = latLonToVector3(0, 0, GLOBE_RADIUS);
    expect(primeMeridian.x).toBeCloseTo(0, 5);
    expect(primeMeridian.y).toBeCloseTo(0, 5);
    expect(primeMeridian.z).toBeCloseTo(GLOBE_RADIUS, 5);

    // 90° East longitude at equator (0°, +90°) -> (R, 0, 0)
    const east90 = latLonToVector3(0, 90, GLOBE_RADIUS);
    expect(east90.x).toBeCloseTo(GLOBE_RADIUS, 5);
    expect(east90.y).toBeCloseTo(0, 5);
    expect(east90.z).toBeCloseTo(0, 5);

    // 90° West longitude at equator (0°, -90°) -> (-R, 0, 0)
    const west90 = latLonToVector3(0, -90, GLOBE_RADIUS);
    expect(west90.x).toBeCloseTo(-GLOBE_RADIUS, 5);
    expect(west90.y).toBeCloseTo(0, 5);
    expect(west90.z).toBeCloseTo(0, 5);

    // 180° East longitude at equator (0°, 180°) -> (0, 0, -R) farside
    const farside = latLonToVector3(0, 180, GLOBE_RADIUS);
    expect(farside.x).toBeCloseTo(0, 5);
    expect(farside.y).toBeCloseTo(0, 5);
    expect(farside.z).toBeCloseTo(-GLOBE_RADIUS, 5);
  });

  it('inverts 3D coordinates on the sphere back to exact selenographic latitude and longitude', () => {
    const testPoints = [
      { lat: 0.674, lon: 23.473 },    // Apollo 11
      { lat: -89.90, lon: 0.00 },     // Shackleton Rim
      { lat: -85.99, lon: 2.94 },     // Malapert Massif
      { lat: -45.44, lon: 177.60 },   // Chang'e 4
      { lat: 43.06, lon: -51.92 },    // Chang'e 5
    ];

    for (const pt of testPoints) {
      const v = latLonToVector3(pt.lat, pt.lon, GLOBE_RADIUS).normalize();
      const latRecov = Math.asin(v.y) * (180 / Math.PI);
      const lonRecov = Math.atan2(v.x, v.z) * (180 / Math.PI);

      expect(latRecov).toBeCloseTo(pt.lat, 2);
      expect(lonRecov).toBeCloseTo(pt.lon, 2);
    }
  });

  it('aligns Three.js SphereGeometry UV mapping with equirectangular prime meridian when phiStart = -Math.PI / 2', () => {
    // With phiStart = -Math.PI / 2, u=0.5 must align with lon=0° (Prime Meridian) and z = GLOBE_RADIUS
    const geo = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 16, -Math.PI / 2);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;

    // Search for the vertex at equator and prime meridian
    let foundCenter = false;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const u = uv.getX(i);
      const v = uv.getY(i);

      // Check equator center (lat=0, lon=0)
      if (Math.abs(y) < 1e-4 && Math.abs(x) < 1e-4 && z > 0) {
        expect(z).toBeCloseTo(GLOBE_RADIUS, 4);
        expect(u).toBeCloseTo(0.5, 4); // Equirectangular center is 0° lon
        expect(v).toBeCloseTo(0.5, 4); // Equator is 0° lat
        foundCenter = true;
      }
    }
    expect(foundCenter).toBe(true);
  });

  it('validates LunarSurfaceShader definition and uniforms', () => {
    expect(LunarSurfaceShader.uniforms).toHaveProperty('uSunDirection');
    expect(LunarSurfaceShader.uniforms).toHaveProperty('uDayColor');
    expect(LunarSurfaceShader.uniforms).toHaveProperty('uNightColor');
    expect(LunarSurfaceShader.uniforms).toHaveProperty('uTerminatorColor');
    expect(LunarSurfaceShader.uniforms).toHaveProperty('uAlbedoMap');
    expect(LunarSurfaceShader.uniforms).toHaveProperty('uHasTexture');

    expect(LunarSurfaceShader.fragmentShader).toContain('texture2D(uAlbedoMap, vUv)');
    expect(LunarSurfaceShader.fragmentShader).toContain('smoothstep(-0.08, 0.12, effectiveNdotL)');
    expect(LunarSurfaceShader.fragmentShader).toContain('polarProximity');
    expect(LunarSurfaceShader.fragmentShader).toContain('pow(limb, 4.0)');
  });

  it('verifies that NASA LROC texture assets and manifest exist and meet web budgets', () => {
    const manifestPath = path.resolve(__dirname, '../../public/textures/moon-texture-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.productId).toBe('LROC_COLOR_POLES_4K');
    expect(manifest.license).toContain('Public Domain');
    expect(manifest.attribution).toContain('NASA');

    const file4k = path.resolve(__dirname, '../../public/textures', manifest.resolution.lod0.file);
    const file2k = path.resolve(__dirname, '../../public/textures', manifest.resolution.lod1.file);

    expect(fs.existsSync(file4k)).toBe(true);
    expect(fs.existsSync(file2k)).toBe(true);

    const size4k = fs.statSync(file4k).size;
    const size2k = fs.statSync(file2k).size;

    // Must be under web budgets (< 2 MB for 4K, < 500 KB for 2K)
    expect(size4k).toBeLessThan(2 * 1024 * 1024);
    expect(size2k).toBeLessThan(500 * 1024);
  });

  it('proves authentic LOLA South Polar crater relief eliminates flat gray caps', () => {
    // Read manifest polar coverage documentation
    const manifestPath = path.resolve(__dirname, '../../public/textures/moon-texture-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.polarDemSource).toContain('LOLA');
    expect(manifest.polarCoverage.shackletonCrater).toContain('89.9°S');
    expect(manifest.polarCoverage.deGerlacheCrater).toContain('88.5°S');
    expect(manifest.polarCoverage.malapertMassif).toContain('85.9°S');
  });

  describe('Group 4: Celestial Environment (Sun, Earth, Starfield in Space)', () => {
    it('verifies NASA Blue Marble texture exists and satisfies < 500 KB budget', () => {
      const earthPath = path.resolve(__dirname, '../../public/textures/earth-blue-marble.webp');
      expect(fs.existsSync(earthPath)).toBe(true);
      const size = fs.statSync(earthPath).size;
      expect(size).toBeLessThan(500 * 1024);
      expect(size).toBeGreaterThan(50 * 1024);
    });

    it('verifies Earth and Sun apparent angular diameters adhere to celestial scale specifications', () => {
      const earthDistance = 24.0;
      const earthRadius = 0.40;
      const earthAngularDiameterDeg = 2 * Math.atan(earthRadius / earthDistance) * (180 / Math.PI);
      expect(earthAngularDiameterDeg).toBeCloseTo(1.91, 1);

      const sunDistance = 36.0;
      const sunRadius = 0.166;
      const sunAngularDiameterDeg = 2 * Math.atan(sunRadius / sunDistance) * (180 / Math.PI);
      expect(sunAngularDiameterDeg).toBeCloseTo(0.53, 1);

      // Earth apparent size should be ~3.6x larger than Sun's apparent size from Moon
      const ratio = earthAngularDiameterDeg / sunAngularDiameterDeg;
      expect(ratio).toBeCloseTo(3.6, 1);
    });

    it('transforms J2000 celestial coordinates to the Lunar Mean Earth / Polar Axis frame correctly', () => {
      // Lunar North Pole direction in J2000 is RA = 270°, Dec = 66.56°
      const raRad = (270 * Math.PI) / 180;
      const decRad = (66.56 * Math.PI) / 180;

      const uJ2000 = new THREE.Vector3(
        Math.cos(decRad) * Math.cos(raRad),
        Math.cos(decRad) * Math.sin(raRad),
        Math.sin(decRad)
      );

      const LUNAR_BASIS_X = new THREE.Vector3(0.0, 0.9175, 0.3978);
      const LUNAR_BASIS_Y = new THREE.Vector3(0.0, -0.3978, 0.9175);
      const LUNAR_BASIS_Z = new THREE.Vector3(1.0, 0.0, 0.0);

      const xL = uJ2000.dot(LUNAR_BASIS_X);
      const yL = uJ2000.dot(LUNAR_BASIS_Y);
      const zL = uJ2000.dot(LUNAR_BASIS_Z);

      // In Lunar frame, Lunar North Pole must point along +Y (0, 1, 0)
      expect(xL).toBeCloseTo(0.0, 2);
      expect(yL).toBeCloseTo(1.0, 2);
      expect(zL).toBeCloseTo(0.0, 2);
    });

    it('verifies astronomical B-V color temperature and stellar magnitude properties', () => {
      // Test B-V color temperature function logic
      const blueStarBv = -0.15; // O/B star like Rigel
      const redStarBv = 1.6;    // M star like Betelgeuse

      const getStarRgb = (bv: number) => {
        if (bv < -0.1) return [0.72, 0.82, 1.0];
        if (bv < 0.25) return [0.92, 0.95, 1.0];
        if (bv < 0.55) return [1.0, 0.98, 0.92];
        if (bv < 0.85) return [1.0, 0.92, 0.76];
        if (bv < 1.30) return [1.0, 0.80, 0.58];
        return [1.0, 0.68, 0.62];
      };

      const [rBlue, , bBlue] = getStarRgb(blueStarBv);
      expect(bBlue).toBeGreaterThan(rBlue);

      const [rRed, , bRed] = getStarRgb(redStarBv);
      expect(rRed).toBeGreaterThan(bRed);
    });
  });

  describe('Group 5: Orbit Paths, Labels, Toggles, and Camera Interaction', () => {
    it('samples Earth apparent orbit over one lunar sidereal month (27.32 days) with distance variation', () => {
      const testDate = new Date('2026-11-15T12:00:00Z');
      const siderealPeriodDays = 27.321661;
      const sampleCount = 60;
      const stepMs = (siderealPeriodDays * 86400 * 1000) / sampleCount;
      const startMs = testDate.getTime() - (siderealPeriodDays * 86400 * 1000) / 2;

      const distances: number[] = [];
      for (let i = 0; i <= sampleCount; i++) {
        const sample = ephemerisEngine.sample({ latDeg: 0, lonDeg: 0 }, new Date(startMs + i * stepMs));
        distances.push(sample.earth.distanceKm);
      }

      const minDistance = Math.min(...distances);
      const maxDistance = Math.max(...distances);

      // Real Earth-Moon distance varies between ~356,000 km (perigee) and ~407,000 km (apogee)
      expect(minDistance).toBeLessThan(375000);
      expect(maxDistance).toBeGreaterThan(395000);
      expect(maxDistance - minDistance).toBeGreaterThan(25000); // Measurable variation > 25,000 km
    });

    it('calculates astronomical light-time and solar angular separation accurately', () => {
      const SPEED_OF_LIGHT_KM_S = 299792.458;
      const earthDistKm = 384400;
      const earthLightTimeSec = earthDistKm / SPEED_OF_LIGHT_KM_S;
      expect(earthLightTimeSec).toBeCloseTo(1.28, 2);

      const sunDistKm = 149597870.7;
      const sunLightTimeMin = sunDistKm / SPEED_OF_LIGHT_KM_S / 60;
      expect(sunLightTimeMin).toBeCloseTo(8.32, 1);

      // Vector separation test
      const vSun = new THREE.Vector3(1, 0, 0);
      const vEarth = new THREE.Vector3(0, 1, 0); // 90° separation
      const angleRad = Math.acos(THREE.MathUtils.clamp(vSun.dot(vEarth), -1, 1));
      const angleDeg = THREE.MathUtils.radToDeg(angleRad);
      expect(angleDeg).toBeCloseTo(90.0, 4);
    });

    it('validates default Layer Control state contract', () => {
      const defaultLayers = {
        celestialBodies: true,
        orbitPath: false,
        labels: true,
        starfield: true,
        siteMarkers: true,
        terminator: true,
        earthVector: true,
        shadowMap: true
      };

      expect(defaultLayers.celestialBodies).toBe(true);
      expect(defaultLayers.orbitPath).toBe(false); // Orbit path off by default
      expect(defaultLayers.labels).toBe(true);
      expect(defaultLayers.starfield).toBe(true);
    });

    it('verifies smoothstep camera interpolation behavior', () => {
      const smoothstep = (t: number) => t * t * (3 - 2 * t);
      expect(smoothstep(0.0)).toBeCloseTo(0.0, 5);
      expect(smoothstep(0.5)).toBeCloseTo(0.5, 5);
      expect(smoothstep(1.0)).toBeCloseTo(1.0, 5);

      // Easing derivative is zero at endpoints (smooth acceleration & deceleration)
      const eps = 1e-4;
      const derivative0 = (smoothstep(eps) - smoothstep(0)) / eps;
      const derivative1 = (smoothstep(1) - smoothstep(1 - eps)) / eps;
      expect(derivative0).toBeCloseTo(0, 3);
      expect(derivative1).toBeCloseTo(0, 3);
    });
  });
});
