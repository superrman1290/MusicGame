import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { DifficultySchema, type SongChart, type SongManifest, validateSongProject } from '@music-game/chart-core';
import { audioExtension, inspectAudio } from './audio.js';
import { SongConflictError, SongNotFoundError, SongStore } from './store.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 1 } });

function apiError(response: Response, status: number, code: string, message: string, details?: unknown): void {
  response.status(status).json({ error: { code, message, ...(details === undefined ? {} : { details }) } });
}

export function createApp(store: SongStore): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.get('/api/songs', async (_request, response, next) => {
    try { response.json(await store.list()); } catch (error) { next(error); }
  });
  app.get('/api/songs/:id', async (request, response, next) => {
    try { response.json(await store.getManifest(request.params.id)); } catch (error) { next(error); }
  });
  app.get('/api/songs/:id/charts/:difficulty', async (request, response, next) => {
    try {
      const difficulty = DifficultySchema.parse(request.params.difficulty);
      response.json(await store.getChart(request.params.id, difficulty));
    } catch (error) { next(error); }
  });
  app.get('/api/songs/:id/audio', async (request, response, next) => {
    try { response.sendFile(await store.getAudioPath(request.params.id)); } catch (error) { next(error); }
  });
  app.post('/api/songs', upload.single('audio'), async (request, response, next) => {
    try {
      if (!request.file) return apiError(response, 400, 'AUDIO_REQUIRED', 'An audio file is required');
      if (typeof request.body.manifest !== 'string' || typeof request.body.charts !== 'string') {
        return apiError(response, 400, 'PROJECT_REQUIRED', 'manifest and charts fields are required');
      }
      const submitted = JSON.parse(request.body.manifest) as SongManifest;
      const charts = JSON.parse(request.body.charts) as SongChart[];
      const computedAudio = await inspectAudio(request.file.buffer, request.file.originalname, request.file.mimetype);
      const project = validateSongProject({ ...submitted, audio: computedAudio }, charts);
      await store.publish({ manifest: project.manifest, charts: project.charts, audio: request.file.buffer, audioExtension: audioExtension(request.file.mimetype) });
      response.status(201).json(project.manifest);
    } catch (error) { next(error); }
  });
  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof SongNotFoundError) return apiError(response, 404, 'NOT_FOUND', error.message);
    if (error instanceof SongConflictError) return apiError(response, 409, 'SONG_EXISTS', error.message);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return apiError(response, 400, 'INVALID_REQUEST', message);
  });
  return app;
}
