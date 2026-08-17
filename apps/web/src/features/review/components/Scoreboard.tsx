import { type ParsedDemo, roundClockAtFrame, sideScoreAtFrame } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { createClockFormat, formatClock } from '@/core/playback';

interface Props {
  demo: ParsedDemo;
  frame: number;
  locale: string;
  position: 'brow' | 'plate';
}

/**
 * The two positions differ in type as well as in chrome, and that is §5.2 rather than an oversight:
 * the chip was sized to stay off a player's head and the brow has no such constraint, so the brow
 * runs one rank of §3's scale above it — 13 → 14 on the labels, 16 → 20 on the score and the clock.
 */
const POSITIONS = {
  brow: {
    chrome: 'glass-brow h-8 rounded-t-card px-4',
    label: 'text-14',
    value: 'text-20',
  },
  plate: {
    chrome: 'glass-hud rounded-card px-3 py-1.5',
    label: 'text-13',
    value: 'text-16',
  },
} as const;

/**
 * The scoreboard — DESIGN.md §5.2. The map, the score and the round clock in one row, in one of two
 * positions the reader chooses between (§10.5).
 *
 * **The brow is the default.** It rises from the centre of the timeline block's top edge as a tab of
 * that card, over the stage, and so takes no `backdrop-filter` at all: the default review screen no
 * longer has a blurred surface over a ground that repaints per frame. **The chip is the other
 * position** — centered on the plate's top edge, where CS2 and every broadcast put the score — and
 * it is the one thing in the product §5.1 allows over the plate, on `.glass-hud` at `--backdrop-hud`
 * (§2.3). That cost is now confined to the readers who ask for it.
 *
 * Everything on it is `--ink` in both positions. §2.2 rules out `--ink-dim` over plate pixels — over
 * the bombsite yellow it collapses to 2.67:1 — so the map name is secondary by size and weight
 * instead, and the brow keeps that rather than growing a second reading of the same row. The score
 * is the exception the same section makes for data colour, and the side letters carry the reading on
 * their own so the pair never depends on hue alone.
 *
 * The demo carries no match ID (`MatchHeader` has a map, a tick rate, a roster and a weapon table),
 * so §5.2's optional second line has nothing to render and the row stands alone.
 */
export function Scoreboard({ demo, frame, locale, position }: Props) {
  const t = useT();
  const score = sideScoreAtFrame(demo, frame);
  const clock = roundClockAtFrame(demo, frame);

  const format = useMemo(() => createClockFormat(locale), [locale]);

  const type = POSITIONS[position];

  return (
    <section aria-label={t('review.scoreboard')} className={`flex items-center ${type.chrome}`}>
      {/* The row is baseline-aligned and the section centres it, so the brow's fixed 32px does not
          have to be reasoned about from a line box. */}
      <div className="flex items-baseline gap-4">
        {/* A map name is game vocabulary — never translated, AGENTS.md §11. */}
        <p className={`font-narrow ${type.label}`}>
          <span className="sr-only">
            <Text path="review.map" />{' '}
          </span>
          {demo.header.map}
        </p>

        <p className={`flex items-baseline gap-1.5 ${type.value}`}>
          <span className="sr-only">
            <Text path="review.score" />{' '}
          </span>
          <span className={`font-narrow ${type.label}`}>CT</span>
          <span className="numeric text-ct">{score.CT}</span>
          <span aria-hidden="true">:</span>
          <span className="numeric text-t">{score.T}</span>
          <span className={`font-narrow ${type.label}`}>T</span>
        </p>

        {clock !== undefined && (
          <p className={`numeric ${type.value}`}>
            <span className="sr-only">
              <Text path="review.roundClock" />{' '}
            </span>
            {formatClock(format, clock.seconds)}
          </p>
        )}
      </div>
    </section>
  );
}
