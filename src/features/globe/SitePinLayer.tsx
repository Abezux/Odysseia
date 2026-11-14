import React from 'react';
import * as THREE from 'three';
import type { Site } from '../../contracts';
import { GLOBE_RADIUS, latLonToVector3 } from './globeMath';

export interface SitePinLayerProps {
  sites: Site[];
  activeSiteId: string;
  onSelectSite: (id: string) => void;
}

export function SitePinLayer({
  sites,
  activeSiteId,
  onSelectSite
}: SitePinLayerProps): React.JSX.Element {
  const getCategoryColor = (category: Site['category']): string => {
    switch (category) {
      case 'artemis_candidate':
        return '#F59E0B'; // Sun amber
      case 'clps':
        return '#10B981'; // Comms green
      case 'international':
        return '#38BDF8'; // Earth blue
      case 'apollo':
      default:
        return '#E2E8F0'; // Slate white
    }
  };

  return (
    <group name="site-pins">
      {sites.map((site) => {
        const pos = latLonToVector3(site.latDeg, site.lonDeg, GLOBE_RADIUS);
        const isActive = site.id === activeSiteId;
        const color = getCategoryColor(site.category);

        // Vector pointing radially outward
        const normal = pos.clone().normalize();
        const pinTop = pos.clone().add(normal.clone().multiplyScalar(isActive ? 0.12 : 0.06));

        return (
          <group
            key={site.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSite(site.id);
            }}
          >
            {/* Base marker on surface */}
            <mesh position={pos}>
              <sphereGeometry args={[isActive ? 0.035 : 0.02, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>

            {/* Stem */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([...pos.toArray(), ...pinTop.toArray()]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color={color} linewidth={isActive ? 2 : 1} />
            </line>

            {/* Top bead */}
            <mesh position={pinTop}>
              <sphereGeometry args={[isActive ? 0.04 : 0.025, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isActive ? 0.8 : 0.3}
              />
            </mesh>

            {/* Pulsing ring around active site */}
            {isActive && (
              <mesh position={pos} lookAt={() => normal}>
                <ringGeometry args={[0.04, 0.06, 32]} />
                <meshBasicMaterial color="#FCD34D" side={THREE.DoubleSide} transparent opacity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
