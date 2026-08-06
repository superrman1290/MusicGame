import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  SongChartSchema,
  SongIdSchema,
  SongManifestSchema,
  type Difficulty,
  type SongChart,
  type SongManifest,
  type SongSummary,
} from '@music-game/chart-core';

export class SongConflictError extends Error {}
export class SongNotFoundError extends Error {}

export interface StoredSongInput {
  manifest: SongManifest;
  charts: SongChart[];
  audio: Buffer;
  audioExtension: string;
}

export class SongStore {
  constructor(readonly dataDirectory: string) {}

  private validateId(id: string): void {
    if (!SongIdSchema.safeParse(id).success) throw new SongNotFoundError('Song not found');
  }

  private songDirectory(id: string): string {
    this.validateId(id);
    return path.join(this.dataDirectory, id);
  }

  async exists(id: string): Promise<boolean> {
    try { await access(this.songDirectory(id)); return true; } catch { return false; }
  }

  async list(): Promise<SongSummary[]> {
    await mkdir(this.dataDirectory, { recursive: true });
    const entries = await readdir(this.dataDirectory, { withFileTypes: true });
    const manifests = await Promise.all(entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => this.getManifest(entry.name)));
    return manifests.map((manifest) => ({
      id: manifest.id,
      title: manifest.title,
      artist: manifest.artist,
      bpm: manifest.bpm,
      difficulties: manifest.difficulties,
      duration_ms: manifest.audio.duration_ms,
    })).sort((left, right) => left.title.localeCompare(right.title));
  }

  async getManifest(id: string): Promise<SongManifest> {
    try {
      const input = JSON.parse(await readFile(path.join(this.songDirectory(id), 'manifest.json'), 'utf8')) as unknown;
      return SongManifestSchema.parse(input);
    } catch (error) {
      if (error instanceof SongNotFoundError) throw error;
      throw new SongNotFoundError('Song not found');
    }
  }

  async getChart(id: string, difficulty: Difficulty): Promise<SongChart> {
    try {
      const input = JSON.parse(await readFile(path.join(this.songDirectory(id), 'charts', `${difficulty}.json`), 'utf8')) as unknown;
      return SongChartSchema.parse(input);
    } catch (error) {
      if (error instanceof SongNotFoundError) throw error;
      throw new SongNotFoundError('Chart not found');
    }
  }

  async getAudioPath(id: string): Promise<string> {
    try {
      const directory = this.songDirectory(id);
      const file = (await readdir(directory)).find((entry) => entry.startsWith('audio.'));
      if (!file) throw new Error('missing audio');
      return path.join(directory, file);
    } catch (error) {
      if (error instanceof SongNotFoundError) throw error;
      throw new SongNotFoundError('Audio not found');
    }
  }

  async publish(input: StoredSongInput): Promise<void> {
    await mkdir(this.dataDirectory, { recursive: true });
    const destination = this.songDirectory(input.manifest.id);
    if (await this.exists(input.manifest.id)) throw new SongConflictError('Song id already exists');
    const temporary = path.join(this.dataDirectory, `.tmp-${input.manifest.id}-${randomUUID()}`);
    try {
      await mkdir(path.join(temporary, 'charts'), { recursive: true });
      await writeFile(path.join(temporary, 'manifest.json'), `${JSON.stringify(input.manifest, null, 2)}\n`);
      await Promise.all(input.charts.map((chart) => writeFile(path.join(temporary, 'charts', `${chart.difficulty}.json`), `${JSON.stringify(chart, null, 2)}\n`)));
      await writeFile(path.join(temporary, `audio${input.audioExtension}`), input.audio);
      await rename(temporary, destination);
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      throw error;
    }
  }
}

