/** One node per index, plus the callback that puts it there. */
export interface ItemRefs<T> {
  /** The nodes themselves, indexed as the group indexes them. Holes and `null`s are both absences. */
  readonly nodes: (T | null)[];
  /** The ref callback for `index` — the **same function** every time it is asked for. */
  callbackFor: (index: number) => (node: T | null) => void;
}

/**
 * A registry of ref callbacks that keeps each one's identity across renders.
 *
 * React treats a ref callback whose identity changed as a different ref: it calls the previous one
 * with `null` and the new one with the node. A factory that returns a fresh closure per call
 * therefore detaches and reattaches **every item in the group on every render of the group** —
 * including the renders that have nothing to do with refs, which for both consumers here is a hover
 * moving over tens of items.
 *
 * The map only grows, the way the node array does: an index the group has shrunk past keeps its
 * callback and its entry, and React has already called that callback with `null` on unmount.
 */
export function itemRefs<T>(): ItemRefs<T> {
  const nodes: (T | null)[] = [];
  const callbacks = new Map<number, (node: T | null) => void>();

  return {
    nodes,
    callbackFor(index: number) {
      const existing = callbacks.get(index);
      if (existing !== undefined) return existing;

      const callback = (node: T | null): void => {
        nodes[index] = node;
      };

      callbacks.set(index, callback);

      return callback;
    },
  };
}
