import { asPlayerSlot } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { advanceGesture, beginGesture, eraseAt, hoverAt, nextCoachId } from '../helpers/coach-edit';
import { coachKeyIntent } from '../helpers/coach-keys';
import { createCoachSession } from '../helpers/coach-session';
import { EMPTY_COACH_ANNOTATIONS } from '../helpers/coach-types';

const SLOT = asPlayerSlot(2);
const ORIGINALS = new Map([[SLOT, { x: 300, y: 300 }]]);
const TARGET = { originals: ORIGINALS, strokeColor: '#fff' };

describe('coach edits', () => {
  it('hands out distinct ids', () => {
    expect(nextCoachId()).not.toBe(nextCoachId());
  });

  it('stamps a utility that the same gesture then drags', () => {
    const start = beginGesture(
      'smoke',
      EMPTY_COACH_ANNOTATIONS,
      ORIGINALS,
      { x: 10, y: 10 },
      '#fff',
    );
    expect(start?.annotations.utilities).toHaveLength(1);

    const moved = advanceGesture(
      start?.annotations ?? EMPTY_COACH_ANNOTATIONS,
      start?.gesture ?? { kind: 'erase' },
      ORIGINALS,
      { x: 50, y: 60 },
    );
    expect(moved.utilities[0]?.point).toEqual({ x: 50, y: 60 });
  });

  it('only drags with the move tool', () => {
    expect(
      beginGesture('move', EMPTY_COACH_ANNOTATIONS, ORIGINALS, { x: 0, y: 0 }, '#fff'),
    ).toBeNull();

    const player = beginGesture(
      'move',
      EMPTY_COACH_ANNOTATIONS,
      ORIGINALS,
      { x: 305, y: 300 },
      '#fff',
    );
    expect(player?.gesture).toEqual({ kind: 'player', slot: SLOT });

    const pencil = beginGesture(
      'pencil',
      EMPTY_COACH_ANNOTATIONS,
      ORIGINALS,
      { x: 305, y: 300 },
      '#fff',
    );
    expect(pencil?.gesture.kind).toBe('stroke');
  });

  it('skips stroke points closer than the step and keeps the object', () => {
    const start = beginGesture(
      'pencil',
      EMPTY_COACH_ANNOTATIONS,
      ORIGINALS,
      { x: 0, y: 0 },
      '#fff',
    );
    if (start === null) throw new Error('no gesture');

    expect(advanceGesture(start.annotations, start.gesture, ORIGINALS, { x: 0.5, y: 0 })).toBe(
      start.annotations,
    );

    const next = advanceGesture(start.annotations, start.gesture, ORIGINALS, { x: 10, y: 0 });
    expect(next.strokes[0]?.points).toHaveLength(2);
  });

  it('erases the utility before the stroke under it, and returns the same object on a miss', () => {
    const annotations = {
      ...EMPTY_COACH_ANNOTATIONS,
      strokes: [{ id: 's', color: '#fff', points: [{ x: 10, y: 10 }] }],
      utilities: [{ id: 'u', kind: 'flash' as const, point: { x: 10, y: 10 } }],
    };

    const once = eraseAt(annotations, ORIGINALS, { x: 10, y: 10 });
    expect(once.utilities).toHaveLength(0);
    expect(once.strokes).toHaveLength(1);
    expect(eraseAt(once, ORIGINALS, { x: 900, y: 900 })).toBe(once);
  });

  it('reports what the pointer is over', () => {
    expect(hoverAt(EMPTY_COACH_ANNOTATIONS, ORIGINALS, { x: 300, y: 305 }).playerSlot).toBe(SLOT);
  });
});

describe('coach session', () => {
  it('arms a tool and puts it down when pressed again', () => {
    const session = createCoachSession();
    expect(session.getState().tool).toBeNull();

    session.toggleTool('pencil');
    expect(session.getState().tool).toBe('pencil');

    session.toggleTool('pencil');
    expect(session.getState().tool).toBeNull();
  });

  it('ignores the pointer while no tool is armed', () => {
    const session = createCoachSession();
    session.pointerDown({ x: 1, y: 1 }, TARGET);

    expect(session.getState().history.present).toBe(EMPTY_COACH_ANNOTATIONS);
  });

  it('records one undo step per gesture', () => {
    const session = createCoachSession();
    session.setTool('pencil');
    session.pointerDown({ x: 0, y: 0 }, TARGET);
    session.pointerMove({ x: 10, y: 0 }, TARGET);
    session.pointerMove({ x: 20, y: 0 }, TARGET);
    session.pointerUp();

    const { history } = session.getState();
    expect(history.past).toHaveLength(1);
    expect(history.present.strokes[0]?.points).toHaveLength(3);

    session.undo();
    expect(session.getState().history.present.strokes).toHaveLength(0);

    session.redo();
    expect(session.getState().history.present.strokes).toHaveLength(1);
  });

  it('records no step when a gesture changed nothing', () => {
    const session = createCoachSession();
    session.setTool('eraser');
    session.pointerDown({ x: 5, y: 5 }, TARGET);
    session.pointerUp();

    expect(session.getState().history.past).toHaveLength(0);
  });

  it('clears as one undoable step', () => {
    const session = createCoachSession();
    session.setTool('smoke');
    session.pointerDown({ x: 5, y: 5 }, TARGET);
    session.pointerUp();
    session.clear();
    expect(session.getState().history.present.utilities).toHaveLength(0);

    session.undo();
    expect(session.getState().history.present.utilities).toHaveLength(1);
  });

  it('drops drawings and the tool on reset but keeps the colour', () => {
    const session = createCoachSession();
    session.setColor('ct');
    session.setTool('smoke');
    session.pointerDown({ x: 5, y: 5 }, TARGET);
    session.pointerUp();
    session.reset();

    const state = session.getState();
    expect(state.tool).toBeNull();
    expect(state.color).toBe('ct');
    expect(state.history.present.utilities).toHaveLength(0);
    expect(state.history.past).toHaveLength(0);
  });

  it('notifies subscribers only on change', () => {
    const session = createCoachSession();
    let calls = 0;
    const unsubscribe = session.subscribe(() => {
      calls += 1;
    });

    session.reset();
    session.setTool('pencil');
    session.setTool('pencil');
    unsubscribe();
    session.setTool(null);

    expect(calls).toBe(1);
  });
});

describe('coach key intent', () => {
  const press = { key: 'z', shiftKey: false, altKey: false, metaKey: false, ctrlKey: true };

  it('maps undo and both redo spellings', () => {
    expect(coachKeyIntent(press)).toBe('undo');
    expect(coachKeyIntent({ ...press, shiftKey: true, key: 'Z' })).toBe('redo');
    expect(coachKeyIntent({ ...press, key: 'y' })).toBe('redo');
  });

  it('needs a modifier and ignores alt', () => {
    expect(coachKeyIntent({ ...press, ctrlKey: false })).toBeNull();
    expect(coachKeyIntent({ ...press, altKey: true })).toBeNull();
    expect(coachKeyIntent({ ...press, key: 'x' })).toBeNull();
  });
});
