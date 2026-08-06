import { describe, expect, it } from 'vitest';
import {
  adjustedSongTimeMs,
  judgeDelta,
  SongChartSchema,
  SongManifestSchema,
  validateAudioBinding,
  validateSongProject,
} from './index.js';

const hash = 'a'.repeat(64);
const manifest = {
  schema_version: 2,
  id: 'demo-song',
  title: 'Demo Song',
  artist: 'MusicGame',
  bpm: 140,
  audio: { file_name: 'demo.wav', mime_type: 'audio/wav', duration_ms: 10_000, size_bytes: 20_000, sha256: hash },
  difficulties: ['normal'],
};
const chart = {
  schema_version: 2,
  song_id: 'demo-song',
  difficulty: 'normal',
  offset_ms: 0,
  notes: [{ time_ms: 1000, lane: 0, type: 'tap' }],
};

describe('song and chart schemas', () => {
  it('accepts a bound song project', () => {
    expect(validateSongProject(manifest, [chart]).charts).toHaveLength(1);
  });

  it('rejects old schema versions and invalid lanes', () => {
    expect(() => SongManifestSchema.parse({ ...manifest, schema_version: 1 })).toThrow();
    expect(() => SongChartSchema.parse({ ...chart, notes: [{ time_ms: 0, lane: 4, type: 'tap' }] })).toThrow();
  });

  it('rejects notes beyond the bound audio', () => {
    expect(() => validateSongProject(manifest, [{ ...chart, notes: [{ time_ms: 11_000, lane: 0, type: 'tap' }] }])).toThrow();
  });

  it('reports hash, duration, and size mismatches', () => {
    expect(validateAudioBinding(manifest.audio, { sha256: 'b'.repeat(64), duration_ms: 11_000, size_bytes: 1 })).toHaveLength(3);
  });
});

describe('judgement timing', () => {
  it('uses inclusive timing windows', () => {
    expect(judgeDelta(80)).toBe('perfect');
    expect(judgeDelta(-150)).toBe('great');
    expect(judgeDelta(251)).toBe('miss');
    expect(judgeDelta(351)).toBe('none');
  });

  it('applies calibration offset to audio time', () => {
    expect(adjustedSongTimeMs(1000, 25)).toBe(975);
  });
});
