import { LazyMotion } from 'motion/react';
import type * as React from 'react';

const loadDomAnimation = () => import('./motion-features').then((features) => features.default);

/**
 * The one place `motion` enters the tree. `strict` makes the full `motion.*` components throw, so
 * the only way to animate under this provider is the `m` component — DESIGN.md §9 asks for that
 * preference, and this makes it a failure rather than a review note.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadDomAnimation} strict>
      {children}
    </LazyMotion>
  );
}
