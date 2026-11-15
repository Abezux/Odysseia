import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

export interface SunTooltipData {
  distanceKm: number;
  lightTimeMin: number;
  separationDeg: number;
}

interface SunBodyProps {
  sunDirection: THREE.Vector3;
  distance?: number;
  radius?: number;
  showLabel?: boolean;
  tooltipData?: SunTooltipData;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
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
  radius = 0.166,
  showLabel = true,
  tooltipData,
  onClick,
  onHover
}: SunBodyProps): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

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

  const handlePointerEnter = () => {
    setIsHovered(true);
    onHover?.(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    onHover?.(false);
  };

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
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={handlePointerEnter}
        onPointerOut={handlePointerLeave}
      >
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
            <div className="flex items-center gap-1.5 rounded-md border border-amber/60 bg-[#0B0A09]/85 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber shadow-md backdrop-blur-xs transition-colors hover:border-amber-hover hover:text-amber-hover">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              <span>SUN</span>
            </div>

            {/* Hover Tooltip Card */}
            {isHovered && tooltipData && (
              <div className="absolute bottom-full mb-2 w-52 rounded-xl border border-panel-border bg-[#0E0C0A]/95 p-2.5 font-mono text-[10px] text-ink shadow-2xl backdrop-blur-md z-50 pointer-events-none">
                <div className="flex items-center justify-between border-b border-panel-border pb-1 mb-1.5 font-bold text-amber">
                  <span>SUN</span>
                  <span className="text-[9px] text-muted font-normal">Click to Focus</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Distance:</span>
                    <span className="font-semibold">{Math.round(tooltipData.distanceKm).toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Light-Time:</span>
                    <span>{tooltipData.lightTimeMin.toFixed(1)} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Illumination:</span>
                    <span className="text-amber font-semibold">100% (Luminous)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Sep from Sun:</span>
                    <span>0.0°</span>
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
