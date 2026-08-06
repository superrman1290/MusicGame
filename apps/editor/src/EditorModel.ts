import type { SongChart, TapNote } from '@music-game/chart-core';

export interface EditorNote extends TapNote { id: number; }
interface Snapshot { notes: EditorNote[]; selected: number[]; }

export class EditorModel extends EventTarget {
  notes: EditorNote[] = [];
  selected = new Set<number>();
  clipboard: TapNote[] = [];
  snapDivision = 8;
  bpm = 120;
  private nextId = 1;
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];

  get snapMs(): number { return 60_000 / this.bpm / (this.snapDivision / 4); }
  snap(timeMs: number): number { return Math.max(0, Math.round(timeMs / this.snapMs) * this.snapMs); }

  load(chart: SongChart): void {
    this.notes = chart.notes.map((note) => ({ ...note, id: this.nextId++ }));
    this.selected.clear(); this.undoStack = []; this.redoStack = []; this.changed();
  }

  add(lane: number, timeMs: number): void {
    this.remember();
    const note: EditorNote = { id: this.nextId++, lane, time_ms: Math.round(this.snap(timeMs)), type: 'tap' };
    this.notes.push(note); this.sort(); this.selected = new Set([note.id]); this.changed();
  }

  select(ids: Iterable<number>, additive = false): void {
    if (!additive) this.selected.clear();
    for (const id of ids) this.selected.add(id);
    this.changed();
  }

  moveSelected(deltaMs: number, laneDelta = 0): void {
    if (!this.selected.size) return;
    this.remember();
    const selectedNotes = this.notes.filter((note) => this.selected.has(note.id));
    const minTime = Math.min(...selectedNotes.map((note) => note.time_ms));
    const adjustedDelta = Math.max(deltaMs, -minTime);
    for (const note of selectedNotes) {
      note.time_ms = Math.round(this.snap(note.time_ms + adjustedDelta));
      note.lane = Math.max(0, Math.min(3, note.lane + laneDelta));
    }
    this.sort(); this.changed();
  }

  deleteSelected(): void {
    if (!this.selected.size) return;
    this.remember(); this.notes = this.notes.filter((note) => !this.selected.has(note.id)); this.selected.clear(); this.changed();
  }

  copy(): void {
    const selected = this.notes.filter((note) => this.selected.has(note.id));
    if (!selected.length) return;
    const base = Math.min(...selected.map((note) => note.time_ms));
    this.clipboard = selected.map(({ time_ms, lane, type }) => ({ time_ms: time_ms - base, lane, type }));
  }

  paste(atMs: number): void {
    if (!this.clipboard.length) return;
    this.remember(); this.selected.clear();
    for (const item of this.clipboard) {
      const note = { ...item, id: this.nextId++, time_ms: Math.round(this.snap(atMs + item.time_ms)) };
      this.notes.push(note); this.selected.add(note.id);
    }
    this.sort(); this.changed();
  }

  undo(): void { const snapshot = this.undoStack.pop(); if (!snapshot) return; this.redoStack.push(this.snapshot()); this.restore(snapshot); }
  redo(): void { const snapshot = this.redoStack.pop(); if (!snapshot) return; this.undoStack.push(this.snapshot()); this.restore(snapshot); }
  toNotes(): TapNote[] { return this.notes.map(({ time_ms, lane, type }) => ({ time_ms, lane, type })); }

  private remember(): void { this.undoStack.push(this.snapshot()); if (this.undoStack.length > 100) this.undoStack.shift(); this.redoStack = []; }
  private snapshot(): Snapshot { return { notes: this.notes.map((note) => ({ ...note })), selected: [...this.selected] }; }
  private restore(value: Snapshot): void { this.notes = value.notes.map((note) => ({ ...note })); this.selected = new Set(value.selected); this.changed(); }
  private sort(): void { this.notes.sort((a, b) => a.time_ms - b.time_ms || a.lane - b.lane); }
  private changed(): void { this.dispatchEvent(new Event('change')); }
}
