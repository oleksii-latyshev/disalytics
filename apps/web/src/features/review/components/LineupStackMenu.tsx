import type { LineupTarget } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { UtilityGlyph } from '@/core/glyphs';
import { type TargetNames, targetTitle } from '../helpers/lineup-names';

interface Props {
  targets: readonly LineupTarget[];
  names: ReadonlyMap<string, TargetNames>;
  onPick: (id: string) => void;
}

/**
 * What lands where several markers meet: the targets themselves, most thrown first — never the
 * throws, which are what a target's own panel is for.
 */
export function LineupStackMenu({ targets, names, onPick }: Props) {
  const t = useT();
  const unnamed = t('review.lineups.unnamed');

  return (
    <div className="surface-card flex flex-col gap-0.5 rounded-float p-1.5 shadow-lg">
      <span className="label-dense px-1.5 py-1 text-ink-dim">
        <Text path="review.lineups.stack.title" values={{ count: targets.length }} />
      </span>
      {targets.map((target) => {
        const targetNames = names.get(target.id);

        return (
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
              <span className="truncate font-medium text-13 text-ink">
                {targetNames === undefined ? unnamed : targetTitle(target, targetNames, unnamed)}
              </span>
              <span className="numeric truncate text-11 text-ink-dim">
                <Text
                  path="review.lineups.rowMeta"
                  values={{ throws: target.throwCount, origins: target.variants.length }}
                />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
