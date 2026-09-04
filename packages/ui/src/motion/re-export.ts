// The one path from this repository into `motion`. `m` is deliberately not re-exported: it only
// animates under a `LazyMotion`, which #284 removed once the split point it fed was measured as
// empty, and an `m.div` with no provider above it renders and quietly never moves.

export type { TargetAndTransition, Transition } from 'motion/react';
export { AnimatePresence, motion } from 'motion/react';
