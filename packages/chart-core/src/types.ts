import type { z } from 'zod';
import type {
  ApiErrorSchema,
  AudioMetadataSchema,
  DifficultySchema,
  SongChartSchema,
  SongManifestSchema,
  SongSummarySchema,
  TapNoteSchema,
} from './schemas.js';

export type Difficulty = z.infer<typeof DifficultySchema>;
export type AudioMetadata = z.infer<typeof AudioMetadataSchema>;
export type TapNote = z.infer<typeof TapNoteSchema>;
export type SongChart = z.infer<typeof SongChartSchema>;
export type SongManifest = z.infer<typeof SongManifestSchema>;
export type SongSummary = z.infer<typeof SongSummarySchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export interface PublishSongRequest {
  manifest: SongManifest;
  charts: SongChart[];
  audio: Uint8Array;
}

export interface SongRepository {
  listSongs(): Promise<SongSummary[]>;
  getSong(id: string): Promise<SongManifest>;
  loadChart(id: string, difficulty: Difficulty): Promise<SongChart>;
  getAudioUrl(id: string): string;
  publishSong(request: PublishSongRequest): Promise<SongManifest>;
}
