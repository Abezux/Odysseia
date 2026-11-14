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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none"
    >
      <div className="w-full max-w-md rounded-3xl glass-panel p-6 shadow-2xl border border-glass-border">
        <h2 id="custom-site-title" className="font-sans text-xs font-bold uppercase tracking-wider text-amber">
          Custom Selenographic Coordinates
        </h2>
        <p className="mt-1 font-sans text-xs text-muted">
          Input arbitrary lunar landing coordinates. Ephemeris vectors will be evaluated against a smooth 0° horizon.
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-critical/40 bg-critical/15 p-2.5 font-mono text-xs text-critical">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 font-mono text-xs">
          <div>
            <label htmlFor="custom-site-name" className="block text-muted text-[11px] mb-1">
              Location Label
            </label>
            <input
              id="custom-site-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-panel-border bg-panel px-3 py-2 text-ink focus:border-amber focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="custom-site-lat" className="block text-muted text-[11px] mb-1">
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
                className="w-full rounded-lg border border-panel-border bg-panel px-3 py-2 text-ink focus:border-amber focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="custom-site-lon" className="block text-muted text-[11px] mb-1">
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
                className="w-full rounded-lg border border-panel-border bg-panel px-3 py-2 text-ink focus:border-amber focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="custom-site-elev" className="block text-muted text-[11px] mb-1">
              Elevation above Datum (meters)
            </label>
            <input
              id="custom-site-elev"
              type="number"
              step="1"
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
              className="w-full rounded-lg border border-panel-border bg-panel px-3 py-2 text-ink focus:border-amber focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-panel-border">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Pin Custom Site
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
