import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { dataProvider } from '../../lib/data';
import { ephemerisEngine } from '../../lib/ephemeris';
import type { Site, TerrainManifest } from '../../contracts';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

interface TerrainMeshProps {
  manifest: TerrainManifest;
  heights: Float32Array;
  exaggeration: number;
}

function TerrainMesh({ manifest, heights, exaggeration }: TerrainMeshProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const { width, height, metersPerPixel } = manifest;

  // Physical width in meters
  const totalWidthMeters = width * metersPerPixel;
  // Three.js world size
  const planeSize = 60; // units
  const unitsPerMeter = planeSize / totalWidthMeters;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(planeSize, planeSize, width - 1, height - 1);
    // Rotate plane so X is East-West, Z is North-South, Y is Up
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const centerIdx = Math.floor(height / 2) * width + Math.floor(width / 2);
    const centerElev = heights[centerIdx] ?? (manifest.minElevationM + manifest.maxElevationM) / 2;

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const hIdx = j * width + i;
        const vertexIdx = j * width + i;
        const elev = heights[hIdx];
        const relativeElev = (elev - centerElev) * unitsPerMeter * exaggeration;
        pos.setY(vertexIdx, relativeElev);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }, [manifest, heights, exaggeration, unitsPerMeter, planeSize, width, height]);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        color="#64748B"
        roughness={0.92}
        metalness={0.08}
        flatShading={false}
      />
    </mesh>
  );
}

interface LanderMarkerProps {
  earthDirection: THREE.Vector3;
}

