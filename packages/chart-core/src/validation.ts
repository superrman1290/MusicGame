import type { AudioMetadata, SongChart, SongManifest } from './types';
import { SongChartSchema, SongManifestSchema } from './schemas';

export const AUDIO_DURATION_TOLERANCE_MS = 250;

export function validateSongProject(manifestInput: unknown, chartInputs: unknown[]): {
  manifest: SongManifest;
  charts: SongChart[];
} {
  const manifest = SongManifestSchema.parse(manifestInput);
  const charts = chartInputs.map((chart) => SongChartSchema.parse(chart));
  const difficulties = new Set(manifest.difficulties);

  if (charts.length !== manifest.difficulties.length) {
    throw new Error('Every manifest difficulty must have exactly one chart');
  }

  const seen = new Set<string>();
  for (const chart of charts) {
    if (chart.song_id !== manifest.id) throw new Error('Chart song_id does not match manifest id');
    if (!difficulties.has(chart.difficulty)) throw new Error('Chart difficulty is not declared by manifest');
    if (seen.has(chart.difficulty)) throw new Error('Chart difficulty is duplicated');
    seen.add(chart.difficulty);
    if (chart.notes.some((note) => note.time_ms > manifest.audio.duration_ms + AUDIO_DURATION_TOLERANCE_MS)) {
      throw new Error('Chart contains a note beyond the bound audio duration');
    }
  }

  return { manifest, charts };
}

export function validateAudioBinding(expected: AudioMetadata, actual: Pick<AudioMetadata, 'sha256' | 'duration_ms' | 'size_bytes'>): string[] {
  const errors: string[] = [];
  if (expected.sha256 !== actual.sha256) errors.push('Audio SHA-256 does not match the song manifest');
  if (Math.abs(expected.duration_ms - actual.duration_ms) > AUDIO_DURATION_TOLERANCE_MS) {
    errors.push('Audio duration does not match the song manifest');
  }
  if (expected.size_bytes !== actual.size_bytes) errors.push('Audio file size does not match the song manifest');
  return errors;
}

