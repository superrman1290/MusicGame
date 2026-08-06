import Phaser from 'phaser';
import { AudioController } from './AudioController.js';
import { EditorModel, type EditorNote } from './EditorModel.js';

const WIDTH = 1200;
const HEIGHT = 560;
const LEFT = 100;
const RIGHT = 1168;
const WAVE_TOP = 42;
const WAVE_HEIGHT = 86;
const LANE_TOP = 180;
const LANE_HEIGHT = 76;
const LANE_COLORS = [0x49bff2, 0x70ca86, 0xf0ac4f, 0xe76562];

interface DragState { kind: 'note' | 'box'; startX: number; startY: number; endX: number; endY: number; }

export class EditorScene extends Phaser.Scene {
  readonly viewDurationMs = 10_000;
  scrollMs = 0;
  private graphics!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private drag?: DragState;

  constructor(private readonly model: EditorModel, private readonly audio: AudioController) { super('editor-scene'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0e12');
    this.graphics = this.add.graphics();
    ['D', 'F', 'J', 'K'].forEach((key, lane) => {
      const label = this.add.text(50, LANE_TOP + lane * LANE_HEIGHT + LANE_HEIGHT / 2, key, {
        fontFamily: 'system-ui', fontSize: '17px', fontStyle: 'bold', color: `#${(LANE_COLORS[lane] ?? 0xffffff).toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
      this.labels.push(label);
    });
    this.model.addEventListener('change', () => this.render());
    this.audio.addEventListener('change', () => this.render());
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.pointerDown(pointer));
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.pointerMove(pointer));
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.pointerUp(pointer));
    this.render();
  }

  update(): void { if (this.audio.playing) this.render(); }
  setScroll(value: number): void { this.scrollMs = Math.max(0, value); this.render(); }

  private pointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.y >= WAVE_TOP && pointer.y <= WAVE_TOP + WAVE_HEIGHT) {
      this.audio.seek(this.xToTime(pointer.x)); return;
    }
    const lane = this.yToLane(pointer.y);
    if (lane < 0 || pointer.x < LEFT || pointer.x > RIGHT) return;
    const hit = this.noteAt(pointer.x, pointer.y);
    if (hit) {
      if (!this.model.selected.has(hit.id)) this.model.select([hit.id], pointer.event.shiftKey);
      this.drag = { kind: 'note', startX: pointer.x, startY: pointer.y, endX: pointer.x, endY: pointer.y };
    } else if (pointer.event.shiftKey) {
      this.drag = { kind: 'box', startX: pointer.x, startY: pointer.y, endX: pointer.x, endY: pointer.y };
    } else {
      this.model.add(lane, this.xToTime(pointer.x));
    }
    this.render();
  }

  private pointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.drag || !pointer.isDown) return;
    this.drag.endX = Phaser.Math.Clamp(pointer.x, LEFT, RIGHT);
    this.drag.endY = Phaser.Math.Clamp(pointer.y, LANE_TOP, LANE_TOP + LANE_HEIGHT * 4);
    this.render();
  }

  private pointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.drag) return;
    this.drag.endX = Phaser.Math.Clamp(pointer.x, LEFT, RIGHT);
    this.drag.endY = Phaser.Math.Clamp(pointer.y, LANE_TOP, LANE_TOP + LANE_HEIGHT * 4);
    if (this.drag.kind === 'note') {
      const deltaMs = this.xToTime(this.drag.endX) - this.xToTime(this.drag.startX);
      const laneDelta = this.yToLane(this.drag.endY) - this.yToLane(this.drag.startY);
      if (Math.abs(deltaMs) >= this.model.snapMs / 2 || laneDelta !== 0) this.model.moveSelected(deltaMs, laneDelta);
    } else {
      const x1 = Math.min(this.drag.startX, this.drag.endX); const x2 = Math.max(this.drag.startX, this.drag.endX);
      const y1 = Math.min(this.drag.startY, this.drag.endY); const y2 = Math.max(this.drag.startY, this.drag.endY);
      this.model.select(this.model.notes.filter((note) => {
        const x = this.timeToX(note.time_ms); const y = LANE_TOP + note.lane * LANE_HEIGHT + LANE_HEIGHT / 2;
        return x >= x1 && x <= x2 && y >= y1 && y <= y2;
      }).map((note) => note.id));
    }
    this.drag = undefined; this.render();
  }

  private render(): void {
    if (!this.graphics) return;
    const g = this.graphics.clear();
    g.fillStyle(0x15171d).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0x0f1116).fillRect(LEFT, WAVE_TOP, RIGHT - LEFT, WAVE_HEIGHT);
    this.drawWaveform(g);
    for (let lane = 0; lane < 4; lane += 1) {
      const y = LANE_TOP + lane * LANE_HEIGHT;
      g.fillStyle(lane % 2 ? 0x171920 : 0x13151b).fillRect(LEFT, y, RIGHT - LEFT, LANE_HEIGHT);
      g.lineStyle(1, 0x2d3039).strokeRect(LEFT, y, RIGHT - LEFT, LANE_HEIGHT);
    }
    this.drawGrid(g);
    for (const note of this.model.notes) this.drawNote(g, note);
    const playX = this.timeToX(this.audio.currentMs);
    if (playX >= LEFT && playX <= RIGHT) g.lineStyle(2, 0xffffff, 0.9).lineBetween(playX, 24, playX, LANE_TOP + LANE_HEIGHT * 4);
    if (this.drag?.kind === 'box') {
      g.fillStyle(0x5bbce6, 0.12).fillRect(this.drag.startX, this.drag.startY, this.drag.endX - this.drag.startX, this.drag.endY - this.drag.startY);
      g.lineStyle(1, 0x69c7ee, 0.9).strokeRect(this.drag.startX, this.drag.startY, this.drag.endX - this.drag.startX, this.drag.endY - this.drag.startY);
    }
  }

  private drawWaveform(g: Phaser.GameObjects.Graphics): void {
    if (!this.audio.peaks.length || !this.audio.durationMs) return;
    const center = WAVE_TOP + WAVE_HEIGHT / 2;
    const startRatio = this.scrollMs / this.audio.durationMs;
    const endRatio = Math.min(1, (this.scrollMs + this.viewDurationMs) / this.audio.durationMs);
    const first = Math.floor(startRatio * this.audio.peaks.length);
    const last = Math.max(first + 1, Math.ceil(endRatio * this.audio.peaks.length));
    g.lineStyle(1, 0x5ebee5, 0.72);
    for (let index = first; index < last; index += 1) {
      const x = LEFT + ((index - first) / Math.max(1, last - first - 1)) * (RIGHT - LEFT);
      const peak = this.audio.peaks[index] ?? 0;
      g.lineBetween(x, center - peak * 37, x, center + peak * 37);
    }
  }

  private drawGrid(g: Phaser.GameObjects.Graphics): void {
    const step = this.model.snapMs;
    const first = Math.ceil(this.scrollMs / step) * step;
    for (let time = first; time <= this.scrollMs + this.viewDurationMs; time += step) {
      const beat = Math.round(time / step); const strong = beat % (this.model.snapDivision / 4) === 0;
      const x = this.timeToX(time);
      g.lineStyle(1, strong ? 0x555a67 : 0x30333d, strong ? 0.65 : 0.35).lineBetween(x, 150, x, LANE_TOP + LANE_HEIGHT * 4);
    }
  }

  private drawNote(g: Phaser.GameObjects.Graphics, note: EditorNote): void {
    const x = this.timeToX(note.time_ms);
    if (x < LEFT - 12 || x > RIGHT + 12) return;
    const y = LANE_TOP + note.lane * LANE_HEIGHT + 14;
    const selected = this.model.selected.has(note.id);
    g.fillStyle(LANE_COLORS[note.lane] ?? 0xffffff, 1).fillRoundedRect(x - 11, y, 22, LANE_HEIGHT - 28, 3);
    if (selected) g.lineStyle(2, 0xffffff).strokeRoundedRect(x - 14, y - 3, 28, LANE_HEIGHT - 22, 4);
  }

  private noteAt(x: number, y: number): EditorNote | undefined {
    const lane = this.yToLane(y); if (lane < 0) return undefined;
    return this.model.notes.find((note) => note.lane === lane && Math.abs(this.timeToX(note.time_ms) - x) <= 14);
  }
  private xToTime(x: number): number { return this.scrollMs + Phaser.Math.Clamp((x - LEFT) / (RIGHT - LEFT), 0, 1) * this.viewDurationMs; }
  private timeToX(timeMs: number): number { return LEFT + ((timeMs - this.scrollMs) / this.viewDurationMs) * (RIGHT - LEFT); }
  private yToLane(y: number): number { return y < LANE_TOP || y >= LANE_TOP + LANE_HEIGHT * 4 ? -1 : Math.floor((y - LANE_TOP) / LANE_HEIGHT); }
}
