import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { latLonToVector3, GLOBE_RADIUS } from '../../src/features/globe/globeMath';
import { LunarSurfaceShader } from '../../src/features/globe/TerminatorShader';

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
    expect(LunarSurfaceShader.fragmentShader).toContain('smoothstep(-0.08, 0.12, NdotL)');
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
});
