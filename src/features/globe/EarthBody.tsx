import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface EarthBodyProps {
  earthDirection: THREE.Vector3;
  sunDirection: THREE.Vector3;
  currentTime: Date;
  distance?: number;
  radius?: number;
}

/**
 * Custom Earth Shader:
 * - NASA Blue Marble albedo texture
 * - Realistic solar day/night terminator phase
 * - Subtle atmospheric limb glow (Fresnel cyan/blue, airless/space contrast, zero bloom)
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
  radius = 0.40
}: EarthBodyProps): React.JSX.Element {
  const earthMeshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

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

  return (
    <group position={position} name="celestial-earth">
      {/* Tilted polar axis container */}
      <group rotation={[axialTiltRad, 0, 0]}>
        <mesh ref={earthMeshRef}>
          <sphereGeometry args={[radius, 48, 48]} />
          <primitive object={material} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
