import type { ParsedDemo } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, Sheet } from '@disa/ui';
import { X } from 'lucide-react';
import { useMemo } from 'react';
import { type Band, inBand, useCanvasLayers } from '@/core/renderer';
import { eventDensity } from '../helpers/density';
import { economySteps } from '../helpers/economy';
import { matchKills } from '../helpers/kills';
import {
  currentRoundFrame,
  densityTrace,
  economyGap,
  killMarks,
  outcomeBands,
  readSpineColors,
  roundHairlines,
} from '../helpers/layers';
import { roundOutcomeKey } from '../helpers/outcome-copy';
import { roundCells } from '../helpers/round-strip';
import { roundBands } from '../helpers/spine';
import { EconomyGaps } from './EconomyGaps';

/**
 * The three readings, each in a band of its own rather than superimposed. That separation is the
 * difference between this and the 14px ribbon: the layers were never what made that unreadable, the
 * height was. The round bands and their hairlines run behind all three, so a spike, a kill and a buy
 * in the same column are visibly the same round.
 */
const KILL_BAND: Band = { top: 0, height: 0.16 };
const DENSITY_BAND: Band = { top: 0.2, height: 0.56 };
const ECONOMY_BAND: Band = { top: 0.8, height: 0.2 };

interface Props {
  demo: ParsedDemo;
  isOpen: boolean;
  onDismiss: () => void;
  /** The round being played, so the chart can say *here* — read once, since playback is paused. */
  roundIndex: number | undefined;
}

function Swatch({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="flex h-4 w-8 shrink-0 items-center justify-center gap-0.5">
      {children}
    </span>
  );
}

/**
 * Everything derived from the demo lives here rather than in `MatchOverlay`, so it is built when the
 * overlay opens and not when the demo does. `eventDensity` walks every kill and every damage event
 * in the match; paying for that on the chance the reader presses `M` is the wrong way round.
 */
