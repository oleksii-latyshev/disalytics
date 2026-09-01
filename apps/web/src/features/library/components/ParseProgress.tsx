import type { MatchHeader } from '@disa/demo-core';
import type { ParsePhase } from '@disa/demo-parser';
import { Text, useLocale } from '@disa/i18n';
import { Button, Progress, ProgressLabel, ProgressTrack, ProgressValue } from '@disa/ui';
import { DemoFileName } from './DemoFileName';
import { MetaDot } from './MetaDot';

/* What `aria-valuetext` says. `unit` rather than `style: 'percent'`, which would read 42 as 4,200%:
   the value here is already a number out of a hundred rather than a fraction of one. */
const PERCENT_FORMAT: Intl.NumberFormatOptions = { style: 'unit', unit: 'percent' };

interface Props {
  fileName: string;
  phase: ParsePhase;
  percent: number;
  header: MatchHeader | null;
  wasHidden: boolean;
  onCancel: () => void;
}

/**
 * The parse. The same card as the upload view, transformed in place: it does not navigate, and the
 * shell around it does not change either, because a parse is something the reader started rather
 * than somewhere they went.
 *
 * **The number is the reading**, at the type scale's `44` in Plex Mono, and this screen is the one
 * the scale allows to spend it. The bar beneath it is the second reading and not a repetition of the
 * first: a percentage says how far, a bar says how far *of the whole*, and at a glance across the
 * room only one of the two answers.
 *
 * Three things are load-bearing.
 *
 * **The bar scales, it does not resize.** `transform: scaleX()` on the fill, because `width`
 * triggers layout at every moment of the animation — hard rule 9. It is why the registry's own
 * `ProgressTrack`, which renders an indicator animating `width`, is not what the barrel exports.
 *
 * **The semantics are Base UI's and the words are ours.** `Progress` is the `progressbar`, with
 * `aria-valuenow` and an `aria-valuetext` formatted for the reader's own locale through `Intl`;
 * `ProgressLabel` is what names it, so the label is associated rather than asserted. The visible
 * percentage is `aria-hidden` underneath, which is what lets it count up without saying anything.
 *
 * **The digits animate and the sign does not.** `CountingNumber` writes `textContent` and cannot be
 * given a suffix, so the per-locale spacing — `42%` in English, `42 %` in Russian, which is what
 * `Intl` produces for each — lives in the message catalogue where every other difference between
 * the two locales lives.
 */
export function ParseProgress({ fileName, phase, percent, header, wasHidden, onCancel }: Props) {
  const locale = useLocale();

  return (
    <section className="flex flex-col items-start gap-4">
      <Progress
        value={percent}
        locale={locale}
        format={PERCENT_FORMAT}
        className="flex w-full flex-col gap-3"
      >
        <ProgressLabel className="sr-only">
          <Text path="library.progress.label" />
        </ProgressLabel>

        <p className="numeric text-44 leading-dense">
          <Text
            path="library.progress.percent"
            values={{ percent: <ProgressValue initiallyStable /> }}
          />
        </p>

        <ProgressTrack className="h-1 w-full overflow-hidden rounded-chip bg-line">
          <div
            className="h-full w-full origin-left bg-ink transition-transform duration-(--duration-base) ease-out"
            style={{ transform: `scaleX(${percent / 100})` }}
          />
        </ProgressTrack>
      </Progress>

      {/* The stage in the reader's words, never the machine's — "Initializing WASM module" is ruled
          out by name. It is the card's heading because the card has no other: a title above a stage
          line would be the same sentence twice. */}
      <h2 className="font-ui text-16 leading-dense">
        <Text
          path={
            phase === 'decompress'
              ? 'library.progress.phase.decompress'
              : 'library.progress.phase.parse'
          }
        />
      </h2>

      {/* It fills in as the parser learns. The file name is known from the drop; the map and the
          player count arrive together, because `onHeader` delivers one whole `MatchHeader` and the
          header is complete while the last pass is still running. */}
      <div className="flex w-full min-w-0 flex-col gap-1">
        <DemoFileName fileName={fileName} />

        {header !== null && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-13 text-ink-dim">
            {/* A map name is game vocabulary and stays as the demo wrote it — AGENTS.md §11. */}
            <span className="text-14 text-ink">{header.map}</span>
            <MetaDot />
            <span className="numeric">
              <Text path="library.counts.players" values={{ count: header.players.length }} />
            </span>
          </p>
        )}
      </div>

      {/* The hidden-tab explanation, and it appears only once this tab has actually been in the
          background during this parse — a warning shown pre-emptively would describe a slowdown the
          reader is not having. It carries no multiplier: the 5× in `docs/PARSER.md` §16 is one
          machine's, and the browser's scheduler is not a number this product knows. */}
      {wasHidden && (
        <p role="status" className="text-13 text-ink-dim leading-prose">
          <Text path="library.progress.hiddenTab" />
        </p>
      )}

      <Button type="button" variant="outline" onClick={onCancel}>
        <Text path="library.progress.cancel" />
      </Button>
    </section>
  );
}
