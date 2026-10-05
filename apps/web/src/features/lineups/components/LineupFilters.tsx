import type { UtilityKind } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Input } from '@disa/ui';
import { UtilityGlyph } from '@/core/glyphs';
import { LINEUP_KIND_NAMES, LINEUP_KIND_ORDER } from '@/core/lineup-catalog';
import {
  type KindScope,
  type LineupScope,
  SIDE_SCOPES,
  type SideScope,
  TAG_SCOPES,
} from '../helpers/lineup-scope';

const CHIP =
  'flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-chip border px-2.5 text-12 transition-colors duration-(--duration-micro) ease-out';

const SEGMENT =
  'h-7 cursor-pointer rounded-chip text-12 transition-colors duration-(--duration-micro) ease-out';

const SIDE_INK: Readonly<Record<SideScope, string>> = {
  ALL: 'text-ink',
  T: 'text-t',
  CT: 'text-ct',
};

interface Props {
  scope: LineupScope;
  onScope: (scope: LineupScope) => void;
  kindCounts: ReadonlyMap<UtilityKind, number>;
  totalCount: number;
}

/** Kind, side, tag and search: what to look for on this map. */
export function LineupFilters({ scope, onScope, kindCounts, totalCount }: Props) {
  const t = useT();
  const kinds: readonly KindScope[] = ['all', ...LINEUP_KIND_ORDER];

  return (
    <>
      <fieldset className="flex min-w-0 flex-wrap gap-1.5">
        <legend className="sr-only">
          <Text path="library.lineups.form.kind" />
        </legend>
        {kinds.map((kind) => {
          const isOn = scope.kind === kind;

          return (
            <button
              key={kind}
              type="button"
              aria-pressed={isOn}
              onClick={() => onScope({ ...scope, kind })}
              className={`${CHIP} ${isOn ? 'border-line-strong bg-selected font-semibold text-ink' : 'border-line text-ink-dim hover:text-ink'}`}
            >
              {kind === 'all' ? (
                <Text path="library.lineups.allKinds" />
              ) : (
                <>
                  <UtilityGlyph kind={kind} size="control" />
                  {LINEUP_KIND_NAMES[kind]}
                </>
              )}
              <span className="numeric text-11 text-ink-dim">
                {kind === 'all' ? totalCount : (kindCounts.get(kind) ?? 0)}
              </span>
            </button>
          );
        })}
      </fieldset>

      <div className="grid grid-cols-2 gap-1.5">
        <fieldset className="grid min-w-0 grid-cols-3 gap-0.5 rounded-chip bg-surface-2 p-0.5">
          <legend className="sr-only">
            <Text path="library.lineups.side" />
          </legend>
          {SIDE_SCOPES.map((side) => {
            const isOn = scope.side === side;

            return (
              <button
                key={side}
                type="button"
                aria-pressed={isOn}
                onClick={() => onScope({ ...scope, side })}
                className={`${SEGMENT} ${isOn ? 'bg-selected font-semibold' : 'text-ink-dim hover:text-ink'} ${isOn ? SIDE_INK[side] : ''}`}
              >
                {side === 'ALL' ? <Text path="library.lineups.bothSides" /> : side}
              </button>
            );
          })}
        </fieldset>

        <fieldset className="grid min-w-0 grid-cols-3 gap-0.5 rounded-chip bg-surface-2 p-0.5">
          <legend className="sr-only">
            <Text path="library.lineups.tagFilter" />
          </legend>
          {TAG_SCOPES.map((tag) => {
            const isOn = scope.tag === tag;

            return (
              <button
                key={tag}
                type="button"
                aria-pressed={isOn}
                onClick={() => onScope({ ...scope, tag })}
                className={`${SEGMENT} ${isOn ? 'bg-selected font-semibold text-ink' : 'text-ink-dim hover:text-ink'}`}
              >
                <Text
                  path={tag === 'all' ? 'library.lineups.allTags' : `library.lineups.tags.${tag}`}
                />
              </button>
            );
          })}
        </fieldset>
      </div>

      <Input
        type="search"
        value={scope.search}
        onChange={(event) => onScope({ ...scope, search: event.target.value })}
        aria-label={t('library.lineups.search')}
        placeholder={t('library.lineups.searchHint')}
      />
    </>
  );
}
