import type { LineupTarget, UtilityKind } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, Input, Switch } from '@disa/ui';
import { Bookmark } from 'lucide-react';
import { useId } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { type KindScope, type LineupFilter, NO_FILTER } from '../helpers/lineup-filter';
import { LINEUP_KIND_NAMES, type TargetNames, targetTitle } from '../helpers/lineup-names';
import type { SideScope } from '../helpers/map-scope';

const SIDES: readonly SideScope[] = ['all', 'T', 'CT'];

const SIDE_INK = { T: 'text-t', CT: 'text-ct', BOTH: 'text-ink-dim' } as const;

const CHIP =
  'flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-chip border px-2.5 text-12 transition-colors duration-(--duration-micro) ease-out';

interface Props {
  filter: LineupFilter;
  onFilter: (filter: LineupFilter) => void;
  /** Kinds this match threw lineups of, with how many targets each has under the side and search. */
  kinds: ReadonlyMap<UtilityKind, number>;
  inScopeCount: number;
  targets: readonly LineupTarget[];
  names: ReadonlyMap<string, TargetNames>;
  selectedId: string | null;
  savedVariantIds: ReadonlySet<string>;
  onPick: (id: string) => void;
  isOnTheMoveShown: boolean;
  onTheMoveCount: number;
  onToggleOnTheMove: (isShown: boolean) => void;
}

function sideLabel(side: LineupTarget['side']): string {
  return side === 'BOTH' ? 'T·CT' : side;
}

/**
 * The left column of the lineups view: what to look for, and every target that matches, most thrown
 * first — so a reader who knows the name of a spot can go straight to it.
 */
export function LineupsList({
  filter,
  onFilter,
  kinds,
  inScopeCount,
  targets,
  names,
  selectedId,
  savedVariantIds,
  onPick,
  isOnTheMoveShown,
  onTheMoveCount,
  onToggleOnTheMove,
}: Props) {
  const t = useT();
  const unnamed = t('review.lineups.unnamed');
  const kindChoices: readonly KindScope[] = ['all', ...kinds.keys()];
  const switchId = useId();

  return (
    <aside
      aria-label={t('review.maps.controls')}
      className="surface-card flex min-h-0 min-w-0 flex-col gap-2.5 rounded-float p-3"
    >
      <fieldset className="flex min-w-0 flex-wrap gap-1.5">
        <legend className="sr-only">
          <Text path="review.maps.kinds" />
        </legend>
        {kindChoices.map((kind) => {
          const isOn = filter.kind === kind;

          return (
            <button
              key={kind}
              type="button"
              aria-pressed={isOn}
              onClick={() => onFilter({ ...filter, kind })}
              className={`${CHIP} ${isOn ? 'border-line-strong bg-selected font-semibold text-ink' : 'border-line text-ink-dim hover:text-ink'}`}
            >
              {kind === 'all' ? (
                <Text path="review.maps.everyKind" />
              ) : (
                <>
                  <UtilityGlyph kind={kind} size="control" />
                  {LINEUP_KIND_NAMES[kind]}
                </>
              )}
              <span className="numeric text-11 text-ink-dim">
                {kind === 'all' ? inScopeCount : (kinds.get(kind) ?? 0)}
              </span>
            </button>
          );
        })}
      </fieldset>

      <fieldset className="grid min-w-0 grid-cols-3 gap-0.5 rounded-chip bg-surface-2 p-0.5">
        <legend className="sr-only">
          <Text path="review.maps.sides" />
        </legend>
        {SIDES.map((side) => {
          const isOn = filter.side === side;

          return (
            <button
              key={side}
              type="button"
              aria-pressed={isOn}
              onClick={() => onFilter({ ...filter, side })}
              className={`h-7 cursor-pointer rounded-chip text-12 transition-colors duration-(--duration-micro) ease-out ${isOn ? 'bg-selected font-semibold text-ink' : 'text-ink-dim hover:text-ink'}`}
            >
              {side === 'all' ? <Text path="review.maps.bothSides" /> : side}
            </button>
          );
        })}
      </fieldset>

      <Input
        type="search"
        value={filter.query}
        onChange={(event) => onFilter({ ...filter, query: event.target.value })}
        aria-label={t('review.lineups.search')}
        placeholder={t('review.lineups.searchHint')}
      />

      <div className="flex items-baseline justify-between px-0.5 pt-1">
        <h2 className="label-dense text-ink-dim">
          <Text path="review.lineups.listTitle" />
        </h2>
        <span className="numeric text-11 text-ink-dim">{targets.length}</span>
      </div>

      <ul className="-mx-1 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto px-1">
        {targets.map((target) => {
          const isOn = target.id === selectedId;
          const targetNames = names.get(target.id);
          const isSaved = target.variants.some((variant) => savedVariantIds.has(variant.id));

          return (
            <li key={target.id}>
              <button
                type="button"
                aria-pressed={isOn}
                onClick={() => onPick(target.id)}
                className={`flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-card border px-2 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out ${isOn ? 'border-line-strong bg-selected' : 'border-transparent hover:bg-hover'} ${target.throwCount === 1 && !isOn ? 'opacity-70' : ''}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-card bg-surface-2">
                  <UtilityGlyph kind={target.kind} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-13 text-ink">
                    {targetNames === undefined
                      ? unnamed
                      : targetTitle(target, targetNames, unnamed)}
                  </span>
                  <span className="numeric truncate text-11 text-ink-dim">
                    <Text
                      path="review.lineups.rowMeta"
                      values={{ throws: target.throwCount, origins: target.variants.length }}
                    />
                  </span>
                </span>
                {isSaved && (
                  <Bookmark
                    aria-label={t('review.lineups.save.saved')}
                    className="size-3.5 shrink-0 fill-ink text-ink"
                  />
                )}
                <span className={`numeric shrink-0 font-semibold text-11 ${SIDE_INK[target.side]}`}>
                  {sideLabel(target.side)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {targets.length === 0 && (
        <div className="flex flex-col items-start gap-2.5 px-2 py-4 text-13 text-ink-dim">
          <Text path="review.lineups.noMatches" />
          <Button variant="outline" onClick={() => onFilter(NO_FILTER)}>
            <Text path="review.lineups.resetFilters" />
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2.5 [border-block-start:1px_solid_var(--color-line)] pt-2.5 text-13 text-ink">
        <Switch
          id={switchId}
          checked={isOnTheMoveShown}
          onChange={(event) => onToggleOnTheMove(event.target.checked)}
        />
        <label htmlFor={switchId} className="flex cursor-pointer flex-col">
          <span>
            <Text path="review.lineups.onTheMove" />{' '}
            <span className="numeric text-ink-dim">{onTheMoveCount}</span>
          </span>
          <span className="text-11 text-ink-dim">
            <Text path="review.lineups.onTheMoveNote" />
          </span>
        </label>
      </div>
    </aside>
  );
}
