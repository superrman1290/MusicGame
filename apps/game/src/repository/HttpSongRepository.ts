import {
  SongChartSchema,
  SongManifestSchema,
  SongSummarySchema,
  type Difficulty,
  type PublishSongRequest,
  type SongChart,
  type SongManifest,
  type SongRepository,
  type SongSummary,
} from '@music-game/chart-core';

async function expectJson(response: Response): Promise<unknown> {
  const payload = await response.json() as unknown;
  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload
      ? String((payload as { error?: { message?: string } }).error?.message ?? response.statusText)
      : response.statusText;
    throw new Error(message);
  }
  return payload;
}

export class HttpSongRepository implements SongRepository {
  constructor(private readonly baseUrl = '/api') {}

  async listSongs(): Promise<SongSummary[]> {
    return SongSummarySchema.array().parse(await expectJson(await fetch(`${this.baseUrl}/songs`)));
  }

  async getSong(id: string): Promise<SongManifest> {
    return SongManifestSchema.parse(await expectJson(await fetch(`${this.baseUrl}/songs/${encodeURIComponent(id)}`)));
  }

  async loadChart(id: string, difficulty: Difficulty): Promise<SongChart> {
    return SongChartSchema.parse(await expectJson(await fetch(`${this.baseUrl}/songs/${encodeURIComponent(id)}/charts/${difficulty}`)));
  }

  getAudioUrl(id: string): string {
    return `${this.baseUrl}/songs/${encodeURIComponent(id)}/audio`;
  }

  async publishSong(request: PublishSongRequest): Promise<SongManifest> {
    const form = new FormData();
    form.set('manifest', JSON.stringify(request.manifest));
    form.set('charts', JSON.stringify(request.charts));
    const bytes = new Uint8Array(request.audio);
    form.set('audio', new Blob([bytes.buffer], { type: request.manifest.audio.mime_type }), request.manifest.audio.file_name);
    return SongManifestSchema.parse(await expectJson(await fetch(`${this.baseUrl}/songs`, { method: 'POST', body: form })));
  }
}

export const songRepository = new HttpSongRepository();

