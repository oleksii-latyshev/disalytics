import {
  type ParsedDemo,
  type PlayerInfo,
  playersOnSide,
  roundIndexAtFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import type { Locale } from '@disa/i18n';
import { useMemo } from 'react';
import { type Transport, useFrameReadout } from '@/core/playback';
import { createMoneyFormat, type MoneyShape, moneyShape } from '../helpers/money';

export interface MatchReadout {
  /** The 10 Hz readout's frame — text on this screen follows it, never the frame channel. */
  frame: number;
  roundIndex: number | undefined;
  ct: readonly PlayerInfo[];
  t: readonly PlayerInfo[];
  money: Intl.NumberFormat;
  shape: MoneyShape;
}

/**
 * Everything on the stage that is read rather than drawn, at the rate text is allowed to change.
 *
 * **Which side a slot holds changes at halftime**, so the cards follow the round rather than the
 * end-of-match roster — `PlayerInfo.team` is the wrong answer for every round before the swap.
 */
export function useMatchReadout(
  demo: ParsedDemo,
  transport: Transport,
  locale: Locale,
): MatchReadout {
  const frame = useFrameReadout(transport);
  const roundIndex = roundIndexAtFrame(demo, frame);
  const sides = useMemo(() => sidesBySlotAtRound(demo, roundIndex), [demo, roundIndex]);
  const ct = useMemo(() => playersOnSide(demo.header.players, sides, 'CT'), [demo, sides]);
  const t = useMemo(() => playersOnSide(demo.header.players, sides, 'T'), [demo, sides]);
  const money = useMemo(() => createMoneyFormat(locale), [locale]);
  // The locale's currency placement and thousands separator, taken apart once: `SlidingNumber`
  // writes digits and nothing else, so the symbol has to sit outside it.
  const shape = useMemo(() => moneyShape(money), [money]);

  return { frame, roundIndex, ct, t, money, shape };
}
