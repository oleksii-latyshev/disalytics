import type { Lineup, LineupSide } from '@disa/demo-core';
import { UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { CheckSquare, CornerDownRight, Layers, Square, Trash2, Unlink, X } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';

interface Props {
  readonly mode: 'view' | 'edit';
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly selectedIndex: number | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly mergeTarget?: 'origin' | 'landing' | undefined;
  readonly onHover: (index: number | null) => void;
  readonly onSelect: (index: number, modifierKey?: boolean) => void;
  readonly onToggleSelectId: (id: string) => void;
  readonly onMergeSelected?: (() => void) | undefined;
  readonly onUnmergeSelected?: (() => void) | undefined;
  readonly onDeleteSelected?: (() => void) | undefined;
  readonly onClearSelection?: (() => void) | undefined;
  readonly onContextMenu?: (event: React.MouseEvent, lineup: Lineup) => void;
}

const SIDE_INK: Readonly<Record<LineupSide, string>> = {
  CT: 'text-ct',
  T: 'text-t',
  BOTH: 'text-ink-dim',
};

export function LineupList({
  mode,
  lineups,
  focused,
  selectedIndex,
  selectedIds,
  mergeTarget,
  onHover,
  onSelect,
  onToggleSelectId,
  onMergeSelected,
  onUnmergeSelected,
  onDeleteSelected,
  onClearSelection,
  onContextMenu,
}: Props) {
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

  const hasMergedInSelection = Array.from(selectedIds).some((id) => {
    const l = lineups.find((item) => item.id === id);
    return Boolean(l?.groupId);
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      {mode === 'edit' && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-card border border-line bg-surface-2 p-2">
          <span className="font-mono text-11 text-ink font-medium">
            <Text path="library.lineups.selectedCount" values={{ count: selectedIds.size }} />
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {selectedIds.size >= 2 && onMergeSelected && (
              <Button
                variant="secondary"
                onClick={onMergeSelected}
                className="border border-line-strong text-ink hover:bg-surface-3"
              >
                <Layers className="size-3" />
                {mergeTarget === 'origin' ? (
                  <Text path="library.lineups.mergeOrigins" />
                ) : mergeTarget === 'landing' ? (
                  <Text path="library.lineups.mergeLandings" />
                ) : (
                  <Text path="library.lineups.mergeSelected" values={{ count: selectedIds.size }} />
                )}
              </Button>
            )}
            {hasMergedInSelection && onUnmergeSelected && (
              <Button
                variant="secondary"
                onClick={onUnmergeSelected}
                className="border border-line text-ink"
              >
                <Unlink className="size-3" />
                <Text path="library.lineups.unmerge" />
              </Button>
            )}
            {selectedIds.size >= 2 && onDeleteSelected && (
              <Button variant="destructive" onClick={onDeleteSelected} className="text-ink">
                <Trash2 className="size-3" />
                <Text path="library.lineups.deleteSelected" values={{ count: selectedIds.size }} />
              </Button>
            )}
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                aria-label={t('library.lineups.clearSelection')}
                className="rounded-chip p-1 text-ink-dim hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <ul
        aria-label={t('library.lineups.title')}
        className="flex min-h-0 min-w-0 flex-1 list-none flex-col gap-1 overflow-y-auto p-0"
      >
        {lineups.map((lineup, index) => {
          const isSelected = selectedIndex === index;
          const isFocused = focused === index;
          const isChecked = selectedIds.has(lineup.id);
          const hasBounces = Boolean(lineup.waypoints && lineup.waypoints.length > 0);

          return (
            <li
              key={lineup.id}
              className="group relative flex min-w-0 items-center rounded-card"
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu?.(e, lineup);
              }}
            >
              {mode === 'edit' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectId(lineup.id);
                  }}
                  aria-label={t(
                    isChecked ? 'library.lineups.deselectLineup' : 'library.lineups.selectLineup',
                    { title: lineup.title },
                  )}
                  aria-pressed={isChecked}
                  className="flex size-7 shrink-0 items-center justify-center text-ink-dim hover:text-ink"
                >
                  {isChecked ? (
                    <CheckSquare className="size-3.5 text-primary" />
                  ) : (
                    <Square className="size-3.5 text-ink-dim/40 group-hover:text-ink-dim" />
                  )}
                </button>
              )}

              <button
                type="button"
                aria-current={isSelected ? 'true' : undefined}
                onClick={(event) => {
                  const isModifier = event.shiftKey || event.ctrlKey || event.metaKey;
                  if (mode === 'edit' && isModifier) {
                    onToggleSelectId(lineup.id);
                  } else {
                    onSelect(index);
                  }
                }}
                onPointerEnter={() => onHover(index)}
                onPointerLeave={(event) => {
                  if (document.activeElement !== event.currentTarget) onHover(null);
                }}
                onFocus={() => onHover(index)}
                onBlur={() => onHover(null)}
                className={`flex w-full min-w-0 items-center justify-between gap-2 rounded-card py-2.5 pr-2 pl-0.5 text-left text-13 transition-colors duration-(--duration-micro) ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  isSelected || isFocused ? 'bg-surface-2' : 'bg-transparent'
                }`}
              >
                <div className="flex w-full min-w-0 items-center gap-2">
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

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-medium text-ink">{lineup.title}</span>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-11 text-ink-dim">
                        <Text path={`review.maps.throw.types.${lineup.throwType}`} />
                      </span>
                      {lineup.targetCallout && (
                        <span className="shrink-0 rounded-chip border border-line bg-surface-3 px-1.5 py-0.5 text-10 font-mono text-ink-dim">
                          {lineup.targetCallout}
                        </span>
                      )}
                      {lineup.groupId && (
                        <span
                          title={t('library.lineups.merge')}
                          className="flex shrink-0 items-center rounded-chip border border-primary/30 bg-primary/10 px-1 py-0.5 text-10 text-primary"
                        >
                          <Layers className="size-2.5" />
                        </span>
                      )}
                      {hasBounces && (
                        <span
                          title={t('library.lineups.waypointsSection')}
                          className="flex shrink-0 items-center gap-0.5 rounded-chip border border-line bg-surface-3 px-1 py-0.5 text-10 font-mono text-ink-dim"
                        >
                          <CornerDownRight className="size-2.5" />
                          <span>{lineup.waypoints?.length}</span>
                        </span>
                      )}
                    </div>
                    {lineup.notes && (
                      <span className="truncate text-11 text-ink-dim">{lineup.notes}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
