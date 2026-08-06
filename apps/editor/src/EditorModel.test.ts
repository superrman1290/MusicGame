import { describe, expect, it } from 'vitest';
import { EditorModel } from './EditorModel.js';

describe('EditorModel', () => {
  it('adds snapped notes and restores edits', () => {
    const model = new EditorModel(); model.bpm = 120; model.snapDivision = 8;
    model.add(1, 374); expect(model.notes[0]).toMatchObject({ lane: 1, time_ms: 250 });
    model.deleteSelected(); expect(model.notes).toHaveLength(0);
    model.undo(); expect(model.notes).toHaveLength(1);
    model.redo(); expect(model.notes).toHaveLength(0);
  });

  it('copies and pastes selected notes relative to the insertion point', () => {
    const model = new EditorModel(); model.add(0, 500); model.add(2, 1000);
    model.select(model.notes.map((note) => note.id)); model.copy(); model.paste(2000);
    expect(model.toNotes().slice(-2)).toEqual([
      { lane: 0, time_ms: 2000, type: 'tap' },
      { lane: 2, time_ms: 2500, type: 'tap' },
    ]);
  });
});
