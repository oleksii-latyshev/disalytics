import type { Transport } from './transport';

/** Read by `packages/ui/src/styles/motion.css`, which cannot import it. Change both together. */
export const PLAYING_ATTRIBUTE = 'data-playing';

/** The part of `Element` the flag needs, so the binding is testable without a DOM. */
export interface PlayingFlagTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Mirrors play/pause onto an attribute so CSS can enforce `AGENTS.md` §2 rule 9 rather than trust
 * it. It listens on the **transport** channel: the flag changes when the reader presses play, not
 * once per animation frame.
 */
export function bindPlayingFlag(transport: Transport, target: PlayingFlagTarget): () => void {
  const sync = (): void => {
    if (transport.clock.isPlaying) {
      target.setAttribute(PLAYING_ATTRIBUTE, '');
      return;
    }

    target.removeAttribute(PLAYING_ATTRIBUTE);
  };

  const unsubscribe = transport.subscribeToTransport(sync);
  sync();

  return () => {
    unsubscribe();
    target.removeAttribute(PLAYING_ATTRIBUTE);
  };
}
