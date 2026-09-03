import { type ParsedDemo, roundClockAtFrame, sideScoreAtFrame } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { SlidingNumber } from '@disa/ui';
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
 * runs one rank of §3's scale above it — 16 → 20 on the score and the clock, 11 → 12 on the side
 * letters.
 */
const POSITIONS = {
  brow: {
    chrome: 'surface-brow h-8 rounded-t-card px-4',
    side: 'text-12',
    value: 'text-20',
  },
  plate: {
    chrome: 'surface-hud rounded-card px-3 py-1.5',
    side: 'text-11',
    value: 'text-16',
  },
} as const;

/**
 * The scoreboard — DESIGN.md §5.2. The score and the round clock in one row, in one of two positions
 * the reader chooses between (§10.5).
 *
 * **The brow is the default.** It rises from the centre of the timeline block's top edge as a tab of
 * that card, over the stage, and so takes no `backdrop-filter` at all: the default review screen no
 * longer has a blurred surface over a ground that repaints per frame. **The chip is the other
 * position** — centered on the plate's top edge, where CS2 and every broadcast put the score — and
 * it is the one thing in the product §5.1 allows over the plate, on `.glass-hud` at `--backdrop-hud`
 * (§2.3). That cost is now confined to the readers who ask for it.
 *
 * **The whole row is one face.** It carried three until 18 August 2026 — Roboto Condensed on the map
 * name and the side letters, Plex Mono on the digits, and the UI face on the colon, which nothing
 * had ever set a face on — across two ranks, in a 32px lip. The owner read the built screen as
 * *«наляписто»* and it was: a row this small has no room to be typeset. Everything in it is Plex Mono
 * now, and the map name it also carried moved to the round card, which is where what is fixed about
 * the match belongs.
 *
 * **A side letter takes its side's colour rather than `--ink`.** It binds the letter to the number
 * beside it, so `CT 9` is one token instead of two things that happen to be adjacent, and it is the
 * same exception §2.2 already makes for the score itself — the letters are also what keeps the pair
 * off hue alone, which is why they are here rather than implied by position. The separator holds
 * `--ink-faint`, and the hairline between the two readings is what the old 16px gap was trying to
 * be.
 *
 * **The clock counts down, and once the bomb is down it counts the bomb.** That is the reading CS2
 * itself gives and the one the round it describes was played against; the phase is
 * `roundClockAtFrame`'s to decide, so all this row does is name it and colour it. The bomb phase is
 * the only state in which the clock is not `--ink`: it takes `--color-objective`, the token the
 * plant and the defuse already carry everywhere else on this screen, because *which* countdown is
 * running is the thing a reader has to be able to tell at a glance. Colour is not the only carrier
 * — the accessible name changes with it.
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
    <section
      aria-label={t('review.scoreboard')}
      className={`numeric flex items-center ${type.chrome}`}
    >
      {/* The reading, once, in words. Everything below it is `aria-hidden`: a rolling digit is ten
          absolutely-positioned copies of every place, so the accessible text of the score would be
          the digits rather than the number. */}
      <span className="sr-only">
        <Text path="review.score" /> CT {score.CT} T {score.T}
      </span>
      <p className={`flex items-center gap-1.5 ${type.value}`} aria-hidden="true">
        <span className={`text-ct ${type.side}`}>CT</span>
        <span className="text-ct">
          <SlidingNumber number={score.CT} initiallyStable={true} />
        </span>
        {/* A separator rather than a word — hidden from the reader, so §14's floor for text does
            not reach it. */}
        <span aria-hidden="true" className="text-ink-faint">
          :
        </span>
        <span className="text-t">
          <SlidingNumber number={score.T} initiallyStable={true} />
        </span>
        <span className={`text-t ${type.side}`}>T</span>
      </p>

      {clock !== undefined && (
        <>
          {/* The separator the 16px gap was standing in for. A rule between two readings is quieter
              than the space it takes to hold them apart by distance alone. */}
          <span aria-hidden="true" className="mx-3 h-3 w-px bg-line" />

          <p className={`${type.value} ${clock.phase === 'bomb' ? 'text-objective' : ''}`}>
            <span className="sr-only">
              <Text path={clock.phase === 'bomb' ? 'review.bombClock' : 'review.roundClock'} />{' '}
            </span>
            {formatClock(format, clock.seconds)}
          </p>
        </>
      )}
    </section>
  );
}
