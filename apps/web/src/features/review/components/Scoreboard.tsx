import { type ParsedDemo, roundClockAtFrame, sideScoreAtFrame } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { createClockFormat, formatClock } from '@/core/playback';

interface Props {
  demo: ParsedDemo;
  frame: number;
  locale: string;
}

/**
 * The scoreboard — DESIGN.md §5.2. A glass chip centered on the plate's top edge carrying the map,
 * the score and the round clock, which is where CS2 puts its own HUD: a reader already knows not to
 * look anywhere else for those three.
 *
 * It is the **one** element §5.1 allows over the plate, and the only surface in the product with a
 * `backdrop-filter` over a ground that repaints per frame (§2.3). `.glass-hud` is that exception and
 * carries the reasoning; what it costs the frame budget is measured rather than assumed.
 *
 * Everything on it is `--ink`. §2.2 rules out `--ink-dim` over plate pixels — over the bombsite
 * yellow it collapses to 2.67:1 — so the map name is secondary by size and weight instead. The
 * score is the exception the same section makes for data colour, and the side letters carry the
 * reading on their own so the pair never depends on hue alone.
 *
 * The demo carries no match ID (`MatchHeader` has a map, a tick rate, a roster and a weapon table),
 * so §5.2's optional second line has nothing to render and the chip stays one row.
 */
export function Scoreboard({ demo, frame, locale }: Props) {
  const t = useT();
  const score = sideScoreAtFrame(demo, frame);
  const clock = roundClockAtFrame(demo, frame);

  const format = useMemo(() => createClockFormat(locale), [locale]);

  return (
    <section
      aria-label={t('review.scoreboard')}
      className="glass-hud flex items-baseline gap-4 rounded-card px-3 py-1.5"
    >
      {/* A map name is game vocabulary — never translated, AGENTS.md §11. */}
      <p className="font-narrow text-13">
        <span className="sr-only">
          <Text path="review.map" />{' '}
        </span>
        {demo.header.map}
      </p>

      <p className="flex items-baseline gap-1.5 text-16">
        <span className="sr-only">
          <Text path="review.score" />{' '}
        </span>
        <span className="font-narrow text-13">CT</span>
        <span className="numeric text-ct">{score.CT}</span>
        <span aria-hidden="true">:</span>
        <span className="numeric text-t">{score.T}</span>
        <span className="font-narrow text-13">T</span>
      </p>

      {clock !== undefined && (
        <p className="numeric text-16">
          <span className="sr-only">
            <Text path="review.roundClock" />{' '}
          </span>
          {formatClock(format, clock.seconds)}
        </p>
      )}
    </section>
  );
}
