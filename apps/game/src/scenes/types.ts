import type { SongChart, SongManifest, SongSummary } from '@music-game/chart-core';

export interface LoadedSong {
  manifest: SongManifest;
  chart: SongChart;
  audioContext: AudioContext;
  audioBuffer: AudioBuffer;
}

export interface SongListData { songs: SongSummary[]; error?: string; }

