import { useDemoParse } from '@/core/parsing';
import { WayIn } from '@/features/library';
import { MatchReview } from '@/features/review';

// A demo on screen takes the whole viewport: the radar, the spine and the inspector are one
// instrument rather than three blocks in a reading column — DESIGN.md §4.
export function App() {
  const parse = useDemoParse();
  const { state } = parse;

  if (state.status === 'ready') {
    return (
      <MatchReview
        demo={state.demo}
        fileName={state.fileName}
        cache={state.cache}
        onClose={parse.close}
      />
    );
  }

  return <WayIn state={state} onFile={parse.open} onClose={parse.close} />;
}
