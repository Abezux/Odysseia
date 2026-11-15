import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export interface EarthTooltipData {
  distanceKm: number;
  lightTimeSec: number;
  phasePct: number;
  separationDeg: number;
}

interface EarthBodyProps {
  earthDirection: THREE.Vector3;
  sunDirection: THREE.Vector3;
  currentTime: Date;
  distance?: number;
  radius?: number;
  showLabel?: boolean;
  tooltipData?: EarthTooltipData;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

/**
 * Custom Earth Shader:
 * - NASA Blue Marble albedo texture
 * - Realistic solar day/night terminator phase
 * - Subtle atmospheric limb glow (Fresnel cyan/blue, zero bloom)
 */
const EarthShader = {
  uniforms: {
    uSunDirection: { value: new THREE.Vector3(1, 0, 0) },
    uEarthMap: { value: null as THREE.Texture | null },
    uAtmosphereColor: { value: new THREE.Color('#38BDF8') },
    uNightColor: { value: new THREE.Color('#030A1A') }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDirection;
    uniform sampler2D uEarthMap;
    uniform vec3 uAtmosphereColor;
    uniform vec3 uNightColor;

    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec2 vUv;

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 sunDir = normalize(uSunDirection);

      // Solar illumination on Earth
      float NdotL = dot(normal, sunDir);
      float terminator = smoothstep(-0.06, 0.08, NdotL);

      vec4 texColor = texture2D(uEarthMap, vUv);
      vec3 dayAlbedo = texColor.rgb;

      // Realistic phase blending
      vec3 surfaceColor = mix(uNightColor, dayAlbedo * max(0.12, NdotL * 1.15), terminator);

      // Atmospheric limb glow (Fresnel effect)
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.2);

      // Atmosphere is illuminated primarily on the sunlit hemisphere
      float sunlitAtmosphere = smoothstep(-0.15, 0.25, NdotL);
      vec3 atmosphereGlow = uAtmosphereColor * fresnel * sunlitAtmosphere * 0.75;

      gl_FragColor = vec4(surfaceColor + atmosphereGlow, 1.0);
    }
  `
};

export function EarthBody({
  earthDirection,
  sunDirection,
  currentTime,
  distance = 24.0,
  radius = 0.40,
  showLabel = true,
  tooltipData,
  onClick,
  onHover
}: EarthBodyProps): React.JSX.Element {
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Position in space along true ephemeris direction
  const position = useMemo(() => {
    return earthDirection.clone().normalize().multiplyScalar(distance);
  }, [earthDirection, distance]);

  // Shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: sunDirection.clone() },
        uEarthMap: { value: null },
        uAtmosphereColor: { value: new THREE.Color('#38BDF8') },
        uNightColor: { value: new THREE.Color('#030A1A') }
      },
      vertexShader: EarthShader.vertexShader,
      fragmentShader: EarthShader.fragmentShader
    });
  }, []);

  // Load NASA Blue Marble WebP texture
  useEffect(() => {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    const textureUrl = `${baseUrl}/textures/earth-blue-marble.webp`;

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

        material.uniforms.uEarthMap.value = tex;
        material.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn('[EarthBody] Failed to load Earth Blue Marble texture:', err);
      }
    );

    return () => {
      active = false;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [material]);

  // Clean up material
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Diurnal rotation synced with simulation time (Earth rotates 360° per 24 simulated hours)
  useFrame(() => {
    if (material) {
      material.uniforms.uSunDirection.value.copy(sunDirection);
    }
    if (earthMeshRef.current) {
      const timeMs = currentTime.getTime();
      const dayFraction = (timeMs % 86400000) / 86400000;
      earthMeshRef.current.rotation.y = dayFraction * Math.PI * 2;
    }
  });

  // Earth's axial tilt: 23.44° relative to ecliptic normal
  const axialTiltRad = THREE.MathUtils.degToRad(23.44);

  const handlePointerEnter = () => {
    setIsHovered(true);
    onHover?.(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    onHover?.(false);
  };

  return (
    <group position={position} name="celestial-earth">
      {/* Tilted polar axis container */}
      <group rotation={[axialTiltRad, 0, 0]}>
        <mesh
          ref={earthMeshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          onPointerOver={handlePointerEnter}
          onPointerOut={handlePointerLeave}
        >
          <sphereGeometry args={[radius, 48, 48]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>

      {/* Small mono label and hover tooltip */}
      {showLabel && (
        <Html
          position={[0, radius + 0.35, 0]}
          center
          distanceFactor={18}
          style={{ pointerEvents: 'auto', userSelect: 'none' }}
        >
          <div
            className="group relative flex flex-col items-center cursor-pointer"
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <div className="flex items-center gap-1.5 rounded-md border border-sky-400/50 bg-[#0B0A09]/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-400 shadow-md backdrop-blur-xs transition-colors hover:border-sky-300 hover:text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>EARTH</span>
            </div>

            {/* Hover Tooltip Card */}
            {isHovered && tooltipData && (
              <div className="absolute bottom-full mb-2 w-52 rounded-xl border border-panel-border bg-[#0E0C0A]/95 p-2.5 font-mono text-[10px] text-ink shadow-2xl backdrop-blur-md z-50 pointer-events-none">
                <div className="flex items-center justify-between border-b border-panel-border pb-1 mb-1.5 font-bold text-sky-400">
                  <span>EARTH</span>
                  <span className="text-[9px] text-muted font-normal">Click to Focus</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Distance:</span>
                    <span className="font-semibold">{Math.round(tooltipData.distanceKm).toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Light-Time:</span>
                    <span>{tooltipData.lightTimeSec.toFixed(2)} s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Illumination:</span>
                    <span className="text-amber">{tooltipData.phasePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Sep from Sun:</span>
                    <span>{tooltipData.separationDeg.toFixed(1)}°</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
