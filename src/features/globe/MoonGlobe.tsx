import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { Target, Globe, RotateCcw } from 'lucide-react';
import { useTimeStore } from '../../store/useTimeStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { dataProvider } from '../../lib/data';
import { ephemerisEngine } from '../../lib/ephemeris';
import type { Site } from '../../contracts';
import { LunarSurfaceShader } from './TerminatorShader';
import { SitePinLayer } from './SitePinLayer';
import { SubBodyMarkers } from './SubBodyMarkers';
import { EarthBody } from './EarthBody';
import { SunBody } from './SunBody';
import { Starfield } from './Starfield';
import { EarthOrbitPath } from './EarthOrbitPath';
import { latLonToVector3, GLOBE_RADIUS } from './globeMath';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui';

export interface GlobeLayers {
  celestialBodies?: boolean;
  orbitPath?: boolean;
  labels?: boolean;
  starfield?: boolean;
  siteMarkers?: boolean;
  terminator?: boolean;
  earthVector?: boolean;
  shadowMap?: boolean;
}

interface GlobeMeshProps {
  sunDirection: THREE.Vector3;
  onGlobeClick: (lat: number, lon: number) => void;
  focusedBody?: 'earth' | 'sun' | 'southPole' | 'equator' | null;
  onResetView?: () => void;
}

function GlobeMesh({
  sunDirection,
  onGlobeClick,
  focusedBody,
  onResetView
}: GlobeMeshProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: sunDirection.clone() },
        uDayColor: { value: new THREE.Color('#948F85') },
        uNightColor: { value: new THREE.Color('#0B0A09') },
        uTerminatorColor: { value: new THREE.Color('#3D362E') },
        uAlbedoMap: { value: null },
        uHasTexture: { value: 0.0 }
      },
      vertexShader: LunarSurfaceShader.vertexShader,
      fragmentShader: LunarSurfaceShader.fragmentShader
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load authentic NASA LROC WAC global albedo map
  useEffect(() => {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const textureFile = isMobile ? 'moon-lroc-wac-2k.webp' : 'moon-lroc-wac-4k.webp';
    const textureUrl = `${baseUrl}/textures/${textureFile}`;

    let active = true;
    const loader = new THREE.TextureLoader();

    loader.load(
      textureUrl,
      (tex) => {
        if (!active) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        textureRef.current = tex;

        if (material) {
          material.uniforms.uAlbedoMap.value = tex;
          material.uniforms.uHasTexture.value = 1.0;
          material.needsUpdate = true;
        }
      },
      undefined,
      (err) => {
        console.warn('[MoonGlobe] Failed to load NASA LROC texture, falling back to base albedo:', err);
      }
    );

    return () => {
      active = false;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (material) {
        material.uniforms.uAlbedoMap.value = null;
        material.uniforms.uHasTexture.value = 0.0;
      }
    };
  }, [material]);

  // Clean up material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame(() => {
    if (material) {
      material.uniforms.uSunDirection.value.copy(sunDirection);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (focusedBody) {
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'auto';
      }
      onResetView?.();
      return;
    }
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
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={() => {
        if (focusedBody && typeof document !== 'undefined') {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'auto';
        }
      }}
    >
      <sphereGeometry args={[GLOBE_RADIUS, 96, 96, -Math.PI / 2]} />
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

interface CameraTarget {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/**
 * Smooth Camera Animation Controller (0.6s ease, honoring prefers-reduced-motion)
 */
function GlobeCameraController({
  cameraTarget,
  onTransitionEnd,
  controlsRef
}: {
  cameraTarget: CameraTarget | null;
  onTransitionEnd: () => void;
  controlsRef: React.RefObject<OrbitControlsImpl>;
}): null {
  const { camera } = useThree();
  const animRef = useRef<{
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (!cameraTarget) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      camera.position.copy(cameraTarget.position);
      if (controlsRef.current) {
        controlsRef.current.target.copy(cameraTarget.target);
        controlsRef.current.update();
      }
      onTransitionEnd();
      return;
    }

    const currentTarget = controlsRef.current
      ? controlsRef.current.target.clone()
      : new THREE.Vector3(0, 0, 0);

    animRef.current = {
      startPos: camera.position.clone(),
      endPos: cameraTarget.position.clone(),
      startTarget: currentTarget,
      endTarget: cameraTarget.target.clone(),
      startTime: performance.now(),
      duration: 600 // 0.6 seconds
    };
  }, [cameraTarget, camera, controlsRef, onTransitionEnd]);

  useFrame(() => {
    if (!animRef.current) return;
    const { startPos, endPos, startTarget, endTarget, startTime, duration } = animRef.current;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1.0, elapsed / duration);

    // Smoothstep ease
    const ease = progress * progress * (3 - 2 * progress);

    camera.position.lerpVectors(startPos, endPos, ease);
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(startTarget, endTarget, ease);
      controlsRef.current.update();
    }

    if (progress >= 1.0) {
      animRef.current = null;
      onTransitionEnd();
    }
  });

  return null;
}

