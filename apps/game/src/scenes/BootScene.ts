import Phaser from 'phaser';
import { songRepository } from '../repository/HttpSongRepository.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0b13');
    this.add.text(480, 275, 'MUSIC GAME', { fontFamily: 'system-ui', fontSize: '38px', color: '#ffffff' }).setOrigin(0.5);
    const status = this.add.text(480, 330, '正在连接曲谱库...', { fontFamily: 'system-ui', fontSize: '15px', color: '#8b8b9c' }).setOrigin(0.5);
    void songRepository.listSongs()
      .then((songs) => this.scene.start('song-select', { songs }))
      .catch((error: unknown) => {
        status.setText('曲谱库连接失败');
        this.time.delayedCall(500, () => this.scene.start('song-select', { songs: [], error: error instanceof Error ? error.message : '未知错误' }));
      });
  }
}