function LanderMarker({ earthDirection }: LanderMarkerProps): React.JSX.Element {
  const dishRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (dishRef.current) {
      // Point comms antenna toward Earth
      dishRef.current.lookAt(earthDirection.clone().multiplyScalar(100));
    }
  });

  return (
    <group position={[0, 0.4, 0]}>
      {/* Lander Core Body (Gold Foil Octagon) */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.5, 8]} />
        <meshStandardMaterial color="#D97706" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Solar Panel Wings */}
      <mesh position={[0.9, 0.35, 0]} rotation={[0, 0, Math.PI / 12]} castShadow>
        <boxGeometry args={[0.9, 0.05, 0.6]} />
        <meshStandardMaterial color="#1E3A8A" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[-0.9, 0.35, 0]} rotation={[0, 0, -Math.PI / 12]} castShadow>
        <boxGeometry args={[0.9, 0.05, 0.6]} />
        <meshStandardMaterial color="#1E3A8A" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* Landing Legs */}
      <mesh position={[0.5, 0.1, 0.5]} rotation={[0.4, 0, -0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.6} />
      </mesh>
      <mesh position={[-0.5, 0.1, 0.5]} rotation={[0.4, 0, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.6} />
      </mesh>
      <mesh position={[0.5, 0.1, -0.5]} rotation={[-0.4, 0, -0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.6} />
      </mesh>
      <mesh position={[-0.5, 0.1, -0.5]} rotation={[-0.4, 0, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.6} />
      </mesh>

      {/* High Gain Communication Antenna Dish */}
      <group ref={dishRef} position={[0, 0.65, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.25, 0.1, 16, 1, true]} />
          <meshStandardMaterial color="#F8FAFC" metalness={0.4} roughness={0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <cylinderGeometry args={[0.02, 0.02, 0.12]} />
          <meshStandardMaterial color="#64748B" />
        </mesh>
      </group>

      {/* Beacon Light */}
      <pointLight color="#10B981" intensity={0.4} distance={4} position={[0, 0.7, 0]} />
    </group>
  );
}

function CompassReticle({ radius = 32 }: { radius?: number }): React.JSX.Element {
  const lineGeo = useMemo(() => {
    const pts = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, -0.1, Math.sin(theta) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  const lineObj = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35
    });
    return new THREE.Line(lineGeo, mat);
  }, [lineGeo]);

  return <primitive object={lineObj} />;
}

export function TerrainView(): React.JSX.Element {
  const { activeSiteId } = useScenarioStore();
  const { currentTime } = useTimeStore();

  const [site, setSite] = useState<Site | null>(null);
  const [terrainData, setTerrainData] = useState<{
    manifest: TerrainManifest;
    heights: Float32Array;
  } | null>(null);
  const [exaggeration, setExaggeration] = useState<number>(1.5);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load site and terrain
  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setIsLoading(true);
      const cat = await dataProvider.getCatalog();
      const s = cat.sites.find((item) => item.id === activeSiteId) || cat.sites[0];
      if (isCancelled) return;
      setSite(s);

      const td = await dataProvider.getTerrain(s.id);
      if (isCancelled) return;
      setTerrainData(td);
      setIsLoading(false);
    }
    load();
    return () => {
      isCancelled = true;
    };
  }, [activeSiteId]);

  // Compute live Sun and Earth vectors relative to site
  const { sunVector, earthVector, sunElevDeg, earthElevDeg, isSunUp, isEarthUp } = useMemo(() => {
    if (!site) {
      return {
        sunVector: new THREE.Vector3(0, 50, 0),
        earthVector: new THREE.Vector3(0, 50, 0),
        sunElevDeg: 0,
        earthElevDeg: 0,
        isSunUp: false,
        isEarthUp: false
      };
    }

    const ephem = ephemerisEngine.sample(
      { latDeg: site.latDeg, lonDeg: site.lonDeg, elevationM: site.elevationM },
      currentTime
    );

    const sunAzRad = (ephem.sun.azimuthDeg * Math.PI) / 180;
    const sunElRad = (ephem.sun.elevationDeg * Math.PI) / 180;
    // Map: +X = East, -Z = North, +Y = Up
    const sx = Math.cos(sunElRad) * Math.sin(sunAzRad);
    const sz = -Math.cos(sunElRad) * Math.cos(sunAzRad);
    const sy = Math.sin(sunElRad);

    const earthAzRad = (ephem.earth.azimuthDeg * Math.PI) / 180;
    const earthElRad = (ephem.earth.elevationDeg * Math.PI) / 180;
    const ex = Math.cos(earthElRad) * Math.sin(earthAzRad);
    const ez = -Math.cos(earthElRad) * Math.cos(earthAzRad);
    const ey = Math.sin(earthElRad);

    return {
      sunVector: new THREE.Vector3(sx, Math.max(-0.2, sy), sz).normalize(),
      earthVector: new THREE.Vector3(ex, Math.max(-0.2, ey), ez).normalize(),
      sunElevDeg: ephem.sun.elevationDeg,
      earthElevDeg: ephem.earth.elevationDeg,
      isSunUp: ephem.sun.elevationDeg >= -0.267,
      isEarthUp: ephem.earth.elevationDeg >= 0
    };
  }, [site, currentTime]);

  if (isLoading || !site) {
    return (
      <div className="flex h-full w-full items-center justify-center font-mono text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-sun-amber border-t-transparent" />
          <span>Loading 3D digital elevation model...</span>
        </div>
      </div>
    );
  }

  if (!terrainData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
        <div className="rounded-lg border border-space-700 bg-space-900/80 p-6 max-w-md">
          <h3 className="font-bold text-slate-200">No 3D DEM Tile Available</h3>
          <p className="mt-2 text-xs text-slate-400 leading-relaxed">
            Local 3D elevation tiles are generated for key polar landing targets (e.g. Shackleton Rim,
            Malapert Plateau). For this coordinate, evaluate using the Topocentric Sky Dial and Horizon Panorama.
          </p>
        </div>
      </div>
    );
  }

  const { manifest, heights } = terrainData;
  const sunLightPos = sunVector.clone().multiplyScalar(100);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-space-950">
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 25, 45], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        className="h-full w-full"
      >
        <color attach="background" args={['#05070D']} />

        {/* Ambient deep space starlight */}
        <ambientLight intensity={0.06} />

        {/* Direct Solar Illumination */}
        <directionalLight
          position={[sunLightPos.x, sunLightPos.y, sunLightPos.z]}
          intensity={isSunUp ? 2.2 : 0.0}
          color="#FFFBEB"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.0001}
        />

        {/* Secondary Earthshine illumination */}
        <directionalLight
          position={[earthVector.x * 100, earthVector.y * 100, earthVector.z * 100]}
          intensity={isEarthUp ? 0.2 : 0.0}
          color="#38BDF8"
        />

        {/* Local Terrain Heightmap */}
        <TerrainMesh manifest={manifest} heights={heights} exaggeration={exaggeration} />

        {/* Surface Lander Model at Landing Coordinates (0,0) */}
        <LanderMarker earthDirection={earthVector} />

        {/* Compass & Horizon Ring */}
        <CompassReticle radius={31} />

        {/* Smooth Orbit Camera Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.02} // Prevent camera going beneath ground
          minDistance={3}
          maxDistance={80}
        />
      </Canvas>

      {/* Floating HUD Badges & Metadata */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {manifest.source === 'lola' ? (
            <Badge variant="success" size="md">
              LOLA 20m/px DEM Tile
            </Badge>
          ) : (
            <Badge variant="warning" size="md">
              Simulated terrain (Mock)
            </Badge>
          )}
          <Badge variant="neutral" size="md">
            Tile: {(manifest.width * manifest.metersPerPixel / 1000).toFixed(1)} km × {(manifest.height * manifest.metersPerPixel / 1000).toFixed(1)} km
          </Badge>
        </div>

        <div className="rounded-md border border-space-800 bg-space-950/85 px-3 py-2 font-mono text-[11px] text-slate-300 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <span className="text-amber-400">Sun Elevation:</span>
            <span className="font-semibold text-slate-100">{sunElevDeg.toFixed(2)}°</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sky-400">Earth Elevation:</span>
            <span className="font-semibold text-slate-100">{earthElevDeg.toFixed(2)}°</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-space-800 pt-1 mt-1 text-[10px] text-slate-400">
            <span>Elevation Relief:</span>
            <span>{manifest.minElevationM}m to {manifest.maxElevationM}m</span>
          </div>
        </div>
      </div>

      {/* Floating Controls Overlay: Vertical Exaggeration */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-md border border-space-800 bg-space-950/85 px-3 py-2 font-mono text-xs text-slate-300 backdrop-blur">
        <span>Vertical Exaggeration:</span>
        <div className="flex items-center gap-1">
          {[1.0, 1.5, 2.5, 4.0].map((val) => (
            <Button
              key={val}
              size="sm"
              variant={exaggeration === val ? 'primary' : 'outline'}
              onClick={() => setExaggeration(val)}
              className="px-2 py-0.5 h-6 text-[10px]"
            >
              {val.toFixed(1)}x
            </Button>
          ))}
        </div>
      </div>

      {/* Cardinal direction badges on screen perimeter */}
      <div className="pointer-events-none absolute top-3 right-1/2 translate-x-1/2 font-mono text-[10px] font-bold text-slate-500">
        N (-Z)
      </div>
      <div className="pointer-events-none absolute bottom-3 right-1/2 translate-x-1/2 font-mono text-[10px] font-bold text-slate-500">
        S (+Z)
      </div>
      <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500">
        E (+X)
      </div>
      <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-[10px] font-bold text-slate-500">
        W (-X)
      </div>
    </div>
  );
}
