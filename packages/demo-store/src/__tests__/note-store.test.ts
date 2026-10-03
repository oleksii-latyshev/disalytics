import 'fake-indexeddb/auto';
import { type CoachNote, SCHEMA_VERSION } from '@disa/demo-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { openCoachNoteStore } from '../note-store';
import { createDemoStore } from '../store';
import { newBackend, newDemo } from './fixture';

const KEY = `abc:${SCHEMA_VERSION}`;
const OTHER = `def:${SCHEMA_VERSION}`;

function note(roundIndex: number, frame = 5): CoachNote {
  return {
    roundIndex,
    frame,
    annotations: {
      strokes: [{ id: 's', color: '#fff', points: [{ x: 1, y: 1 }] }],
      utilities: [],
      movedPlayers: [],
    },
  };
}

async function listed(demoKey: string): Promise<readonly CoachNote[]> {
  const store = await openCoachNoteStore();
  const notes = (await store?.list(demoKey)) ?? [];
  store?.close();

  return notes;
}

beforeEach(async () => {
  const store = await openCoachNoteStore();
  await store?.deleteDemos([KEY, OTHER]);
  store?.close();
});

describe('the coach note store', () => {
  it('gives back what was saved, per demo', async () => {
    const store = await openCoachNoteStore();
    await store?.put(KEY, note(1));
    await store?.put(KEY, note(2));
    await store?.put(OTHER, note(1));
    store?.close();

    expect((await listed(KEY)).map((entry) => entry.roundIndex).sort()).toEqual([1, 2]);
    expect(await listed(OTHER)).toHaveLength(1);
  });

  it('replaces the note of a round', async () => {
    const store = await openCoachNoteStore();
    await store?.put(KEY, note(1, 5));
    await store?.put(KEY, note(1, 9));
    store?.close();

    expect((await listed(KEY)).map((entry) => entry.frame)).toEqual([9]);
  });

  it('deletes one round', async () => {
    const store = await openCoachNoteStore();
    await store?.put(KEY, note(1));
    await store?.put(KEY, note(2));
    await store?.delete(KEY, 1);
    store?.close();

    expect((await listed(KEY)).map((entry) => entry.roundIndex)).toEqual([2]);
  });

  it('treats a record that no longer decodes as absent', async () => {
    const store = await openCoachNoteStore();
    await store?.put(KEY, { ...note(1), frame: -3 });
    await store?.put(KEY, note(2));
    store?.close();

    expect((await listed(KEY)).map((entry) => entry.roundIndex)).toEqual([2]);
  });

  it('goes with the demo that is removed from the library', async () => {
    const notes = await openCoachNoteStore();
    await notes?.put(KEY, note(1));
    await notes?.put(OTHER, note(1));
    notes?.close();

    const demos = await createDemoStore(newBackend());
    await demos.write(KEY, newDemo(), 'match.dem');
    await demos.remove(KEY);

    expect(await listed(KEY)).toEqual([]);
    expect(await listed(OTHER)).toHaveLength(1);
  });
});
