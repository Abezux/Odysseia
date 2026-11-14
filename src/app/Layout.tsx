import React from 'react';
import type { AppSlots } from './slots';
import { Panel } from '../ui/Panel';
import { Badge } from '../ui/Badge';

export interface LayoutProps {
  slots?: AppSlots;
}

export function Layout({ slots = {} }: LayoutProps): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-space-950 font-sans text-slate-100">
      {/* Top Bar Slot */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-space-800 bg-space-900/90 px-4 backdrop-blur-md z-20">
        {slots.TopBarSlot ?? (
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold tracking-wider text-sun-amber">
                LUNARSITE COMPARE
              </span>
              <Badge variant="neutral" size="sm">
                MISSION CONTROL v0.1.0
              </Badge>
            </div>
            <div className="font-mono text-xs text-slate-400">Time Control Slot Pending</div>
          </div>
        )}
      </header>

      {/* Main Grid: Left Sidebar + Center 3D/View + Right Detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Site Browser */}
        <aside className="w-80 shrink-0 border-r border-space-800 bg-space-900/40 p-3 overflow-hidden flex flex-col">
          {slots.LeftSidebarSlot ?? (
            <Panel title="Site Catalog" className="h-full">
              <p className="text-xs text-slate-400">Site Browser slot ready for Wave 3 (A14).</p>
            </Panel>
          )}
        </aside>

        {/* Center View: Globe / Terrain / Horizon View */}
        <main className="flex-1 flex flex-col overflow-hidden p-3 bg-space-950">
          <div className="flex-1 rounded-lg border border-space-800 bg-space-900/30 overflow-hidden relative">
            {slots.CenterViewSlot ?? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <span className="font-mono text-xs text-slate-500">Center Viewport Slot</span>
                <p className="mt-1 text-sm text-slate-400">
                  Ready for Globe (A7), Terrain (A12), and Horizon Panorama (A13).
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Right Detail: Active Site & Scenario Scorecard */}
        <aside className="w-96 shrink-0 border-l border-space-800 bg-space-900/40 p-3 overflow-hidden flex flex-col">
          {slots.RightDetailSlot ?? (
            <Panel title="Site Telemetry" className="h-full">
              <p className="text-xs text-slate-400">Site Detail & Sky Dial slot ready for Wave 3 (A10).</p>
            </Panel>
          )}
        </aside>
      </div>

      {/* Bottom Timeline Slot */}
      <footer className="h-48 shrink-0 border-t border-space-800 bg-space-900/80 px-3 py-1.5 overflow-hidden">
        {slots.BottomTimelineSlot ?? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-space-800 bg-space-950/40 font-mono text-xs text-slate-500">
            Timeline Strip Slot (A11)
          </div>
        )}
      </footer>
    </div>
  );
}
