import * as THREE from 'three';

export const GLOBE_RADIUS = 2.0;

export function latLonToVector3(
  latDeg: number,
  lonDeg: number,
  radius = GLOBE_RADIUS
): THREE.Vector3 {
  const phi = (latDeg * Math.PI) / 180;
  const lam = (lonDeg * Math.PI) / 180;

  const y = radius * Math.sin(phi);
  const x = radius * Math.cos(phi) * Math.sin(lam);
  const z = radius * Math.cos(phi) * Math.cos(lam);

  return new THREE.Vector3(x, y, z);
}
