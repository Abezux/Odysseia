import React, { useMemo } from 'react';
import * as THREE from 'three';

interface SunBodyProps {
  sunDirection: THREE.Vector3;
  distance?: number;
  radius?: number;
}

/**
 * Procedural Solar Disc & Subtle Glare Texture
 */
function createSolarGlareTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const cx = 64;
  const cy = 64;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.2, 'rgba(255, 245, 220, 0.8)');
  grad.addColorStop(0.45, 'rgba(245, 165, 36, 0.4)');
  grad.addColorStop(0.8, 'rgba(245, 165, 36, 0.08)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function SunBody({
  sunDirection,
  distance = 36.0,
  radius = 0.166
}: SunBodyProps): React.JSX.Element {
  const sunPos = useMemo(() => {
    return sunDirection.clone().normalize().multiplyScalar(distance);
  }, [sunDirection, distance]);

  const glareTexture = useMemo(() => createSolarGlareTexture(), []);

  // Cleanup texture on unmount
  React.useEffect(() => {
    return () => {
      glareTexture.dispose();
    };
  }, [glareTexture]);

  return (
    <group position={sunPos} name="celestial-sun">
      {/* Directional Sunlight illuminating Moon and Earth */}
      <directionalLight
        position={[0, 0, 0]}
        target-position={[-sunPos.x, -sunPos.y, -sunPos.z]}
        intensity={2.4}
        color="#FFFBF5"
      />

      {/* Visible Solar Disc (apparent angular diameter ~0.53°) */}
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#FFFDF7" />
      </mesh>

      {/* Subtle Radial Lens Glare Sprite (no bloom post-processing) */}
      <sprite scale={[radius * 4.2, radius * 4.2, 1]}>
        <spriteMaterial
          map={glareTexture}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}