export interface MoonGlobeViewProps {
  layers?: GlobeLayers;
  hideDetails?: boolean;
  isFullscreen?: boolean;
}

export function MoonGlobeView({
  layers,
  hideDetails = false,
  isFullscreen = false
}: MoonGlobeViewProps): React.JSX.Element {
  const currentTime = useTimeStore((s) => s.currentTime);
  const { activeSiteId, setActiveSiteId } = useScenarioStore();

  const [sites, setSites] = useState<Site[]>([]);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Default active layers if not provided
  const activeLayers = useMemo<Required<GlobeLayers>>(() => ({
    celestialBodies: layers?.celestialBodies ?? true,
    orbitPath: layers?.orbitPath ?? false,
    labels: layers?.labels ?? true,
    starfield: layers?.starfield ?? true,
    siteMarkers: layers?.siteMarkers ?? true,
    terminator: layers?.terminator ?? true,
    earthVector: layers?.earthVector ?? true,
    shadowMap: layers?.shadowMap ?? true
  }), [layers]);

  // Camera focus animation state
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [focusedBody, setFocusedBody] = useState<'earth' | 'sun' | 'southPole' | 'equator' | null>(null);
  const previousCameraRef = useRef<CameraTarget | null>(null);

  // Load sites catalog
  useEffect(() => {
    dataProvider.getCatalog().then((cat) => setSites(cat.sites));
  }, []);

  // Compute live sub-solar and sub-earth positions
  const ephem = useMemo(() => {
    return ephemerisEngine.sample({ latDeg: 0, lonDeg: 0 }, currentTime);
  }, [currentTime]);

  const sunDirection = useMemo(() => {
    return latLonToVector3(
      ephem.subSolarCoordinates.latDeg,
      ephem.subSolarCoordinates.lonDeg,
      1.0
    ).normalize();
  }, [ephem]);

  const earthDirection = useMemo(() => {
    return latLonToVector3(
      ephem.subEarthCoordinates.latDeg,
      ephem.subEarthCoordinates.lonDeg,
      1.0
    ).normalize();
  }, [ephem]);

  // Compressed Earth distance varying with true ephemeris distance
  const earthCompressedDistance = useMemo(() => {
    return 24.0 * (ephem.earth.distanceKm / 384400.0);
  }, [ephem.earth.distanceKm]);

  // Angular separation between Sun and Earth
  const sunEarthSeparationDeg = useMemo(() => {
    const dot = THREE.MathUtils.clamp(sunDirection.dot(earthDirection), -1, 1);
    return THREE.MathUtils.radToDeg(Math.acos(dot));
  }, [sunDirection, earthDirection]);

  // Reset Camera View to previous or default
  const resetCameraView = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'auto';
    }
    const defaultTarget: CameraTarget = previousCameraRef.current || {
      position: new THREE.Vector3(0, -3.2, 3.2),
      target: new THREE.Vector3(0, 0, 0)
    };
    setCameraTarget(defaultTarget);
    setFocusedBody(null);
    previousCameraRef.current = null;
  }, []);

  // Click on globe to select or create a pin, or reset view if focused on another body
  const handleGlobeClick = useCallback((lat: number, lon: number) => {
    if (focusedBody) {
      resetCameraView();
      return;
    }
    console.log(`[MoonGlobe] Surface clicked: Lat ${lat}°, Lon ${lon}°`);
  }, [focusedBody, resetCameraView]);

  // Clean up cursor on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'auto';
      }
    };
  }, []);

  // Focus Earth
  const focusEarth = useCallback(() => {
    if (controlsRef.current) {
      if (!focusedBody) {
        previousCameraRef.current = {
          position: controlsRef.current.object.position.clone(),
          target: controlsRef.current.target.clone()
        };
      }
      const earthPos = latLonToVector3(
        ephem.subEarthCoordinates.latDeg,
        ephem.subEarthCoordinates.lonDeg,
        earthCompressedDistance
      );
      // Place camera 1.8 units along view direction from Earth
      const camPos = earthPos.clone().add(new THREE.Vector3(0, 0.4, 1.8));
      setCameraTarget({ target: earthPos, position: camPos });
      setFocusedBody('earth');
    }
  }, [controlsRef, focusedBody, ephem, earthCompressedDistance]);

  // Focus Sun
  const focusSun = useCallback(() => {
    if (controlsRef.current) {
      if (!focusedBody) {
        previousCameraRef.current = {
          position: controlsRef.current.object.position.clone(),
          target: controlsRef.current.target.clone()
        };
      }
      const sunPos = sunDirection.clone().multiplyScalar(36.0);
      const camPos = sunPos.clone().sub(sunDirection.clone().multiplyScalar(3.0));
      setCameraTarget({ target: sunPos, position: camPos });
      setFocusedBody('sun');
    }
  }, [controlsRef, focusedBody, sunDirection]);

  // Quick focus to South Pole
  const focusSouthPole = () => {
    setCameraTarget({
      position: new THREE.Vector3(0, -4.5, 0.2),
      target: new THREE.Vector3(0, 0, 0)
    });
    setFocusedBody('southPole');
  };

  // Quick focus to Equator
  const focusEquator = () => {
    setCameraTarget({
      position: new THREE.Vector3(0, 0, 4.5),
      target: new THREE.Vector3(0, 0, 0)
    });
    setFocusedBody('equator');
  };

  return (
    <div className="relative h-full w-full select-none bg-[#0B0A09] overflow-hidden">
      {/* Slot Top-Left: Provenance HUD Badges */}
      <div
        className={`pointer-events-none absolute z-panel flex flex-col gap-1.5 transition-all duration-250 ${
          isFullscreen
            ? hideDetails
              ? 'top-4 left-4 opacity-100'
              : 'top-4 left-4 mt-[200px] opacity-100'
            : 'top-3 left-3 opacity-100'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Badge variant="success" size="sm">
            NASA LRO / LROC WAC 4K
          </Badge>
          <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
            Global Albedo
          </Badge>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, -3.2, 3.2], fov: 45, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio : 1)}
        className="h-full w-full"
      >
        <color attach="background" args={['#050403']} />
        <ambientLight intensity={0.12} />

        {/* Camera Transition Controller */}
        <GlobeCameraController
          cameraTarget={cameraTarget}
          onTransitionEnd={() => setCameraTarget(null)}
          controlsRef={controlsRef}
        />

        {/* Real Celestial Starfield (Yale / Hipparcos bright star catalog) */}
        {activeLayers.starfield && <Starfield />}

        {/* Ephemeris Orbit Path (27.32d sidereal loop with current epoch node) */}
        <EarthOrbitPath
          currentTime={currentTime}
          visible={activeLayers.orbitPath && activeLayers.celestialBodies}
        />

        {/* Ephemeris Sun & Earth in Deep Space */}
        {activeLayers.celestialBodies && (
          <>
            <SunBody
              sunDirection={sunDirection}
              showLabel={activeLayers.labels}
              tooltipData={{
                distanceKm: ephem.sun.distanceKm,
                lightTimeMin: ephem.sun.distanceKm / 299792.458 / 60,
                separationDeg: 0.0
              }}
              onClick={focusSun}
            />
            <EarthBody
              earthDirection={earthDirection}
              sunDirection={sunDirection}
              currentTime={currentTime}
              distance={earthCompressedDistance}
              showLabel={activeLayers.labels}
              tooltipData={{
                distanceKm: ephem.earth.distanceKm,
                lightTimeSec: ephem.earth.distanceKm / 299792.458,
                phasePct: Math.round(ephem.earth.phaseFraction * 100),
                separationDeg: sunEarthSeparationDeg
              }}
              onClick={focusEarth}
            />
          </>
        )}

        <GlobeMesh
          sunDirection={sunDirection}
          onGlobeClick={handleGlobeClick}
          focusedBody={focusedBody}
          onResetView={resetCameraView}
        />
        <PolarRings />

        {/* Clickable Hit-Target & Label for Moon when camera is focused on Sun, Earth, or other bodies */}
        {focusedBody && (
          <>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                resetCameraView();
              }}
              onPointerOver={() => {
                if (typeof document !== 'undefined') {
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={() => {
                if (typeof document !== 'undefined') {
                  document.body.style.cursor = 'auto';
                }
              }}
            >
              <sphereGeometry args={[GLOBE_RADIUS * 1.5, 32, 32]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {activeLayers.labels && (
              <Html
                position={[0, GLOBE_RADIUS + 0.35, 0]}
                center
                distanceFactor={18}
                style={{ pointerEvents: 'auto', userSelect: 'none' }}
              >
                <div
                  className="group relative flex flex-col items-center cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetCameraView();
                  }}
                >
                  <div className="flex items-center gap-1.5 rounded-md border border-amber/60 bg-[#0B0A09]/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber shadow-md backdrop-blur-xs transition-colors hover:border-amber-hover hover:text-amber-hover">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                    <span>MOON</span>
                    <span className="text-[9px] text-muted font-normal hidden sm:inline">(Click to Reset)</span>
                  </div>
                </div>
              </Html>
            )}
          </>
        )}

        {activeLayers.siteMarkers && (
          <SitePinLayer
            sites={sites}
            activeSiteId={activeSiteId}
            onSelectSite={(id) => setActiveSiteId(id)}
          />
        )}

        {activeLayers.earthVector && (
          <SubBodyMarkers
            subSolarLatDeg={ephem.subSolarCoordinates.latDeg}
            subSolarLonDeg={ephem.subSolarCoordinates.lonDeg}
            subEarthLatDeg={ephem.subEarthCoordinates.latDeg}
            subEarthLonDeg={ephem.subEarthCoordinates.lonDeg}
          />
        )}

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={1.2}
          maxDistance={45.0}
          rotateSpeed={0.8}
        />
      </Canvas>

      {/* Slot Bottom-Left: Floating Camera HUD Controls */}
      <div
        className={`absolute z-panel flex items-center gap-2 transition-all duration-250 ${
          isFullscreen
            ? hideDetails
              ? 'bottom-4 left-4'
              : 'bottom-[235px] left-4'
            : 'bottom-3 sm:bottom-4 left-3 sm:left-4'
        }`}
      >
        {focusedBody ? (
          <Button
            variant="primary"
            size="sm"
            onClick={resetCameraView}
            className="flex items-center gap-1.5 shadow-lg"
          >
            <Icon icon={RotateCcw} size={16} />
            <span>Reset View (Moon)</span>
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={focusSouthPole} className="flex items-center gap-1.5">
              <Icon icon={Target} size={16} />
              <span>Focus South Pole</span>
            </Button>
            <Button variant="outline" size="sm" onClick={focusEquator} className="flex items-center gap-1.5">
              <Icon icon={Globe} size={16} />
              <span>Equator View</span>
            </Button>
          </>
        )}
      </div>

      {/* Slot Top-Right: Ephemeris Legend (flowed below the top-right toolbar) */}
      <div
        className={`absolute top-13 sm:top-14 right-3 sm:right-4 z-panel flex flex-col gap-1.5 rounded-2xl border border-panel-border bg-panel/90 p-2.5 backdrop-blur-md font-mono text-[11px] text-ink shadow-lg max-w-[280px] max-h-[30vh] overflow-y-auto transition-opacity duration-250 ${
          hideDetails ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber shadow-xs shrink-0" />
          <span className="truncate">Sub-Solar: {ephem.subSolarCoordinates.latDeg.toFixed(1)}°N, {ephem.subSolarCoordinates.lonDeg.toFixed(1)}°E (0.53°)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400 shadow-xs shrink-0" />
          <span className="truncate">Sub-Earth: {ephem.subEarthCoordinates.latDeg.toFixed(1)}°N, {ephem.subEarthCoordinates.lonDeg.toFixed(1)}°E (1.91°)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted border-t border-panel-border/60 pt-1 mt-0.5">
          <span>Phase: {Math.round(ephem.earth.phaseFraction * 100)}% · 23.4° Tilt</span>
        </div>
      </div>
    </div>
  );
}
