export class AudioClock {
  private source: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private offsetSeconds = 0;
  private running = false;

  constructor(readonly context: AudioContext, readonly buffer: AudioBuffer) {}

  get durationMs(): number { return this.buffer.duration * 1000; }
  get isRunning(): boolean { return this.running; }

  get currentTimeMs(): number {
    const seconds = this.running ? this.offsetSeconds + this.context.currentTime - this.startedAt : this.offsetSeconds;
    return Math.min(this.durationMs, Math.max(0, seconds * 1000));
  }

  async start(fromMs = this.offsetSeconds * 1000): Promise<void> {
    this.stopSource();
    await this.context.resume();
    this.offsetSeconds = Math.max(0, Math.min(this.buffer.duration, fromMs / 1000));
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.context.destination);
    this.startedAt = this.context.currentTime;
    this.source.start(0, this.offsetSeconds);
    this.running = true;
  }

  pause(): void {
    if (!this.running) return;
    this.offsetSeconds = this.currentTimeMs / 1000;
    this.stopSource();
  }

  stop(): void {
    this.stopSource();
    this.offsetSeconds = 0;
  }

  private stopSource(): void {
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source.disconnect();
      this.source = null;
    }
    this.running = false;
  }
}

