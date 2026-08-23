import { MotionProvider } from '@disa/ui';
import { useDemoParse } from '@/core/parsing';
import { useSetting } from '@/core/settings';
import { WayIn } from '@/features/library';
import { MatchReview } from '@/features/review';

/**
 * DESIGN.md §10.5's reduce-motion row, in the vocabulary `motion` uses. `user` is the device's own
 * answer, which is what `prefers-reduced-motion` alone would give; the other two are the reader
 * overriding it, and CSS gets the same two through `data-motion-reduce`.
 */
const REDUCED_MOTION = { system: 'user', reduced: 'always', full: 'never' } as const;

// A demo on screen takes the whole viewport: the plate is the stage and everything else is an
// instrument arranged around it — DESIGN.md §5.
export function App() {
  const parse = useDemoParse();
  const [motion] = useSetting('motion');
  const { state } = parse;

  return (
    <MotionProvider reducedMotion={REDUCED_MOTION[motion]}>
      {state.status === 'ready' ? (
        <MatchReview demo={state.demo} cache={state.cache} onClose={parse.close} />
      ) : (
        <WayIn state={state} onFile={parse.open} onSaved={parse.openSaved} onClose={parse.close} />
      )}
    </MotionProvider>
  );
}
