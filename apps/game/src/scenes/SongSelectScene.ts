import Phaser from 'phaser';
import type { SongSummary } from '@music-game/chart-core';
import type { SongListData } from './types.js';

export class SongSelectScene extends Phaser.Scene {
  private songs: SongSummary[] = [];
  private error?: string;

  constructor() { super('song-select'); }
  init(data: SongListData): void { this.songs = data.songs; this.error = data.error; }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0b13');
    this.add.rectangle(0, 0, 960, 76, 0x14141f).setOrigin(0);
    this.add.text(42, 25, 'MUSIC GAME', { fontFamily: 'system-ui', fontSize: '22px', fontStyle: 'bold', color: '#ffffff' });
    this.add.text(42, 108, '选择曲目', { fontFamily: 'system-ui', fontSize: '28px', color: '#f4f4f7' });
    this.add.text(42, 146, '曲谱库中的歌曲会自动加载音频与谱面', { fontFamily: 'system-ui', fontSize: '14px', color: '#7e7e90' });

    if (this.error || this.songs.length === 0) {
      this.add.text(42, 210, this.error ? `无法加载曲谱库：${this.error}` : '曲谱库中暂无歌曲', { fontFamily: 'system-ui', fontSize: '16px', color: '#e57373', wordWrap: { width: 780 } });
      this.add.text(42, 260, '重试', { fontFamily: 'system-ui', fontSize: '15px', color: '#ffffff', backgroundColor: '#2f6944', padding: { x: 18, y: 10 } }).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('boot'));
      return;
    }

    this.songs.forEach((song, index) => this.createSongRow(song, 42, 200 + index * 94));
  }

  private createSongRow(song: SongSummary, x: number, y: number): void {
    const background = this.add.rectangle(x, y, 876, 76, 0x171722).setOrigin(0).setStrokeStyle(1, 0x30303d).setInteractive({ useHandCursor: true });
    this.add.rectangle(x, y, 7, 76, 0x4fc3f7).setOrigin(0);
    this.add.text(x + 26, y + 15, song.title, { fontFamily: 'system-ui', fontSize: '19px', fontStyle: 'bold', color: '#f5f5f7' });
    this.add.text(x + 26, y + 45, `${song.artist}  ·  ${song.bpm} BPM  ·  ${(song.duration_ms / 1000).toFixed(0)} 秒`, { fontFamily: 'system-ui', fontSize: '13px', color: '#8c8c9e' });
    this.add.text(x + 730, y + 24, song.difficulties[0]?.toUpperCase() ?? 'NORMAL', { fontFamily: 'system-ui', fontSize: '12px', color: '#ffb74d', backgroundColor: '#2b251c', padding: { x: 10, y: 5 } });
    background.on('pointerover', () => background.setFillStyle(0x20202d));
    background.on('pointerout', () => background.setFillStyle(0x171722));
    background.on('pointerup', () => this.scene.start('loading', { songId: song.id, difficulty: song.difficulties[0] }));
  }
}

