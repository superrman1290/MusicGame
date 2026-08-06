import type { AudioMetadata } from '@music-game/chart-core';

export class AudioController extends EventTarget {
  file?: File;
  metadata?: AudioMetadata;
  peaks: number[] = [];
  private element = new Audio();
  private objectUrl?: string;

  constructor() {
    super();
    this.element.addEventListener('play', () => this.changed());
    this.element.addEventListener('pause', () => this.changed());
    this.element.addEventListener('ended', () => this.changed());
  }

  get currentMs(): number { return this.element.currentTime * 1000; }
  get durationMs(): number { return this.metadata?.duration_ms ?? 0; }
  get playing(): boolean { return !this.element.paused; }

  async load(file: File): Promise<void> {
    const bytes = await file.arrayBuffer();
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(bytes.slice(0));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
      this.file = file;
      this.metadata = {
        file_name: file.name,
        mime_type: file.type || 'audio/mpeg',
        duration_ms: Math.round(buffer.duration * 1000),
        size_bytes: file.size,
        sha256,
      };
      this.peaks = this.extractPeaks(buffer, 1200);
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = URL.createObjectURL(file);
      this.element.src = this.objectUrl;
      this.changed();
    } finally {
      void context.close();
    }
  }

  async toggle(): Promise<void> {
    if (!this.file) throw new Error('请先导入音频');
    if (this.element.paused) await this.element.play(); else this.element.pause();
    this.changed();
  }

  stop(): void { this.element.pause(); this.element.currentTime = 0; this.changed(); }
  seek(timeMs: number): void { this.element.currentTime = Math.max(0, Math.min(this.durationMs, timeMs)) / 1000; this.changed(); }

  private extractPeaks(buffer: AudioBuffer, points: number): number[] {
    const data = buffer.getChannelData(0);
    const block = Math.max(1, Math.floor(data.length / points));
    return Array.from({ length: points }, (_, index) => {
      let peak = 0;
      const end = Math.min(data.length, (index + 1) * block);
      for (let cursor = index * block; cursor < end; cursor += 1) peak = Math.max(peak, Math.abs(data[cursor] ?? 0));
      return peak;
    });
  }

  private changed(): void { this.dispatchEvent(new Event('change')); }
}
