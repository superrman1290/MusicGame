import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateSongProject } from '@music-game/chart-core';
import { audioExtension, createSineWave, inspectAudio } from './audio.js';
import { SongStore } from './store.js';

export const DEFAULT_DATA_DIRECTORY = fileURLToPath(new URL('../data/songs', import.meta.url));

export async function seedDemoSong(store: SongStore): Promise<void> {
  if (await store.exists('signal-drift')) return;
  const audio = createSineWave(12_000);
  const audioMetadata = await inspectAudio(audio, 'signal-drift.wav', 'audio/wav');
  const manifest = {
    schema_version: 2,
    id: 'signal-drift',
    title: 'Signal Drift',
    artist: 'MusicGame Lab',
    bpm: 120,
    audio: audioMetadata,
    difficulties: ['normal'],
  };
  const chart = {
    schema_version: 2,
    song_id: 'signal-drift',
    difficulty: 'normal',
    offset_ms: 0,
    notes: Array.from({ length: 20 }, (_, index) => ({ time_ms: 1500 + index * 500, lane: index % 4, type: 'tap' })),
  };
  const project = validateSongProject(manifest, [chart]);
  await store.publish({ manifest: project.manifest, charts: project.charts, audio, audioExtension: audioExtension('audio/wav') });
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const store = new SongStore(DEFAULT_DATA_DIRECTORY);
  await seedDemoSong(store);
  console.log(`Seeded songs in ${DEFAULT_DATA_DIRECTORY}`);
}
