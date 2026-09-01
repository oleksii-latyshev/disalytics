import { LazyMotion, MotionConfig, type MotionConfigProps } from 'motion/react';
import type * as React from 'react';

const loadDomAnimation = () => import('./motion-features').then((features) => features.default);

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
 * **`strict` is off, and that is a decision the redesign made rather than an oversight.** It used to
 * be on, which makes the full `motion.*` components throw and leaves `m` as the only way to animate
 * anything — a good rule while every animated surface in the product was written here. Every
 * animate-ui primitive imports `motion`, so under `strict` a component added by `shadcn add` would
 * compile, pass review, and throw the first time a reader opened it. A rule that turns a supported
 * workflow into a runtime crash is the wrong rule, and the preference it encoded is worth less than
 * the registry it was blocking.
 *
 * `LazyMotion` stays, and so does the split point: our own surfaces still use `m` and still get the
 * feature bundle lazily. What changes is that a surface built on the registry pulls the full set in
 * instead, which is a bundle cost rather than a correctness one — `bun run size` is what holds it to
 * its word.
 */
export function MotionProvider({ children, reducedMotion = 'user' }: Props) {
  return (
    <LazyMotion features={loadDomAnimation}>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}
