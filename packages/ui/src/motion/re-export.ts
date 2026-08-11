// `m` and never `motion`: DESIGN.md §9 asks for the mini component, and `MotionProvider`'s `strict`
// makes the full one throw. Anything else from `motion/react` that a surface needs is added here, so
// there stays exactly one path from this repository into the library.
export { AnimatePresence, m } from 'motion/react';
