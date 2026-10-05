import type { HeatBuy, HeatPoints, ParsedDemo, PlayerSlot, Team } from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import { useEffect, useMemo } from 'react';
import { PLAY_WINDOW_BINS, playRange, type RoundRange, windowOfRange } from '../helpers/heat-range';
import {
  buildHeatView,
  createHeatPlayer,
  type HeatCompareView,
  type HeatReading,
  type HeatView,
} from '../helpers/heat-view';

/** How long after a step the next step's grid is smoothed, in a task of its own. */
const WARM_AHEAD_MS = 150;

interface Input {
  demo: ParsedDemo;
  overview: MapOverview | undefined;
  reading: HeatReading;
  scope: { side: Team | null; subject: PlayerSlot | null; buy: HeatBuy | null };
  range: RoundRange;
  /** The step *Play round* is on, `null` while it is not playing. */
  step: number | null;
  secondPoints: HeatPoints | null;
  view: HeatCompareView;
}

/**
 * What the heat screen shows, rebuilt when a choice changes. A played round does not rebuild: it
 * moves a window over steps kept once (`createHeatPlayer`), so a step is a sum and a repaint, and
 * the next step's grid is smoothed in a task of its own between two of them (§2 rule 9).
 */
export function useHeatView(input: Input): HeatView | null {
  const { demo, overview, reading, range, step, secondPoints, view } = input;
  const { side, subject, buy } = input.scope;
  const isPlaying = step !== null;

  const scope = useMemo(() => ({ side, subject, buy, window: null }), [side, subject, buy]);

  const player = useMemo(
    () =>
      overview === undefined || !isPlaying
        ? null
        : createHeatPlayer({ demo, overview, reading, scope, second: secondPoints, view }),
    [overview, isPlaying, demo, reading, scope, secondPoints, view],
  );

  useEffect(() => {
    if (player === null || step === null) return;

    const timer = setTimeout(() => player.warm(step + PLAY_WINDOW_BINS), WARM_AHEAD_MS);

    return () => clearTimeout(timer);
  }, [player, step]);

  return useMemo(() => {
    if (overview === undefined) return null;
    if (player !== null && step !== null) {
      const { first, last } = playRange(step);

      return player.view(first, last);
    }

    return buildHeatView({
      demo,
      overview,
      reading,
      scope: { ...scope, window: windowOfRange(range) },
      second: secondPoints,
      view,
    });
  }, [demo, overview, reading, scope, range, secondPoints, view, player, step]);
}
