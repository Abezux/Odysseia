import React from 'react';
import type { AppSlots } from './slots';

export interface LayoutProps {
  slots?: AppSlots;
}

export function Layout({ slots = {} }: LayoutProps): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0B0A09] font-sans text-ink select-none">
      {/* Top Bar Slot (view-transition-name: toolbar) */}
      {slots.TopBarSlot}

      {/* Main Three-Column Area: Left Sidebar + Center Workspace + Right Utility */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar Slot (view-transition-name: main-nav) */}
        {slots.LeftSidebarSlot}

        {/* Center Workspace Slot (view-transition-name: main-content) */}
        <main className="flex-1 flex flex-col overflow-y-auto min-w-0 bg-[#0B0A09]">
          {slots.CenterViewSlot}
        </main>

        {/* Right Utility Column Slot */}
        {slots.RightDetailSlot}
      </div>

      {/* Bottom Timeline Dock Slot */}
      {slots.BottomTimelineSlot}
    </div>
  );
}
