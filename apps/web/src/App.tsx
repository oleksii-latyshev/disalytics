import { Text } from '@disa/i18n';
import { useDemoParse } from '@/core/parsing';
import { DemoLibrary } from '@/features/library';
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

  return (
    <div className="app-shell grid place-items-center p-8">
      <main className="flex w-full max-w-[64ch] flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="font-ui text-28 leading-dense">disalytics</h1>
          <p className="text-16 leading-prose">
            <Text path="common.tagline" />
          </p>
        </header>

        <DemoLibrary state={state} onFile={parse.open} onClose={parse.close} />

        <p className="text-13 text-ink-dim leading-prose">
          <Text path="common.privacyNote" />
        </p>
      </main>
    </div>
  );
}
