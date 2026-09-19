import type { Lineup, LineupSide } from '@disa/demo-core';
import { UTILITY_NAMES } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { UtilityGlyph } from '@/core/glyphs';

interface Props {
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly selectedIndex: number | null;
  readonly onHover: (index: number | null) => void;
  readonly onSelect: (index: number) => void;
}

const SIDE_INK: Readonly<Record<LineupSide, string>> = {
  CT: 'text-ct',
  T: 'text-t',
  BOTH: 'text-ink-dim',
};

export function LineupList({ lineups, focused, selectedIndex, onHover, onSelect }: Props) {
  if (lineups.length === 0) {
    return (
      <div className="flex min-h-[8rem] items-center justify-center p-4 text-center text-13 text-ink-dim">
        <p>
          <Text path="library.lineups.empty" />
        </p>
      </div>
    );
  }

  return (
    <ul
      aria-label="Grenade lineups"
      className="flex min-h-0 min-w-0 flex-1 list-none flex-col gap-1 overflow-y-auto p-0"
    >
      {lineups.map((lineup, index) => {
        const isSelected = selectedIndex === index;
        const isFocused = focused === index;

        return (
          <li key={lineup.id} className="min-w-0">
            <button
              type="button"
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => onSelect(index)}
              onPointerEnter={() => onHover(index)}
              onPointerLeave={(event) => {
                if (document.activeElement !== event.currentTarget) onHover(null);
              }}
              onFocus={() => onHover(index)}
              onBlur={() => onHover(null)}
              className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-card p-2 text-left text-13 transition-colors duration-(--duration-micro) ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                isSelected
                  ? 'bg-surface-2 ring-1 ring-line'
                  : isFocused
                    ? 'bg-surface-2'
                    : 'bg-surface-1'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`w-8 shrink-0 font-mono text-11 font-medium ${SIDE_INK[lineup.side]}`}
                >
                  {lineup.side}
                </span>

                <UtilityGlyph
                  kind={lineup.kind}
                  label={UTILITY_NAMES[lineup.kind]}
                  size="control"
                />

                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{lineup.title}</span>
                  {lineup.notes && (
                    <span className="truncate text-11 text-ink-dim">{lineup.notes}</span>
                  )}
                </div>
              </div>

              <span className="shrink-0 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-11 text-ink-dim">
                <Text path={`review.maps.throw.types.${lineup.throwType}`} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