function MatchFigure({ demo, roundIndex }: { demo: ParsedDemo; roundIndex: number | undefined }) {
  const t = useT();

  // The layers carry a round *number*, which is what a demo's rounds are named by; the readout
  // answers with the round's position in the array.
  const litRound = roundIndex === undefined ? undefined : demo.events.rounds[roundIndex]?.number;

  const bands = useMemo(() => roundBands(demo), [demo]);
  const density = useMemo(() => eventDensity(demo), [demo]);
  const steps = useMemo(() => economySteps(demo), [demo]);
  const kills = useMemo(() => matchKills(demo), [demo]);
  const cells = useMemo(() => roundCells(demo), [demo]);
  const colors = useMemo(readSpineColors, []);

  const layers = useMemo(
    () => [
      // Every round keeps its tint here, the lit one included. Dropping it is §7.3's device for a
      // 14px ribbon whose bands touch; on a chart this tall the rounds are separated by the seconds
      // between them, which are bare ground already, and a round with no tint reads as one of those
      // gaps rather than as *here*. The frame below is the only mark that says where the reader is.
      outcomeBands(bands, colors, undefined),
      roundHairlines(bands, colors),
      inBand(killMarks(kills, colors), KILL_BAND),
      inBand(densityTrace(density, colors), DENSITY_BAND),
      inBand(economyGap(steps, colors), ECONOMY_BAND),
      currentRoundFrame(bands, colors, litRound),
    ],
    [bands, colors, density, kills, litRound, steps],
  );

  const { canvasRef } = useCanvasLayers(layers);

  return (
    <figure className="m-0 flex min-h-0 flex-1 flex-col gap-6">
      <div className="min-h-0 flex-1 rounded-card bg-surface-1">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('timeline.overview')}
          className="block size-full"
        />
      </div>

      {/* The legend is what §7.3 makes the difference between this and the strip the owner rejected:
          a chart nobody can read is what was deleted, not the chart. */}
      <figcaption className="flex flex-col gap-3">
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <li className="flex items-center gap-3 text-13 text-ink-dim leading-prose">
            <Swatch>
              <span className="h-4 w-0.5 bg-ct" />
              <span className="h-4 w-0.5 bg-t" />
            </Swatch>
            <Text path="timeline.match.legend.kills" />
          </li>

          <li className="flex items-center gap-3 text-13 text-ink-dim leading-prose">
            <Swatch>
              <span className="h-4 flex-1 bg-ct/30" />
              <span className="h-4 flex-1 bg-t/30" />
            </Swatch>
            <Text path="timeline.match.legend.rounds" />
          </li>

          <li className="flex items-center gap-3 text-13 text-ink-dim leading-prose">
            <Swatch>
              <span className="h-1.5 w-2 self-end bg-ink-dim/30" />
              <span className="h-4 w-2 self-end bg-ink-dim/30" />
              <span className="h-2.5 w-2 self-end bg-ink-dim/30" />
            </Swatch>
            <Text path="timeline.match.legend.density" />
          </li>

          <li className="flex items-center gap-3 text-13 text-ink-dim leading-prose">
            <Swatch>
              <span className="flex h-4 w-6 flex-col justify-center">
                <span className="h-1.5 bg-ct/40" />
                <span className="h-px bg-line" />
                <span className="h-1 bg-t/40" />
              </span>
            </Swatch>
            <Text path="timeline.match.legend.economy" />
          </li>
        </ul>

        <p className="text-13 text-ink-faint leading-prose">
          <Text path="timeline.match.caption" />
        </p>
      </figcaption>

      {/* The canvas says a picture exists and nothing about what it shows (#92), and a modal makes
          the strip behind it inert — so the reading §7.3 keeps on the round strip cannot be borrowed
          from there while this is up, and the overlay owes its own. The density trace stays unvoiced:
          it is an aggregate, and there is no sentence in it. */}
      <ol className="sr-only" aria-label={t('timeline.outcomes')}>
        {cells.map((cell) => (
          <li key={cell.number}>
            {t('timeline.roundLabel', {
              outcome: t(roundOutcomeKey(cell.reason), { round: cell.number, side: cell.winner }),
              ct: cell.survivors.CT,
              t: cell.survivors.T,
              startedCt: cell.score.startedCt,
              startedT: cell.score.startedT,
            })}
          </li>
        ))}
      </ol>

      <EconomyGaps steps={steps} />
    </figure>
  );
}

/**
 * `docs/DESIGN.md` §7.3's full-height match overlay — `M` raises it, and `M` is the whole way in
 * since §5.2 took the round number out of the top-left corner.
 *
 * It is where #90's economy gap, #91's density trace and #92's `EconomyGaps` live: §7.3 moved them
 * here rather than deleting them when the ribbon became a list of rounds. The reading that condemned
 * them was about a 14px strip that is always on screen with nothing to explain it, and none of that
 * is true of a full-height view the reader opened on purpose.
 *
 * **It covers the plate, and it pauses playback to earn that** — the same rule §10.5's sheets follow
 * and for the same reason: §5.1 lets a surface cover the plate only when the plate is not the thing
 * being read, and a match that keeps running behind a chart is a plate still being read. It also
 * settles `AGENTS.md` §16 without an argument, because a paused plate repaints nothing underneath.
 *
 * Nothing here is a playhead and nothing here seeks. §7.3 puts the playhead on §7.1's axis and the
 * way to a round on the strip; this is the match as a picture, and the frame around the current
 * round is the only thing on it that knows where the reader is.
 */
export function MatchOverlay({ demo, isOpen, onDismiss, roundIndex }: Props) {
  const t = useT();

  return (
    <Sheet isOpen={isOpen} onDismiss={onDismiss} aria-label={t('timeline.match.title')}>
      <div className="mx-auto flex h-dvh w-full max-w-[80rem] flex-col gap-6 p-8">
        <header className="flex items-start justify-between gap-6">
          <h2 className="font-ui text-28 leading-dense">
            <Text path="timeline.match.title" />
          </h2>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('timeline.match.dismiss')}
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        {/* Built on open rather than on mount: see `MatchFigure`. */}
        {isOpen && <MatchFigure demo={demo} roundIndex={roundIndex} />}
      </div>
    </Sheet>
  );
}
