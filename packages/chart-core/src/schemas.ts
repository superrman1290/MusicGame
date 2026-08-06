import { z } from 'zod';

export const SCHEMA_VERSION = 2 as const;
export const DifficultySchema = z.enum(['easy', 'normal', 'hard', 'expert']);
export const SongIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/);
export const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);

export const AudioMetadataSchema = z.object({
  file_name: z.string().min(1).max(255),
  mime_type: z.string().startsWith('audio/'),
  duration_ms: z.number().int().positive(),
  size_bytes: z.number().int().positive(),
  sha256: Sha256Schema,
});

export const TapNoteSchema = z.object({
  time_ms: z.number().int().nonnegative(),
  lane: z.number().int().min(0).max(3),
  type: z.literal('tap'),
});

export const SongChartSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  song_id: SongIdSchema,
  difficulty: DifficultySchema,
  offset_ms: z.number().int().min(-2000).max(2000).default(0),
  notes: z.array(TapNoteSchema).max(100_000),
});

export const SongManifestSchema = z.object({
  schema_version: z.literal(SCHEMA_VERSION),
  id: SongIdSchema,
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().min(1).max(120).default('Unknown Artist'),
  bpm: z.number().min(40).max(300),
  audio: AudioMetadataSchema,
  difficulties: z.array(DifficultySchema).min(1),
}).superRefine((manifest, context) => {
  if (new Set(manifest.difficulties).size !== manifest.difficulties.length) {
    context.addIssue({ code: 'custom', path: ['difficulties'], message: 'Difficulties must be unique' });
  }
});

export const SongSummarySchema = z.object({
  id: SongIdSchema,
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().min(1).max(120),
  bpm: z.number().min(40).max(300),
  difficulties: z.array(DifficultySchema).min(1),
  duration_ms: z.number().int().positive(),
});

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});
