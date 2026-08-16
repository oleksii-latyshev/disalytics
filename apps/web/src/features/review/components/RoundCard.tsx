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
 * The round card — DESIGN.md §5.2 as #166 rewrote it: the round number and the phase it is in, and
 * nothing else. The map, the score and the clock moved to the scoreboard over the plate, which is
 * where a reader of any CS2 HUD looks for them.
 *
 * The round number is the screen's single `44` (§3), and it is **not** a button: §7.3 makes it the
 * way into the full-height match overlay, and that overlay is not built. A control that looks
 * pressable and does nothing is worse than a number.
 *
 * The storage notice is not §5.2's, and it stays because nothing else on the screen says it. A
 * directory handle taken before the cache was cleared fails every write silently, and this line is
 * the only thing that has ever revealed it.
 */
export function RoundCard({ demo, frame, roundIndex, cache }: Props) {
  const { rounds } = demo.events;
  const round = roundIndex === undefined ? undefined : rounds.at(roundIndex);
  const clock = roundClockAtFrame(demo, frame);
  const notice = cacheNoticeKey(cache);

  return (
    <section className="glass-panel flex min-w-24 flex-col items-center gap-0.5 rounded-float px-4 py-3">
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
        <p className="text-11 text-ink-dim leading-prose">
          <Text path={notice} />
        </p>
      )}
    </section>
  );
}
