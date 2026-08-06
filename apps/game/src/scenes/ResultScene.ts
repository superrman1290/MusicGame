import Phaser from 'phaser';
import type { GameStats } from '../gameplay/GameSession.js';
import type { LoadedSong } from './types.js';
import { exposeScene } from './sceneState.js';

interface ResultData { loaded: LoadedSong; stats: GameStats; accuracy: number; won: boolean; }

export class ResultScene extends Phaser.Scene {
  private resultData!: ResultData;
  constructor() { super('result'); }
  init(data: ResultData): void { this.resultData = data; }

  create(): void {
    exposeScene('result', this.resultData.won ? 'won' : 'lost');
    this.cameras.main.setBackgroundColor('#0b0b13');
    this.add.text(480, 100, this.resultData.won ? '胜利' : '挑战失败', { fontFamily: 'system-ui', fontSize: '42px', fontStyle: 'bold', color: this.resultData.won ? '#ffd54f' : '#e57373' }).setOrigin(0.5);
    this.add.text(480, 162, this.resultData.loaded.manifest.title, { fontFamily: 'system-ui', fontSize: '18px', color: '#b9b9c5' }).setOrigin(0.5);
    this.add.rectangle(480, 310, 560, 210, 0x171722).setStrokeStyle(1, 0x30303d);
    const stats = this.resultData.stats;
    const rows = [
      `SCORE        ${stats.score}`,
      `ACCURACY     ${(this.resultData.accuracy * 100).toFixed(1)}%`,
      `MAX COMBO    ${stats.maxCombo}`,
      `PERFECT ${stats.perfect}    GREAT ${stats.great}    GOOD ${stats.good}    MISS ${stats.miss}`,
    ];
    rows.forEach((row, index) => this.add.text(480, 245 + index * 42, row, { fontFamily: 'system-ui', fontSize: index === 0 ? '22px' : '15px', color: index === 0 ? '#ffffff' : '#b4b4c0' }).setOrigin(0.5));
    this.add.text(390, 465, '重试', { fontFamily: 'system-ui', fontSize: '15px', color: '#ffffff', backgroundColor: '#2f6944', padding: { x: 24, y: 12 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('play', { loaded: this.resultData.loaded }));
    this.add.text(570, 465, '返回曲目列表', { fontFamily: 'system-ui', fontSize: '15px', color: '#ffffff', backgroundColor: '#343443', padding: { x: 24, y: 12 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => { void this.resultData.loaded.audioContext.close(); this.scene.start('boot'); });
  }
}
