import { describe, expect, it } from 'vitest';
import { itemRefs } from '../helpers/item-refs';

/** Stands in for the element React would hand a ref callback. */
const node = (name: string) => ({ name });

describe('itemRefs', () => {
  it('hands out the same callback for an index every time it is asked', () => {
    const refs = itemRefs<ReturnType<typeof node>>();

    expect(refs.callbackFor(3)).toBe(refs.callbackFor(3));
    expect(refs.callbackFor(0)).toBe(refs.callbackFor(0));
  });

  it('gives each index a callback of its own', () => {
    const refs = itemRefs<ReturnType<typeof node>>();

    expect(refs.callbackFor(0)).not.toBe(refs.callbackFor(1));
  });

  it('writes a node at the index its callback belongs to', () => {
    const refs = itemRefs<ReturnType<typeof node>>();
    const second = node('second');

    refs.callbackFor(1)(second);

    expect(refs.nodes[1]).toBe(second);
    expect(refs.nodes[0]).toBeUndefined();
  });

  it('clears the slot when React detaches the node, which is what an unmount does', () => {
    const refs = itemRefs<ReturnType<typeof node>>();

    refs.callbackFor(2)(node('third'));
    refs.callbackFor(2)(null);

    expect(refs.nodes[2]).toBeNull();
  });

  it('keeps an index stable across a group that shrinks and grows again', () => {
    const refs = itemRefs<ReturnType<typeof node>>();
    const attach = refs.callbackFor(29);

    // The match ends and a shorter one opens: React detaches the tail, then a later one re-attaches.
    attach(node('round 30'));
    attach(null);

    expect(refs.nodes[29]).toBeNull();
    expect(refs.callbackFor(29)).toBe(attach);
  });
});
