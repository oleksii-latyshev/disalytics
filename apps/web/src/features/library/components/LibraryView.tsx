import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { DURATION_BASE_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { useState } from 'react';
import { SAMPLE_MATCHES, type SampleMatch, sampleKey } from '@/core/samples';
import { useSetting } from '@/core/settings';
import { useSavedDemos } from '../hooks/use-saved-demos';
import { DemoCard } from './DemoCard';
import { DemoDialog } from './DemoDialog';
import { LibraryStorage } from './LibraryStorage';
import { SampleCard } from './SampleCard';

interface Props {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
}

export function LibraryView({ onEnter, onSample }: Props) {
  const { demos, forget } = useSavedDemos();
  const [theme] = useSetting('radarTheme');
  const [motionPreference] = useSetting('motion');
  const [opened, setOpened] = useState<SavedDemo | null>(null);
  const featured = demos?.[0];
  const remaining = demos?.slice(1) ?? [];
  const offered =
    demos === null
      ? []
      : SAMPLE_MATCHES.filter((sample) => !demos.some((demo) => demo.key === sampleKey(sample.id)));

  return (
    <section className="mx-auto flex w-full max-w-[72rem] flex-col pb-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-7">
        <div>
          <p className="mb-3 text-11 tracking-[0.16em] text-ink-dim uppercase">
            <Text path="library.saved.collection" />
          </p>
          <h2 className="font-ui text-[clamp(40px,5vw,60px)] font-medium leading-[1.05] tracking-[-0.055em]">
            <Text path="library.shell.library" />
            <span className="text-ink-dim">.</span>
          </h2>
        </div>
        {demos !== null && demos.length > 0 && (
          <p className="numeric pb-1 text-12 text-ink-dim">
            <Text path="library.grid.count" values={{ count: demos.length }} />
          </p>
        )}
      </header>

      {demos === null && <div className="min-h-72" aria-busy="true" />}

      {demos !== null && demos.length === 0 && (
        <div className="flex min-h-56 flex-col justify-center rounded-float border border-line bg-surface-1 px-6 py-10 sm:px-10">
          <p className="text-20 font-medium leading-dense">
            <Text path="library.saved.emptyTitle" />
          </p>
          <p className="mt-3 max-w-[48ch] text-13 text-ink-dim leading-prose">
            <Text path="library.shell.empty" />
          </p>
        </div>
      )}

      {featured !== undefined && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
          aria-labelledby="library-featured-heading"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 id="library-featured-heading" className="text-13 font-medium">
              <Text path="library.saved.featured" />
            </h3>
            <span className="text-11 text-ink-dim">
              <Text path="library.saved.title" />
            </span>
          </div>
          <ul className="list-none p-0">
            <DemoCard
              demo={featured}
              theme={theme}
              motionPreference={motionPreference}
              featured
              onOpen={setOpened}
              onRemove={forget}
            />
          </ul>
        </motion.section>
      )}

      {remaining.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION_BASE_SECONDS, delay: 0.06, ease: EASE_OUT }}
          className="mt-8"
          aria-labelledby="library-remaining-heading"
        >
          <div className="flex items-baseline justify-between gap-3 pb-3">
            <h3 id="library-remaining-heading" className="text-13 font-medium">
              <Text path="library.saved.otherMatches" />
            </h3>
            <span className="text-11 text-ink-dim">
              <Text path="library.saved.newestFirst" />
            </span>
          </div>
          <ul className="list-none [border-block-start:1px_solid_var(--color-line)] p-0">
            {remaining.map((demo) => (
              <DemoCard
                key={demo.key}
                demo={demo}
                theme={theme}
                motionPreference={motionPreference}
                onOpen={setOpened}
                onRemove={forget}
              />
            ))}
          </ul>
        </motion.section>
      )}

      {offered.length > 0 && (
        <section className="mt-9" aria-labelledby="library-samples-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-3">
            <h3 id="library-samples-heading" className="text-13 font-medium">
              <Text path="library.samples.title" />
            </h3>
            <p className="max-w-[60ch] text-11 text-ink-dim leading-prose">
              <Text path="library.samples.note" />
            </p>
          </div>
          <ul className="list-none [border-block-start:1px_solid_var(--color-line)] p-0">
            {offered.map((sample) => (
              <SampleCard key={sample.id} sample={sample} theme={theme} onOpen={onSample} />
            ))}
          </ul>
        </section>
      )}

      {demos !== null && demos.length > 0 && (
        <footer className="mt-9 flex flex-col gap-3 [border-block-start:1px_solid_var(--color-line)] pt-5">
          <LibraryStorage demos={demos} />
          <p className="text-11 text-ink-dim leading-prose">
            <Text path="library.saved.note" />
          </p>
        </footer>
      )}

      <DemoDialog
        saved={opened}
        onEnter={onEnter}
        onDismiss={() => setOpened(null)}
        onGone={forget}
      />
    </section>
  );
}
