import React from 'react';
import * as THREE from 'three';
import { latLonToVector3, GLOBE_RADIUS } from './globeMath';

export interface SubBodyMarkersProps {
  subSolarLatDeg: number;
  subSolarLonDeg: number;
  subEarthLatDeg: number;
  subEarthLonDeg: number;
}

export function SubBodyMarkers({
  subSolarLatDeg,
  subSolarLonDeg,
  subEarthLatDeg,
  subEarthLonDeg
}: SubBodyMarkersProps): React.JSX.Element {
  const sunPos = latLonToVector3(subSolarLatDeg, subSolarLonDeg, GLOBE_RADIUS * 1.002);
  const earthPos = latLonToVector3(subEarthLatDeg, subEarthLonDeg, GLOBE_RADIUS * 1.002);

  return (
    <group name="sub-body-markers">
      {/* Sub-Solar Point Marker (Amber) */}
      <mesh position={sunPos}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#F59E0B" />
      </mesh>
      <mesh position={sunPos}>
        <ringGeometry args={[0.04, 0.055, 32]} />
        <meshBasicMaterial color="#FCD34D" side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>

      {/* Sub-Earth Point Marker (Blue) */}
      <mesh position={earthPos}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#38BDF8" />
      </mesh>
      <mesh position={earthPos}>
        <ringGeometry args={[0.04, 0.055, 32]} />
        <meshBasicMaterial color="#0284C7" side={THREE.DoubleSide} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
