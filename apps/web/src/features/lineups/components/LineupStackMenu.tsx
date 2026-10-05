import { Text } from '@disa/i18n';
import { UtilityGlyph } from '@/core/glyphs';
import { targetTitle } from '../helpers/lineup-labels';
import type { SavedTarget } from '../helpers/lineup-targets';

interface Props {
  targets: readonly SavedTarget[];
  onPick: (id: string) => void;
}

/** What lands where several markers meet: the targets, most positions first. */
export function LineupStackMenu({ targets, onPick }: Props) {
  return (
    <div className="surface-card flex flex-col gap-0.5 rounded-float p-1.5 shadow-lg">
      <span className="label-dense px-1.5 py-1 text-ink-dim">
        <Text path="library.lineups.stackTitle" values={{ count: targets.length }} />
      </span>
      {targets.map((target) => (
        <button
          key={target.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(target.id)}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-card px-2 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-card bg-surface-2">
            <UtilityGlyph kind={target.kind} size="control" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-13 text-ink">{targetTitle(target)}</span>
            <span className="numeric truncate text-11 text-ink-dim">
              <Text path="library.lineups.positions" values={{ count: target.throwCount }} />
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
