import type { PreviewItem } from '@disa/admin-contract';
import { describe, expect, it } from 'vitest';
import { planParts } from '../helpers/parts';
import { initialItem, needsDecision, outcomeOf, planOf, problemsOfPlan } from '../helpers/review';
import { EMPTY_REVIEW, reviewReducer } from '../helpers/review-state';
import { BASE, lineup, sha } from './support';

const none = new Map();
const itemOf = (
  status: PreviewItem['status'],
  file = lineup(),
  stored: ReturnType<typeof lineup> | null = null,
) =>
  initialItem({
    item: { id: file.id, status, lineup: file, problems: [] },
    lineup: file,
    stored,
    secondId: 'second-id',
  });

describe('plans', () => {
  it('merges an update into the site lineup, keeping the site id and the picked fields', () => {
    const stored = lineup({ notes: 'site' });
    const state = itemOf('update', lineup({ title: 'New title' }), stored);
    const plan = planOf(state, BASE, none);
    expect(plan).toMatchObject({ kind: 'replace', targetId: 'mirage-1', merged: true });
    expect(plan.kind === 'replace' && plan.lineup).toMatchObject({
      title: 'New title',
      notes: 'site',
    });
    expect(outcomeOf(state, plan, [])).toBe('update');
  });

  it('keeps a duplicate as a second lineup under the file id, or merges into the site one', () => {
    const stored = lineup({ id: 'site-1' });
    const dup = itemOf('duplicate', lineup({ id: 'file-1' }), stored);
    const merged = planOf(dup, BASE, none);
    expect(merged).toMatchObject({ kind: 'replace', targetId: 'site-1' });
    expect(outcomeOf(dup, merged, [])).toBe('merge');
    expect(planOf({ ...dup, choice: 'add' }, BASE, none)).toMatchObject({
      kind: 'add',
      lineup: { id: 'file-1' },
    });
    expect(
      planOf({ ...itemOf('update', lineup(), lineup({ title: 'x' })), choice: 'both' }, BASE, none),
    ).toMatchObject({
      kind: 'add',
      second: true,
      lineup: { id: 'second-id' },
    });
  });

  it('skips what is dropped, unchanged, or left as it is', () => {
    const state = itemOf('update', lineup({ title: 'New' }), lineup());
    expect(planOf({ ...state, choice: 'stored' }, BASE, none)).toEqual({
      kind: 'skip',
      why: 'chosen',
    });
    expect(planOf({ ...state, dropped: true }, BASE, none)).toEqual({
      kind: 'skip',
      why: 'dropped',
    });
    expect(planOf(itemOf('unchanged', lineup(), lineup()), BASE, none)).toEqual({
      kind: 'skip',
      why: 'same',
    });
  });

  it('turns an edited unchanged lineup into a replace', () => {
    const stored = lineup();
    const state = itemOf('unchanged', lineup(), stored);
    const edited = reviewReducer(
      reviewReducer(EMPTY_REVIEW, { type: 'loaded', photoBase: BASE, items: [state] }),
      { type: 'edit', id: state.id, next: lineup({ title: 'Renamed' }), fields: ['title'] },
    );
    const plan = planOf(edited.items[state.id] ?? state, BASE, none);
    expect(plan).toMatchObject({
      kind: 'replace',
      targetId: 'mirage-1',
      lineup: { title: 'Renamed' },
    });
  });

  it('judges the lineup that would be saved, not the one in the file', () => {
    const blank = itemOf('update', lineup({ title: ' ' }), lineup());
    const loaded = reviewReducer(EMPTY_REVIEW, { type: 'loaded', photoBase: BASE, items: [blank] });
    expect(blank.picks.title).toBe('stored');
    expect(problemsOfPlan(planOf(blank, BASE, none), 'de_mirage')).toEqual([]);

    const pickFile = reviewReducer(loaded, {
      type: 'pick',
      id: blank.id,
      field: 'title',
      side: 'file',
    });
    const item = pickFile.items[blank.id] ?? blank;
    expect(problemsOfPlan(planOf(item, BASE, none), 'de_mirage').map((p) => p.code)).toEqual([
      'title_blank',
    ]);
  });

  it('asks about updates, duplicates and anything with a problem', () => {
    expect(needsDecision(itemOf('update'))).toBe(true);
    expect(needsDecision(itemOf('new'))).toBe(false);
    expect(
      needsDecision({ ...itemOf('new'), initialProblems: [{ code: 'title_blank' as const }] }),
    ).toBe(true);
  });
});

describe('planParts', () => {
  const lineups = Array.from({ length: 14 }, (_, index) =>
    lineup({ id: `l${index}`, imageUrls: [0, 1, 2].map((n) => `local:${sha(index * 3 + n)}`) }),
  );
  const images = Object.fromEntries(
    Array.from({ length: 42 }, (_, n) => [sha(n), `data:image/webp;base64,${'A'.repeat(8)}`]),
  );

  it('splits the Inferno-sized import so no part carries more than 24 photos', () => {
    const parts = planParts(
      lineups.map((entry) => ({ action: 'add' as const, lineup: entry })),
      images,
      BASE,
    );
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.flatMap((part) => part.decisions)).toHaveLength(14);
    for (const part of parts) expect(Object.keys(part.images).length).toBeLessThanOrEqual(24);
  });

  it('does not count a photo our storage already has, nor one used twice', () => {
    const shared = lineup({ id: 'a', imageUrls: [`${BASE}/${sha(1)}`, `local:${sha(2)}`] });
    const again = lineup({ id: 'b', imageUrls: [`local:${sha(2)}`] });
    const parts = planParts(
      [
        { action: 'add', lineup: shared },
        { action: 'replace', targetId: 'z', lineup: again },
      ],
      images,
      BASE,
    );
    expect(parts).toHaveLength(1);
    expect(Object.keys(parts[0]?.images ?? {})).toEqual([sha(2)]);
  });
});
