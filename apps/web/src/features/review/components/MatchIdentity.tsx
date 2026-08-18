import type { ParsedDemo } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import type { CacheState } from '@/core/parsing';
import { cacheNoticeKey } from '../helpers/cache-copy';

interface Props {
  demo: ParsedDemo;
  cache: CacheState;
}

/**
 * Which match is open — DESIGN.md §5.2. The map name, under the way out, as type on the stage.
 *
 * **The round number and the phase left on 18 August 2026, and the round strip is why.** §7.3's list
 * runs the whole match across the bottom of the screen with the playing round lit, so a `44` in the
 * opposite corner restated it in a place the reader was not looking — and the phase restated the
 * axis's own buy-phase region beside it. The corner keeps only what nothing else on the screen says.
 * §3's single `44` is spent on the parse screen now (§10.3) and this screen has none.
 *
 * Nothing here is a function of the frame, which is the point: the corner stopped re-rendering at the
 * 10 Hz readout when the clock left it, and the map name is fixed for the whole match.
 *
 * A map name is game vocabulary: `de_mirage` is the name, never translated, never uppercased and
 * never prettified, which is exactly what `.label-dense` would do to it.
 *
 * The storage notice is not §5.2's, and it stays because nothing else on the screen says it. A
 * directory handle taken before the cache was cleared fails every write silently, and this line is
 * the only thing that has ever revealed it. It is the one thing here that wraps, so it carries the
 * column's own bound rather than inheriting a card's width.
 */
export function MatchIdentity({ demo, cache }: Props) {
  const notice = cacheNoticeKey(cache);

  return (
    <section className="flex flex-col items-start">
      <p className="font-narrow text-12 text-ink-dim">
        <span className="sr-only">
          <Text path="review.map" />{' '}
        </span>
        {demo.header.map}
      </p>

      {notice !== undefined && (
        <p className="max-w-56 text-11 text-ink-dim leading-prose">
          <Text path={notice} />
        </p>
      )}
    </section>
  );
}
