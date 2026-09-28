import type { Lineup, LineupSide } from '@disa/demo-core';
import { UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
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
  const t = useT();
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
      aria-label={t('library.lineups.title')}
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
              className={`flex w-full min-w-0 items-center justify-between gap-2 px-2 py-3 text-left text-13 transition-colors duration-(--duration-micro) ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                isSelected || isFocused ? 'bg-surface-2' : 'bg-transparent'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="numeric w-5 shrink-0 font-mono text-10 text-ink-dim">
                  {String(index + 1).padStart(2, '0')}
                </span>
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-medium text-ink">{lineup.title}</span>
                    {lineup.targetCallout && (
                      <span className="shrink-0 rounded-chip border border-line bg-surface-3 px-1.5 py-0.2 text-10 font-mono text-ink-dim">
                        {lineup.targetCallout}
                      </span>
                    )}
                  </div>
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
