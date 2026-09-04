import { MotionConfig, type MotionConfigProps } from 'motion/react';
import type * as React from 'react';

interface Props {
  children: React.ReactNode;
  /**
   * The settings sheet's reduce-motion row. `user` follows the device, which is the default and what
   * `prefers-reduced-motion` alone would do; the other two are the reader answering over the top of
   * it, the same two answers `data-motion-reduce` carries into CSS.
   */
  reducedMotion?: MotionConfigProps['reducedMotion'];
}

/**
 * The one place `motion` enters the tree.
 *
 * **There is no `LazyMotion` here and no `m`, and #284 is where both went.** The split point they
 * existed for had stopped deferring anything: every animate-ui primitive imports `motion` directly,
 * so the whole feature set is in the entry chunk whatever this file does, and the `motion-features`
 * chunk was measured at **157 bytes** — a re-export of three symbols the entry chunk already holds.
 * Keeping it meant the next reader would reach for `m` believing it bought a deferred download.
 *
 * Making the split real is the alternative that was rejected, and it is not available: the boundary
 * can only defer what nothing else pulls in eagerly, and the registry's components are not something
 * this repository chooses to stop importing.
 *
 * `strict` went with #276, for a reason that outlives this: under it a component added by
 * `shadcn add` would compile, pass review, and throw the first time a reader opened it.
 */
export function MotionProvider({ children, reducedMotion = 'user' }: Props) {
  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}
