import { MAX_PHOTOS_PER_COMMIT } from '@disa/admin-contract';
import type { Lineup } from '@disa/demo-core';
import { describe, expect, it } from 'vitest';
import { planChunks } from '../helpers/chunks';

function lineup(id: string, imageUrls: string[] = []): Lineup {
  return {
    id,
    title: id,
    map: 'de_mirage',
    side: 'T',
    kind: 'smoke',
    origin: { x: 0, y: 0, z: 0 },
    landing: { x: 1, y: 1, z: 0 },
    pitch: 0,
    yaw: 0,
    throwType: 'stand',
    movementKeys: [],
    movementKeysSummary: '',
    command: '',
    imageUrls,
    createdAt: 1,
  };
}

const entry = (l: Lineup) => ({ lineup: l, resolution: { id: l.id, action: 'add' as const } });
const ref = (n: number) => `local:${n.toString(16).padStart(64, '0')}`;
const imagesFor = (count: number) =>
  Object.fromEntries(Array.from({ length: count }, (_, n) => [ref(n).slice(6), `data:${n}`]));

describe('planChunks', () => {
  it('keeps everything in one commit when it fits', () => {
    const chunks = planChunks(
      [entry(lineup('a', [ref(0)])), entry(lineup('b', [ref(0), ref(1)]))],
      imagesFor(2),
    );
    expect(chunks).toHaveLength(1);
    expect(Object.keys(chunks[0]?.images ?? {})).toHaveLength(2);
  });

  it('starts a new commit when the photo cap would be passed, counting shared photos once', () => {
    const per = MAX_PHOTOS_PER_COMMIT;
    const first = lineup(
      'a',
      Array.from({ length: per }, (_, n) => ref(n)),
    );
    const sharing = lineup('b', [ref(0)]);
    const another = lineup('c', [ref(per)]);
    const chunks = planChunks([entry(first), entry(sharing), entry(another)], imagesFor(per + 1));

    expect(chunks.map((c) => c.lineups.map((l) => l.id))).toEqual([['a', 'b'], ['c']]);
    expect(chunks[1]?.resolutions).toEqual([{ id: 'c', action: 'add' }]);
  });

  it('puts only the photos a commit needs in it', () => {
    const chunks = planChunks(
      [
        entry(lineup('a', [ref(0)])),
        entry(
          lineup(
            'b',
            Array.from({ length: MAX_PHOTOS_PER_COMMIT }, (_, n) => ref(n + 1)),
          ),
        ),
      ],
      imagesFor(MAX_PHOTOS_PER_COMMIT + 1),
    );
    expect(chunks).toHaveLength(2);
    expect(Object.keys(chunks[0]?.images ?? {})).toHaveLength(1);
  });

  it('is empty for nothing to write', () => {
    expect(planChunks([], {})).toEqual([]);
  });
});
