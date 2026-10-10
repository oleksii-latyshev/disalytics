import type { Tactic } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { applyEdit, endGesture, redo, startHistory, undo } from '../helpers/tactic-history';

const base = { id: 'a', title: '' } as Tactic;
const titled = (title: string): Tactic => ({ ...base, title });

describe('tactic history', () => {
  it('undoes and redoes edits', () => {
    const edited = applyEdit(startHistory(base), titled('x'), null);
    expect(edited.past).toHaveLength(1);
    const back = undo(edited);
    expect(back.present.title).toBe('');
    expect(redo(back).present.title).toBe('x');
  });

  it('folds one gesture into one undo step until it ends', () => {
    let history = applyEdit(startHistory(base), titled('a'), 'drag');
    history = applyEdit(history, titled('ab'), 'drag');
    history = applyEdit(history, titled('abc'), 'drag');
    expect(history.past).toHaveLength(1);
    history = applyEdit(endGesture(history), titled('abcd'), 'drag');
    expect(history.past).toHaveLength(2);
    expect(undo(history).present.title).toBe('abc');
  });

  it('ignores an edit that changed nothing and drops the future on a new edit', () => {
    const start = startHistory(base);
    expect(applyEdit(start, base, null)).toBe(start);
    const undone = undo(applyEdit(start, titled('x'), null));
    expect(applyEdit(undone, titled('y'), null).future).toHaveLength(0);
  });
});
