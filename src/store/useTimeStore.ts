import { create } from 'zustand';

export interface TimeState {
  currentTime: Date;
  playbackSpeed: number;
  isPlaying: boolean;
  setTime: (date: Date) => void;
  stepTime: (seconds: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  resetToNow: () => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  currentTime: new Date('2026-11-14T12:00:00.000Z'),
  playbackSpeed: 1,
  isPlaying: false,
  setTime: (date: Date) => set({ currentTime: date }),
  stepTime: (seconds: number) =>
    set((state) => ({
      currentTime: new Date(state.currentTime.getTime() + seconds * 1000)
    })),
  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  resetToNow: () => set({ currentTime: new Date() })
}));
