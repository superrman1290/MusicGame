import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createSineWave } from './audio.js';
import { seedDemoSong } from './seed.js';
import { SongStore } from './store.js';

let dataDirectory: string;
let store: SongStore;

beforeEach(async () => {
  dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'music-game-api-'));
  store = new SongStore(dataDirectory);
  await seedDemoSong(store);
});

afterEach(async () => rm(dataDirectory, { recursive: true, force: true }));

describe('song library API', () => {
  it('lists and retrieves the seeded song, chart, and audio', async () => {
    const app = createApp(store);
    const list = await request(app).get('/api/songs').expect(200);
    expect(list.body).toHaveLength(1);
    await request(app).get('/api/songs/signal-drift').expect(200);
    await request(app).get('/api/songs/signal-drift/charts/normal').expect(200);
    const audio = await request(app).get('/api/songs/signal-drift/audio').expect(200);
    expect(audio.headers['content-type']).toContain('audio/wav');
  });

  it('returns structured errors for unknown songs and invalid difficulties', async () => {
    const app = createApp(store);
    expect((await request(app).get('/api/songs/missing-song').expect(404)).body.error.code).toBe('NOT_FOUND');
    expect((await request(app).get('/api/songs/signal-drift/charts/impossible').expect(400)).body.error.code).toBe('INVALID_REQUEST');
  });

  it('publishes a validated song and rejects duplicate ids', async () => {
    const app = createApp(store);
    const seedManifest = JSON.parse(await readFile(path.join(dataDirectory, 'signal-drift', 'manifest.json'), 'utf8')) as Record<string, unknown>;
    const manifest = { ...seedManifest, id: 'new-song', title: 'New Song' };
    const chart = { schema_version: 2, song_id: 'new-song', difficulty: 'normal', offset_ms: 0, notes: [{ time_ms: 500, lane: 0, type: 'tap' }] };
    const publish = () => request(app).post('/api/songs').field('manifest', JSON.stringify(manifest)).field('charts', JSON.stringify([chart])).attach('audio', createSineWave(2000), { filename: 'new.wav', contentType: 'audio/wav' });
    await publish().expect(201);
    expect((await request(app).get('/api/songs').expect(200)).body).toHaveLength(2);
    expect((await publish().expect(409)).body.error.code).toBe('SONG_EXISTS');
  });
});
