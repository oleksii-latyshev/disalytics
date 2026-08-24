import { LazyMotion, MotionConfig, type MotionConfigProps } from 'motion/react';
import type * as React from 'react';

const loadDomAnimation = () => import('./motion-features').then((features) => features.default);

interface Props {
  children: React.ReactNode;
  /**
   * DESIGN.md §10.5's reduce-motion row. `user` follows the device, which is the default and what
   * `prefers-reduced-motion` alone would do; the other two are the reader answering over the top of
   * it, the same two answers `data-motion-reduce` carries into CSS.
   */
  reducedMotion?: MotionConfigProps['reducedMotion'];
}

/**
 * The one place `motion` enters the tree. `strict` makes the full `motion.*` components throw, so
 * the only way to animate under this provider is the `m` component — DESIGN.md §9 asks for that
 * preference, and this makes it a failure rather than a review note.
 */
export function MotionProvider({ children, reducedMotion = 'user' }: Props) {
  return (
    <LazyMotion features={loadDomAnimation} strict>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}
