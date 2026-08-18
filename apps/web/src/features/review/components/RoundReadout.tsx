import { type ParsedDemo, type RoundPhase, roundClockAtFrame } from '@disa/demo-core';
import { Text, type TranslationKey } from '@disa/i18n';
import type { CacheState } from '@/core/parsing';
import { cacheNoticeKey } from '../helpers/cache-copy';

interface Props {
  demo: ParsedDemo;
  frame: number;
  roundIndex: number | undefined;
  cache: CacheState;
}

/** No `default` — a fourth phase has to come with the copy for it, CODE_REQUIREMENTS.md §10. */
function phaseKey(phase: RoundPhase): TranslationKey {
  switch (phase) {
    case 'freeze':
      return 'review.phase.freeze';
    case 'live':
      return 'review.phase.live';
    case 'post':
      return 'review.phase.post';
  }
}

/**
 * Where the match is — DESIGN.md §5.2: the map, the round number and the phase, stacked in the
 * top-left corner and reading downward as *where, which, when*.
 *
 * **It is not a card, and that is the correction of 18 August 2026.** It was a `--glass-panel` box
 * until then, and putting the way out of the match above it made the corner two glass boxes of
 * different widths stacked on each other — which is what the owner read as *«выглядит прям
 * ужасно»*, and the second box is what made it so rather than either box on its own. Type on the
 * stage is what this corner is now: no fill, no edge, no radius, nothing to line up with anything.
 * `--surface-0` is behind it — the plate is in its own grid cell (§5.1) and never reaches here — so
 * there is no contrast case to answer and no blur to pay for.
 *
 * A map name is game vocabulary: `de_mirage` is the name, never translated, never uppercased and
 * never prettified, which is exactly what `.label-dense` would do to it. The map and the phase share
 * one treatment on either side of the number, so the `44` is the only thing this corner says at a
 * glance.
 *
 * The round number is the screen's single `44` (§3), and it is **not** a button: §7.3 makes it the
 * way into the full-height match overlay, and that overlay is not built. A control that looks
 * pressable and does nothing is worse than a number.
 *
 * The storage notice is not §5.2's, and it stays because nothing else on the screen says it. A
 * directory handle taken before the cache was cleared fails every write silently, and this line is
 * the only thing that has ever revealed it. It is the one thing here that wraps, so it carries the
 * column's own bound rather than inheriting a card's width.
 */
export function RoundReadout({ demo, frame, roundIndex, cache }: Props) {
  const { rounds } = demo.events;
  const round = roundIndex === undefined ? undefined : rounds.at(roundIndex);
  const clock = roundClockAtFrame(demo, frame);
  const notice = cacheNoticeKey(cache);

  return (
    <section className="flex flex-col items-start">
      <p className="font-narrow text-12 text-ink-dim">
        <span className="sr-only">
          <Text path="review.map" />{' '}
        </span>
        {demo.header.map}
      </p>

      {round === undefined ? (
        <p className="text-16">
          <Text path="review.warmup" />
        </p>
      ) : (
        <>
          <p>
            <span aria-hidden="true" className="numeric text-44 leading-none">
              {round.number}
            </span>
            <span className="sr-only">
              <Text
                path="review.roundOfTotal"
                values={{ current: round.number, total: rounds.length }}
              />
            </span>
          </p>

          {clock !== undefined && (
            <p className="font-narrow text-12 text-ink-dim">
              <Text path={phaseKey(clock.phase)} />
            </p>
          )}
        </>
      )}

      {notice !== undefined && (
        <p className="max-w-56 text-11 text-ink-dim leading-prose">
          <Text path={notice} />
        </p>
      )}
    </section>
  );
}
