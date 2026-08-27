import type { MatchHeader } from '@disa/demo-core';
import type { ParsePhase } from '@disa/demo-parser';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { DemoFileName } from './DemoFileName';
import { MetaDot } from './MetaDot';

interface Props {
  fileName: string;
  phase: ParsePhase;
  percent: number;
  header: MatchHeader | null;
  wasHidden: boolean;
  onCancel: () => void;
}

/**
 * The parse — DESIGN.md §10.3. The same card as the upload view, transformed in place: it does not
 * navigate, and the shell around it does not change either, because a parse is something the reader
 * started rather than somewhere they went.
 *
 * **The number is the reading**, at §3's `44` in Plex Mono, and this screen is the one the scale
 * allows to spend it. The progress *bar* that stood beside it until this screen was rebuilt is gone
 * — it stated the same fact a second time, which §5.2's lesson from #205 says is not a reading — so
 * the `progressbar` role rides on the percentage itself. That role names its element by
 * `aria-label` alone and never by its content, which is why the stage below is a sibling and not a
 * child: inside it, it would be read by nobody.
 *
 * **Nothing here is a spinner.** What moves is a percentage, and §14 counts that as a reading rather
 * than motion, so it stands under `prefers-reduced-motion` as it stands anywhere else.
 */
export function ParseProgress({ fileName, phase, percent, header, wasHidden, onCancel }: Props) {
  const t = useT();

  return (
    <section className="flex flex-col items-start gap-4">
      <p
        role="progressbar"
        aria-label={t('library.progress.label')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="numeric text-44 leading-dense"
      >
        <Text path="library.progress.percent" values={{ percent: percent / 100 }} />
      </p>

      {/* The stage in the reader's words, never the machine's — §10.3 rules out "Initializing WASM
          module" by name. It is the card's heading because the card has no other: a title above a
          stage line would be the same sentence twice. */}
      <h2 className="font-ui text-16 leading-dense">
        <Text
          path={
            phase === 'decompress'
              ? 'library.progress.phase.decompress'
              : 'library.progress.phase.parse'
          }
        />
      </h2>

      {/* §10.3's "fills in as the parser learns". The file name is known from the drop; the map and
          the player count arrive together, because `onHeader` delivers one whole `MatchHeader` and
          the header is complete while the last pass is still running. */}
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

      {/* §10.3's hidden-tab explanation, and it appears only once this tab has actually been in the
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
