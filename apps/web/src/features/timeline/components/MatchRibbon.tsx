import { type ParsedDemo, roundIndexAtFrame, roundOpeningFrame } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { useCallback, useMemo } from 'react';
import { type Transport, useFrameReadout } from '@/core/playback';
import { useCanvasLayers } from '@/core/renderer';
import { eventDensity } from '../helpers/density';
import { economySteps } from '../helpers/economy';
import {
  currentRoundFrame,
  densityTrace,
  economyGap,
  outcomeBands,
  readSpineColors,
  roundHairlines,
} from '../helpers/layers';
import { RIBBON_HEIGHT_PX, roundBands } from '../helpers/spine';
import { EconomyGaps } from './EconomyGaps';
import { RoundOutcomes } from './RoundOutcomes';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

/**
 * The whole match in 14px — DESIGN.md §7.3. Everything #90, #91 and #92 built, re-scaled from a
 * chart into a navigation strip: round bands by winner, the buy leaving the centre line, the event
 * density as terrain under both. Kill marks are not here at this height; they are on the round
 * timeline above, which has room for them.
 *
 * The canvas is **demand-driven** and stays that way. It repaints on a resize, on a new demo and
 * when the round turns over — never on a frame. Handing `repaint` to `useFrameSink` the way
 * `RadarView` does would put a seismogram in the frame path (#91).
 */
export function MatchRibbon({ demo, transport }: Props) {
  const t = useT();

  // The lit round is text-rate information: it changes once a round, so it rides the 10 Hz readout
  // rather than the clock — AGENTS.md §8.
  const frame = useFrameReadout(transport);
  const roundIndex = roundIndexAtFrame(demo, frame);
  const litRound = roundIndex === undefined ? undefined : demo.events.rounds.at(roundIndex)?.number;

  const bands = useMemo(() => roundBands(demo), [demo]);
  const density = useMemo(() => eventDensity(demo), [demo]);
  const economy = useMemo(() => economySteps(demo), [demo]);
  const colors = useMemo(readSpineColors, []);

  const layers = useMemo(
    () => [
      outcomeBands(bands, colors, litRound),
      densityTrace(density, colors),
      economyGap(economy, colors),
      roundHairlines(bands, colors),
      currentRoundFrame(bands, colors, litRound),
    ],
    [bands, density, economy, colors, litRound],
  );

  const { canvasRef } = useCanvasLayers(layers);

  const seekToRound = useCallback(
    (index: number) => transport.seek(roundOpeningFrame(demo, index)),
    [demo, transport],
  );

  return (
    <div className="relative shrink-0" style={{ height: `${RIBBON_HEIGHT_PX}px` }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t('timeline.overview')}
        className="absolute inset-0 size-full"
      />

      <RoundOutcomes rounds={demo.events.rounds} bands={bands} onSeek={seekToRound} />

      <EconomyGaps steps={economy} />
    </div>
  );
}
