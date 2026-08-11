export { Button, buttonVariants } from './components/button';
export { Input, inputVariants } from './components/input';
export { cn } from './lib/utils';
export { MotionProvider } from './motion/provider';
// Re-exported rather than imported from `motion/react` at the call site so the package that owns
// the dependency stays the only one that declares it. Two declarations could resolve to two copies,
// and `MotionProvider`'s `strict` context only recognises `m` from its own.
export { AnimatePresence, m } from './motion/re-export';
