import React from 'react';

/**
 * Slot registry for LunarSite Compare
 * Decouples feature view components from the core app shell layout.
 */

export interface AppSlots {
  TopBarSlot?: React.ReactNode;
  LeftSidebarSlot?: React.ReactNode;
  CenterViewSlot?: React.ReactNode;
  RightDetailSlot?: React.ReactNode;
  BottomTimelineSlot?: React.ReactNode;
}

export const defaultSlots: AppSlots = {
  TopBarSlot: null,
  LeftSidebarSlot: null,
  CenterViewSlot: null,
  RightDetailSlot: null,
  BottomTimelineSlot: null
};
