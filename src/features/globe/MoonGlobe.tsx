import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useTimeStore } from '../../store/useTimeStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { dataProvider } from '../../lib/data';
import { ephemerisEngine } from '../../lib/ephemeris';
import type { Site } from '../../contracts';
import { LunarSurfaceShader } from './TerminatorShader';
import { SitePinLayer } from './SitePinLayer';
import { SubBodyMarkers } from './SubBodyMarkers';
import { latLonToVector3, GLOBE_RADIUS } from './globeMath';
import { Button } from '../../ui/Button';

interface GlobeMeshProps {
  sunDirection: THREE.Vector3;
  onGlobeClick: (lat: number, lon: number) => void;
}

function GlobeMesh({ sunDirection, onGlobeClick }: GlobeMeshProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: sunDirection.clone() },
        uDayColor: { value: new THREE.Color('#948F85') },
        uNightColor: { value: new THREE.Color('#0B0A09') },
        uTerminatorColor: { value: new THREE.Color('#3D362E') }
      },
      vertexShader: LunarSurfaceShader.vertexShader,
      fragmentShader: LunarSurfaceShader.fragmentShader
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (material) {
      material.uniforms.uSunDirection.value.copy(sunDirection);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!e.point) return;

    // Convert intersection point on sphere into selenographic lat/lon
    const p = e.point.clone().normalize();
    const latDeg = Math.asin(p.y) * (180 / Math.PI);
    let lonDeg = Math.atan2(p.x, p.z) * (180 / Math.PI);
    lonDeg = Number(lonDeg.toFixed(3));
    const cleanLat = Number(latDeg.toFixed(3));

    onGlobeClick(cleanLat, lonDeg);
  };

  return (
    <mesh ref={meshRef} onClick={handleClick}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// South Polar Latitude Ring (-80° circle)
function PolarRings(): React.JSX.Element {
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const lat80 = -80;
    for (let i = 0; i <= 64; i++) {
      const lon = (i / 64) * 360 - 180;
      pts.push(latLonToVector3(lat80, lon, GLOBE_RADIUS * 1.001));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: '#F5A524', transparent: true, opacity: 0.35 });
    return new THREE.Line(geo, mat);
  }, []);

  return <primitive object={line} />;
}

export function MoonGlobeView(): React.JSX.Element {
  const currentTime = useTimeStore((s) => s.currentTime);
  const { activeSiteId, setActiveSiteId } = useScenarioStore();

  const [sites, setSites] = useState<Site[]>([]);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Load sites catalog
  useEffect(() => {
    dataProvider.getCatalog().then((cat) => setSites(cat.sites));
  }, []);

  // Compute live sub-solar and sub-earth positions
  const ephem = useMemo(() => {
    // Reference sample at 0,0 to read sub-body coordinates
    return ephemerisEngine.sample({ latDeg: 0, lonDeg: 0 }, currentTime);
  }, [currentTime]);

  const sunDirection = useMemo(() => {
    return latLonToVector3(
      ephem.subSolarCoordinates.latDeg,
      ephem.subSolarCoordinates.lonDeg,
      1.0
    ).normalize();
  }, [ephem]);

  // Click on globe to select or create a pin
  const handleGlobeClick = (lat: number, lon: number) => {
    console.log(`[MoonGlobe] Surface clicked: Lat ${lat}°, Lon ${lon}°`);
  };

  // Quick focus to South Pole
  const focusSouthPole = () => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, -4.5, 0.2);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // Quick focus to Equator
  const focusEquator = () => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 0, 4.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative h-full w-full select-none bg-[#0B0A09] overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, -3.2, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        className="h-full w-full"
      >
        <color attach="background" args={['#0B0A09']} />
        <ambientLight intensity={0.15} />

        <GlobeMesh sunDirection={sunDirection} onGlobeClick={handleGlobeClick} />
        <PolarRings />

        <SitePinLayer
          sites={sites}
          activeSiteId={activeSiteId}
          onSelectSite={(id) => setActiveSiteId(id)}
        />

        <SubBodyMarkers
          subSolarLatDeg={ephem.subSolarCoordinates.latDeg}
          subSolarLonDeg={ephem.subSolarCoordinates.lonDeg}
          subEarthLatDeg={ephem.subEarthCoordinates.latDeg}
          subEarthLonDeg={ephem.subEarthCoordinates.lonDeg}
        />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={2.5}
          maxDistance={8.0}
          rotateSpeed={0.8}
        />
      </Canvas>

      {/* Floating HUD Controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
        <Button variant="secondary" size="sm" onClick={focusSouthPole}>
          🎯 Focus South Pole
        </Button>
        <Button variant="outline" size="sm" onClick={focusEquator}>
          🌐 Equator View
        </Button>
      </div>

      {/* Ephemeris Legend */}
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 rounded-2xl border border-panel-border bg-panel/90 p-2.5 backdrop-blur-md font-mono text-[11px] text-ink z-10">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber" />
          <span>Sub-Solar: {ephem.subSolarCoordinates.latDeg.toFixed(1)}°N, {ephem.subSolarCoordinates.lonDeg.toFixed(1)}°E</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald" />
          <span>Sub-Earth (Libration): {ephem.subEarthCoordinates.latDeg.toFixed(1)}°N, {ephem.subEarthCoordinates.lonDeg.toFixed(1)}°E</span>
        </div>
      </div>
    </div>
  );
}
