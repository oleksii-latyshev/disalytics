import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { AnimatePresence, DURATION_BASE_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { ParseState } from '@/core/parsing';
import { SAMPLE_MATCHES, type SampleMatch } from '@/core/samples';
import { useSetting } from '@/core/settings';
import { prefersLessMotion } from '../helpers/less-motion';
import { DemoLibrary } from './DemoLibrary';
import { HomeMatches } from './HomeMatches';
import { RoundPreview } from './RoundPreview';

interface Props {
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onClose: () => void;
  isDraggedOver: boolean;
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
  onLibrary: () => void;
}

export function UploadView({
  state,
  onFile,
  onClose,
  isDraggedOver,
  onEnter,
  onSample,
  onLibrary,
}: Props) {
  const [motionPreference] = useSetting('motion');
  const sample = SAMPLE_MATCHES.find((match) => match.map === 'de_dust2');
  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col py-5">
      <div className="grid items-center gap-10 py-3 md:grid-cols-2 md:gap-12 wide:gap-[70px]">
        <div className="min-w-0">
          <p className="mb-5 text-11 tracking-[0.16em] text-ink-dim uppercase">
            <Text path="library.open.eyebrow" />
          </p>
          <h2 className="font-ui text-[clamp(40px,4.4vw,64px)] font-medium leading-[1.08] tracking-[-0.055em]">
            <Text path="common.tagline" />
            <br />
            <span className="text-ink-dim">
              <Text path="library.open.detail" />
            </span>
          </h2>
          <p className="mt-[22px] max-w-[370px] text-14 text-ink-dim leading-[1.75]">
            <Text path="library.open.promise" />
          </p>
          <div
            className="atlas-upload mt-[30px] max-w-[425px] rounded-[13px] border border-line-strong bg-surface-1 p-[22px]"
            onPointerMove={(event) => {
              if (event.pointerType !== 'mouse' || prefersLessMotion(motionPreference)) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty(
                '--spotlight-x',
                `${event.clientX - bounds.left}px`,
              );
              event.currentTarget.style.setProperty(
                '--spotlight-y',
                `${event.clientY - bounds.top}px`,
              );
            }}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={state.status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
                className="flex flex-col gap-3"
              >
                <DemoLibrary
                  state={state}
                  onFile={onFile}
                  onClose={onClose}
                  isDraggedOver={isDraggedOver}
                />
              </motion.div>
            </AnimatePresence>
            <p className="mt-4 flex items-start gap-2 text-11 text-ink-dim leading-prose">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              <Text path="library.open.result" />
            </p>
          </div>
          {sample !== undefined && (
            <button
              type="button"
              onClick={() => onSample(sample)}
              className="mt-4 flex items-center gap-2 text-12 text-ink-dim hover:text-ink"
            >
              <Text path="library.home.try" />
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        <div className="mx-auto w-full max-w-[505px]">
          <RoundPreview suspended={state.status !== 'idle'} />
        </div>
      </div>
      <HomeMatches onEnter={onEnter} onSample={onSample} onLibrary={onLibrary} />
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-11 text-ink-dim leading-prose">
        <span className="flex items-center gap-2">
          <LockKeyhole aria-hidden="true" className="size-3.5" />
          <Text path="common.privacyNote" />
        </span>
        <span>
          <Text path="library.open.formats" />
        </span>
      </footer>
    </div>
  );
}
