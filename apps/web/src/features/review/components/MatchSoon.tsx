import { Text, type TranslationKey } from '@disa/i18n';
import type { UnbuiltMatchView } from '../helpers/match-views';

const PROMISE: Record<UnbuiltMatchView, { titlePath: TranslationKey; notePath: TranslationKey }> = {
  scoreboard: {
    titlePath: 'review.views.scoreboard',
    notePath: 'review.views.soonNote.scoreboard',
  },
  maps: { titlePath: 'review.views.maps', notePath: 'review.views.soonNote.maps' },
  metrics: { titlePath: 'review.views.metrics', notePath: 'review.views.soonNote.metrics' },
};

/**
 * A view that is listed and not built. It says what the screen will hold and nothing else — no
 * mock-up and no spinner — which is the answer the shell already gives for its own unfinished
 * entries, and the reason is the same: what ships here is the navigation, and the screen behind it
 * does not pretend to be loading.
 *
 * The match keeps playing behind this: the transport lives in the screen above, so coming back to
 * the stage finds the clock where it was left.
 */
export function MatchSoon({ view }: { view: UnbuiltMatchView }) {
  const { titlePath, notePath } = PROMISE[view];

  return (
    <div className="flex min-h-full items-center justify-center">
      <section className="flex w-full max-w-[32rem] flex-col items-start gap-3">
        <p className="label-dense rounded-chip border border-line px-1.5 py-0.5 text-ink-dim">
          <Text path="common.soon" />
        </p>

        <h2 className="font-ui font-medium text-28 leading-dense">
          <Text path={titlePath} />
        </h2>

        <p className="text-13 text-ink-dim leading-prose">
          <Text path={notePath} />
        </p>
      </section>
    </div>
  );
}
