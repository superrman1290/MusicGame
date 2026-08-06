export const JUDGEMENT_WINDOWS_MS = {
  perfect: 80,
  great: 150,
  good: 250,
  miss: 350,
} as const;

export type Judgement = keyof typeof JUDGEMENT_WINDOWS_MS | 'none';

export function adjustedSongTimeMs(audioTimeMs: number, offsetMs: number): number {
  return audioTimeMs - offsetMs;
}

export function judgeDelta(deltaMs: number): Judgement {
  const absolute = Math.abs(deltaMs);
  if (absolute <= JUDGEMENT_WINDOWS_MS.perfect) return 'perfect';
  if (absolute <= JUDGEMENT_WINDOWS_MS.great) return 'great';
  if (absolute <= JUDGEMENT_WINDOWS_MS.good) return 'good';
  if (absolute <= JUDGEMENT_WINDOWS_MS.miss) return 'miss';
  return 'none';
}

