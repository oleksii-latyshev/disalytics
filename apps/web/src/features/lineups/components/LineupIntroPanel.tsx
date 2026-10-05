import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { UtilityGlyph } from '@/core/glyphs';
import { targetTitle } from '../helpers/lineup-labels';
import type { SavedTarget } from '../helpers/lineup-targets';

/** The most-used targets the empty panel offers. */
const TOP_PICKS = 4;

const HEADING = 'label-dense text-ink-dim';

interface Props {
  targets: readonly SavedTarget[];
  onPick: (id: string) => void;
  onAdd: () => void;
}

/** Nothing picked: what to do here, the two ways to get lineups, and where to start. */
export function LineupIntroPanel({ targets, onPick, onAdd }: Props) {
  return (
    <div className="lineup-rise flex flex-col gap-5 overflow-y-auto p-5">
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-16 text-ink leading-snug">
          <Text path="library.lineups.intro.title" />
        </h2>
        <p className="text-13 text-ink-dim leading-prose">
          <Text path="library.lineups.intro.lead" />
        </p>
      </div>

      <div className="flex flex-col gap-2.5 rounded-card bg-surface-2 p-3.5">
        <h3 className="font-semibold text-14 text-ink">
          <Text path="library.lineups.intro.ownTitle" />
        </h3>
        {(['fromMatch', 'byHand'] as const).map((way, index) => (
          <p key={way} className="flex gap-2.5 text-13 text-ink leading-snug">
            <span className="numeric font-semibold text-12 text-ink-dim">{index + 1}</span>
            <Text path={`library.lineups.intro.${way}`} />
          </p>
        ))}
        <Button variant="outline" onClick={onAdd} className="self-start">
          <Text path="library.lineups.add" />
        </Button>
      </div>

      {targets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className={HEADING}>
            <Text path="library.lineups.intro.onThisMap" />
          </h3>
          {targets.slice(0, TOP_PICKS).map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => onPick(target.id)}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-card border border-line px-2.5 py-1.5 text-left text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
            >
              <UtilityGlyph kind={target.kind} size="control" />
              <span className="flex-1 font-medium">{targetTitle(target)}</span>
              <span className="numeric text-11 text-ink-dim">
                <Text path="library.lineups.positions" values={{ count: target.throwCount }} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
