// `m` for anything written in this repository: it is the mini component, and it is what the
// `LazyMotion` split point in `provider.tsx` exists for. `motion` is re-exported too because the
// animate-ui primitives under `components/animate-ui` import it directly and there stays exactly one
// path from this repository into the library.

export type { TargetAndTransition, Transition } from 'motion/react';
export { AnimatePresence, m, motion } from 'motion/react';
