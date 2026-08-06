import Phaser from 'phaser';
import { adjustedSongTimeMs, type Judgement } from '@music-game/chart-core';
import { AudioClock } from '../audio/AudioClock.js';
import { GameSession } from '../gameplay/GameSession.js';
import type { LoadedSong } from './types.js';

interface PlayData { loaded: LoadedSong; }
const LANE_COLORS = [0x4fc3f7, 0x81c784, 0xffb74d, 0xe57373];
const LANE_KEYS = ['D', 'F', 'J', 'K'];
const LANE_X = [245, 385, 525, 665];
const BASELINE_Y = 460;
const VISIBLE_MS = 2200;

export class PlayScene extends Phaser.Scene {
  private loaded!: LoadedSong;
  private clock!: AudioClock;
  private session!: GameSession;
  private graphics!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;
  private countdownStartedAt = 0;
  private audioStarted = false;
  private paused = false;
  private laneFlash = [0, 0, 0, 0];
  private finished = false;

  constructor() { super('play'); }
  init(data: PlayData): void { this.loaded = data.loaded; }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a13');
    this.clock = new AudioClock(this.loaded.audioContext, this.loaded.audioBuffer);
    this.session = new GameSession(this.loaded.chart);
    this.graphics = this.add.graphics();
    this.hud = this.add.text(28, 20, '', { fontFamily: 'system-ui', fontSize: '14px', color: '#ddddE5' });
    this.add.text(480, 20, this.loaded.manifest.title, { fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5, 0);
    this.message = this.add.text(480, 275, '3', { fontFamily: 'system-ui', fontSize: '64px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(930, 20, 'P 暂停', { fontFamily: 'system-ui', fontSize: '12px', color: '#777789' }).setOrigin(1, 0);
    LANE_KEYS.forEach((key, lane) => this.add.text((LANE_X[lane] ?? 0) + 55, 515, key, {
      fontFamily: 'system-ui', fontSize: '18px', fontStyle: 'bold', color: `#${(LANE_COLORS[lane] ?? 0xffffff).toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5));
    this.countdownStartedAt = this.time.now;
    LANE_KEYS.forEach((key, lane) => this.input.keyboard?.on(`keydown-${key}`, () => this.handleLane(lane)));
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-R', () => this.restartSong());
    this.input.keyboard?.on('keydown-Q', () => this.exitToLibrary());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clock.stop());
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    if (!this.audioStarted) {
      const remaining = 3000 - (this.time.now - this.countdownStartedAt);
      if (remaining > 0) { this.message.setText(String(Math.ceil(remaining / 1000))); this.draw(0); return; }
      this.audioStarted = true;
      this.message.setText('');
      void this.clock.start();
    }
    if (this.paused) { this.draw(this.clock.currentTimeMs); return; }
    const songTime = adjustedSongTimeMs(this.clock.currentTimeMs, this.loaded.chart.offset_ms);
    if (this.clock.isRunning) this.session.processMisses(songTime);
    this.laneFlash = this.laneFlash.map((value) => Math.max(0, value - delta / 180));
    this.draw(songTime);
    if (this.session.playerHp <= 0 || this.clock.currentTimeMs >= this.clock.durationMs - 20) this.finish();
  }

  private handleLane(lane: number): void {
    if (!this.audioStarted || this.paused || this.finished) return;
    this.laneFlash[lane] = 1;
    const result = this.session.judge(lane, adjustedSongTimeMs(this.clock.currentTimeMs, this.loaded.chart.offset_ms));
    if (result !== 'none') this.showJudgement(result);
  }

  private showJudgement(result: Exclude<Judgement, 'none'>): void {
    const colors: Record<string, string> = { perfect: '#ffd54f', great: '#4fc3f7', good: '#81c784', miss: '#e57373' };
    this.message.setText(result.toUpperCase()).setColor(colors[result] ?? '#ffffff').setFontSize(24).setAlpha(1);
    this.tweens.add({ targets: this.message, y: 245, alpha: 0, duration: 420, onComplete: () => this.message.setY(275) });
  }

  private togglePause(): void {
    if (!this.audioStarted || this.finished) return;
    this.paused = !this.paused;
    if (this.paused) { this.clock.pause(); this.message.setAlpha(1).setY(275).setColor('#ffffff').setFontSize(28).setText('已暂停\n\nP 继续   R 重试   Q 返回'); }
    else { this.message.setText(''); void this.clock.start(); }
  }

  private restartSong(): void {
    if (this.finished) return;
    this.clock.stop();
    this.scene.restart({ loaded: this.loaded });
  }

  private exitToLibrary(): void {
    this.clock.stop();
    void this.loaded.audioContext.close();
    this.scene.start('boot');
  }

  private finish(): void {
    this.finished = true;
    this.clock.stop();
    const won = this.session.playerHp > 0 && this.session.enemyHp <= 0;
    this.scene.start('result', { loaded: this.loaded, stats: this.session.stats, accuracy: this.session.accuracy, won });
  }

  private draw(songTimeMs: number): void {
    this.graphics.clear();
    this.graphics.fillStyle(0x10101b, 1).fillRect(170, 55, 620, 500);
    for (let lane = 0; lane < 4; lane += 1) {
      const x = LANE_X[lane] ?? 0;
      this.graphics.fillStyle(0x151522, 1).fillRect(x, 80, 110, 420);
      this.graphics.lineStyle(1, LANE_COLORS[lane] ?? 0xffffff, 0.18).strokeRect(x, 80, 110, 420);
      if ((this.laneFlash[lane] ?? 0) > 0) this.graphics.fillStyle(LANE_COLORS[lane] ?? 0xffffff, (this.laneFlash[lane] ?? 0) * 0.18).fillRect(x, 80, 110, 420);
      this.graphics.fillStyle(LANE_COLORS[lane] ?? 0xffffff, 0.9).fillRect(x, BASELINE_Y, 110, 4);
    }
    for (const note of this.session.notes) {
      if (note.judged) continue;
      const until = note.time_ms - songTimeMs;
      if (until < -350 || until > VISIBLE_MS) continue;
      const progress = 1 - until / VISIBLE_MS;
      const x = (LANE_X[note.lane] ?? 0) + 12;
      const y = 88 + progress * (BASELINE_Y - 88);
      this.graphics.fillStyle(LANE_COLORS[note.lane] ?? 0xffffff, 1).fillRoundedRect(x, y, 86, 20, 4);
      this.graphics.fillStyle(0xffffff, 0.28).fillRect(x + 4, y + 3, 78, 3);
    }
    const playerRatio = this.session.playerHp / 100;
    const enemyRatio = this.session.enemyHp / this.session.enemyMaxHp;
    this.graphics.fillStyle(0x242430).fillRect(28, 84, 90, 12).fillRect(842, 84, 90, 12);
    this.graphics.fillStyle(0x3dc679).fillRect(28, 84, 90 * playerRatio, 12);
    this.graphics.fillStyle(0xe65245).fillRect(842 + 90 * (1 - enemyRatio), 84, 90 * enemyRatio, 12);
    this.hud.setText(`玩家 ${Math.ceil(this.session.playerHp)}     COMBO ${this.session.combo}     SCORE ${this.session.stats.score}                                      敌人 ${Math.ceil(this.session.enemyHp)}`);
  }
}
