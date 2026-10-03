import { describe, expect, it } from 'vitest';
import {
  type CoachNote,
  isCoachNote,
  notedRounds,
  noteForRound,
  withNote,
  withoutNote,
} from '../helpers/coach-notes';
import { asPlayerSlot } from '../schema';

function note(roundIndex: number, frame = 10): CoachNote {
  return {
    roundIndex,
    frame,
    annotations: {
      strokes: [{ id: 's1', color: '#fff', points: [{ x: 1, y: 2 }] }],
      utilities: [{ id: 'u1', kind: 'smoke', point: { x: 3, y: 4 } }],
      movedPlayers: [{ slot: asPlayerSlot(2), point: { x: 5, y: 6 } }],
    },
  };
}

describe('isCoachNote', () => {
  it('accepts a whole note', () => {
    expect(isCoachNote(note(3))).toBe(true);
  });

  it('survives a JSON round trip', () => {
    expect(isCoachNote(JSON.parse(JSON.stringify(note(3))))).toBe(true);
  });

  it('refuses what is not a note', () => {
    expect(isCoachNote(null)).toBe(false);
    expect(isCoachNote('note')).toBe(false);
    expect(isCoachNote({ ...note(1), roundIndex: -1 })).toBe(false);
    expect(isCoachNote({ ...note(1), frame: 1.5 })).toBe(false);
    expect(isCoachNote({ ...note(1), annotations: null })).toBe(false);
  });

  it('refuses a note with a malformed drawing', () => {
    const base = note(1).annotations;
    const bad = (annotations: unknown) => isCoachNote({ ...note(1), annotations });

    expect(
      bad({ ...base, strokes: [{ id: 's', color: '#fff', points: [{ x: 'a', y: 1 }] }] }),
    ).toBe(false);
    expect(bad({ ...base, utilities: [{ id: 'u', kind: 'decoy', point: { x: 1, y: 1 } }] })).toBe(
      false,
    );
    expect(bad({ ...base, movedPlayers: [{ slot: -1, point: { x: 1, y: 1 } }] })).toBe(false);
    expect(bad({ strokes: [] })).toBe(false);
  });
});

describe('the per-round lookup', () => {
  const notes = [note(0), note(4)];

  it('finds the note on a round', () => {
    expect(noteForRound(notes, 4)?.roundIndex).toBe(4);
  });

  it('finds nothing on a round without one, or before any round', () => {
    expect(noteForRound(notes, 2)).toBeNull();
    expect(noteForRound(notes, undefined)).toBeNull();
  });

  it('lists the noted rounds', () => {
    expect([...notedRounds(notes)]).toEqual([0, 4]);
  });

  it('replaces the note of a round when saving', () => {
    const next = withNote(notes, note(4, 99));

    expect(next).toHaveLength(2);
    expect(noteForRound(next, 4)?.frame).toBe(99);
  });

  it('drops one note and leaves the rest', () => {
    expect(withoutNote(notes, 0).map((entry) => entry.roundIndex)).toEqual([4]);
  });
});
