import { describe, expect, it } from 'vitest';
import { GameSession } from './GameSession.js';

const chart = {
  schema_version: 2 as const,
  song_id: 'demo-song',
  difficulty: 'normal' as const,
  offset_ms: 0,
  notes: [
    { time_ms: 1000, lane: 0, type: 'tap' as const },
    { time_ms: 2000, lane: 1, type: 'tap' as const },
  ],
};

describe('game session', () => {
  it('judges the closest note and tracks combo', () => {
    const session = new GameSession(chart);
    expect(session.judge(0, 1030)).toBe('perfect');
    expect(session.combo).toBe(1);
    expect(session.stats.score).toBe(1000);
  });

  it('processes overdue notes exactly once', () => {
    const session = new GameSession(chart);
    expect(session.processMisses(1400)).toBe(1);
    expect(session.processMisses(1500)).toBe(0);
    expect(session.playerHp).toBe(95);
  });
});

