import Phaser from 'phaser';
import { validateAudioBinding, type Difficulty } from '@music-game/chart-core';
import { songRepository } from '../repository/HttpSongRepository.js';
import type { LoadedSong } from './types.js';

interface LoadingData { songId: string; difficulty: Difficulty; }

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class LoadingScene extends Phaser.Scene {
  private loadingData!: LoadingData;
  constructor() { super('loading'); }
  init(data: LoadingData): void { this.loadingData = data; }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b0b13');
    this.add.text(480, 265, '正在加载曲目', { fontFamily: 'system-ui', fontSize: '27px', color: '#ffffff' }).setOrigin(0.5);
    const status = this.add.text(480, 315, '读取谱面与音频...', { fontFamily: 'system-ui', fontSize: '14px', color: '#8c8c9e', align: 'center', wordWrap: { width: 680 } }).setOrigin(0.5);
    void this.loadSong().then((loaded) => this.scene.start('play', { loaded })).catch((error: unknown) => {
      status.setColor('#e57373').setText(error instanceof Error ? error.message : '加载失败');
      this.add.text(480, 385, '返回曲目列表', { fontFamily: 'system-ui', fontSize: '15px', color: '#ffffff', backgroundColor: '#343443', padding: { x: 16, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('boot'));
    });
  }

  private async loadSong(): Promise<LoadedSong> {
    const [manifest, chart, audioResponse] = await Promise.all([
      songRepository.getSong(this.loadingData.songId),
      songRepository.loadChart(this.loadingData.songId, this.loadingData.difficulty),
      fetch(songRepository.getAudioUrl(this.loadingData.songId)),
    ]);
    if (!audioResponse.ok) throw new Error('音频下载失败');
    const audioBytes = await audioResponse.arrayBuffer();
    const audioContext = new AudioContext();
    const [sha256, audioBuffer] = await Promise.all([
      sha256Hex(audioBytes),
      audioContext.decodeAudioData(audioBytes.slice(0)),
    ]);
    const errors = validateAudioBinding(manifest.audio, { sha256, duration_ms: Math.round(audioBuffer.duration * 1000), size_bytes: audioBytes.byteLength });
    if (errors.length) { await audioContext.close(); throw new Error(errors.join('；')); }
    return { manifest, chart, audioContext, audioBuffer };
  }
}
