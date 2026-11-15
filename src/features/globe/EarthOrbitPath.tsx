import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { ephemerisEngine } from '../../lib/ephemeris';
import { latLonToVector3 } from './globeMath';

interface EarthOrbitPathProps {
  currentTime: Date;
  visible?: boolean;
}

const LUNAR_SIDEREAL_PERIOD_DAYS = 27.321661;
const SAMPLE_COUNT = 120;
const AVERAGE_EARTH_MOON_KM = 384400.0;
const COMPRESSED_BASE_DISTANCE = 24.0;

export function EarthOrbitPath({
  currentTime,
  visible = true
}: EarthOrbitPathProps): React.JSX.Element | null {
  // Sample Earth's apparent trajectory over one lunar sidereal month (±13.66 days)
  const { lineGeometry, currentPos } = useMemo(() => {
    if (!visible) {
      return { lineGeometry: null, currentPos: new THREE.Vector3() };
    }

    const halfPeriodMs = (LUNAR_SIDEREAL_PERIOD_DAYS * 86400 * 1000) / 2;
    const startMs = currentTime.getTime() - halfPeriodMs;
    const stepMs = (LUNAR_SIDEREAL_PERIOD_DAYS * 86400 * 1000) / SAMPLE_COUNT;

    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const sampleDate = new Date(startMs + i * stepMs);
      const ephem = ephemerisEngine.sample({ latDeg: 0, lonDeg: 0 }, sampleDate);

      // Distance varies with true ephemeris distance (compressed scale)
      const dist = COMPRESSED_BASE_DISTANCE * (ephem.earth.distanceKm / AVERAGE_EARTH_MOON_KM);
      const pt = latLonToVector3(
        ephem.subEarthCoordinates.latDeg,
        ephem.subEarthCoordinates.lonDeg,
        dist
      );
      points.push(pt);
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);

    // Current time position
    const currentEphem = ephemerisEngine.sample({ latDeg: 0, lonDeg: 0 }, currentTime);
    const currDist = COMPRESSED_BASE_DISTANCE * (currentEphem.earth.distanceKm / AVERAGE_EARTH_MOON_KM);
    const currPos = latLonToVector3(
      currentEphem.subEarthCoordinates.latDeg,
      currentEphem.subEarthCoordinates.lonDeg,
      currDist
    );

    return { lineGeometry: geo, currentPos: currPos };
  }, [currentTime, visible]);

  // Clean up geometry
  useEffect(() => {
    return () => {
      if (lineGeometry) {
        lineGeometry.dispose();
      }
    };
  }, [lineGeometry]);

  if (!visible || !lineGeometry) return null;

  return (
    <group name="earth-orbit-path">
      {/* 27.32-day Apparent Libration Orbit Path */}
      <primitive
        object={
          new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({
              color: '#38BDF8',
              transparent: true,
              opacity: 0.55,
              depthWrite: false
            })
          )
        }
      />

      {/* Orbit Epoch Node Marker at Current Time */}
      <mesh position={currentPos}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#38BDF8" />
      </mesh>
      <mesh position={currentPos}>
        <ringGeometry args={[0.12, 0.16, 32]} />
        <meshBasicMaterial
          color="#7DD3FC"
          side={THREE.DoubleSide}
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
