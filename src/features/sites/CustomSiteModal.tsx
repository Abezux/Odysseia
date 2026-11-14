import React, { useState } from 'react';
import { Button } from '../../ui/Button';

export interface CustomSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (site: { name: string; latDeg: number; lonDeg: number; elevationM: number }) => void;
}

export function CustomSiteModal({
  isOpen,
  onClose,
  onSubmit
}: CustomSiteModalProps): React.JSX.Element | null {
  const [name, setName] = useState('Custom Polar Site');
  const [lat, setLat] = useState('-89.5');
  const [lon, setLon] = useState('45.0');
  const [elevation, setElevation] = useState('500');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const elevNum = parseFloat(elevation);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be a valid number between -90° and +90°');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setError('Longitude must be a valid number between -180° and +180°');
      return;
    }
    if (isNaN(elevNum)) {
      setError('Elevation must be a valid number in meters');
      return;
    }

    setError(null);
    onSubmit({
      name: name.trim() || 'Custom Coordinates',
      latDeg: latNum,
      lonDeg: lonNum,
      elevationM: elevNum
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-site-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-lg border border-space-700 bg-space-900 p-6 shadow-2xl">
        <h2 id="custom-site-title" className="text-sm font-bold uppercase tracking-wider text-sun-amber">
          Input Custom Selenographic Coordinates
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Enter custom lunar coordinates. The engine will evaluate ephemeris and fall back to a smooth 0° horizon.
        </p>

        {error && (
          <div className="mt-3 rounded border border-warning-red/40 bg-rose-950/40 p-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 font-mono text-xs">
          <div>
            <label htmlFor="custom-site-name" className="block text-slate-400 mb-1">
              Location Name
            </label>
            <input
              id="custom-site-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-space-700 bg-space-950 px-2.5 py-1.5 text-slate-200 focus:border-sun-amber focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="custom-site-lat" className="block text-slate-400 mb-1">
                Latitude (-90° to 90°)
              </label>
              <input
                id="custom-site-lat"
                type="number"
                step="0.001"
                min="-90"
                max="90"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full rounded border border-space-700 bg-space-950 px-2.5 py-1.5 text-slate-200 focus:border-sun-amber focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="custom-site-lon" className="block text-slate-400 mb-1">
                Longitude (-180° to 180°)
              </label>
              <input
                id="custom-site-lon"
                type="number"
                step="0.001"
                min="-180"
                max="180"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="w-full rounded border border-space-700 bg-space-950 px-2.5 py-1.5 text-slate-200 focus:border-sun-amber focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="custom-site-elev" className="block text-slate-400 mb-1">
              Elevation (meters above 1737.4 km sphere)
            </label>
            <input
              id="custom-site-elev"
              type="number"
              step="10"
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
              className="w-full rounded border border-space-700 bg-space-950 px-2.5 py-1.5 text-slate-200 focus:border-sun-amber focus:outline-none"
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add Custom Site
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
