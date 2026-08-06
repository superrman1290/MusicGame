import { JUDGEMENT_WINDOWS_MS, judgeDelta, type Judgement, type SongChart, type TapNote } from '@music-game/chart-core';

export interface RuntimeNote extends TapNote {
  judged: boolean;
  result?: Exclude<Judgement, 'none'>;
}

export interface GameStats {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  maxCombo: number;
  score: number;
}

export class GameSession {
  readonly notes: RuntimeNote[];
  readonly enemyMaxHp: number;
  playerHp = 100;
  enemyHp: number;
  combo = 0;
  stats: GameStats = { perfect: 0, great: 0, good: 0, miss: 0, maxCombo: 0, score: 0 };

  constructor(readonly chart: SongChart) {
    this.notes = chart.notes.map((note) => ({ ...note, judged: false }));
    this.enemyMaxHp = Math.max(30, this.notes.length * 2);
    this.enemyHp = this.enemyMaxHp;
  }

  judge(lane: number, songTimeMs: number): Judgement {
    let candidate: RuntimeNote | undefined;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const note of this.notes) {
      if (note.judged || note.lane !== lane) continue;
      const delta = Math.abs(note.time_ms - songTimeMs);
      if (delta <= JUDGEMENT_WINDOWS_MS.miss && delta < bestDelta) { candidate = note; bestDelta = delta; }
    }
    if (!candidate) return 'none';
    const result = judgeDelta(candidate.time_ms - songTimeMs);
    if (result === 'none') return 'none';
    this.resolve(candidate, result);
    return result;
  }

  processMisses(songTimeMs: number): number {
    let count = 0;
    for (const note of this.notes) {
      if (!note.judged && songTimeMs - note.time_ms > JUDGEMENT_WINDOWS_MS.miss) {
        this.resolve(note, 'miss');
        count += 1;
      }
    }
    return count;
  }

  get accuracy(): number {
    const hit = this.stats.perfect + this.stats.great + this.stats.good;
    const judged = hit + this.stats.miss;
    return judged === 0 ? 0 : hit / judged;
  }

  private resolve(note: RuntimeNote, result: Exclude<Judgement, 'none'>): void {
    note.judged = true;
    note.result = result;
    this.stats[result] += 1;
    if (result === 'miss') {
      this.combo = 0;
      this.playerHp = Math.max(0, this.playerHp - 5);
      return;
    }
    const damage = result === 'perfect' ? 3 : result === 'great' ? 2 : 1;
    const score = result === 'perfect' ? 1000 : result === 'great' ? 700 : 400;
    this.combo += 1;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
    this.stats.score += score;
    this.enemyHp = Math.max(0, this.enemyHp - damage);
  }
}

