import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Plus, X } from 'lucide-react';
import { useMemo } from 'react';
import type { LineupPlateProps } from './lineup-plate-types';

export function LineupPlateHud({ plateProps }: { readonly plateProps: LineupPlateProps }) {
  const {
    mode = 'view',
    isPlacing = false,
    isAddingBounce = false,
    onToggleAddBounce,
    onCancelPlacement,
    draftOrigin,
    draftWaypoints,
    selectedNodes,
    lineups,
  } = plateProps;
  const lineupsById = useMemo(
    () => new Map(lineups.map((lineup) => [lineup.id, lineup])),
    [lineups],
  );

  return (
    <>
      {/* Creation Mode floating HUD overlay */}
      {isPlacing && (
        <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-card border border-primary/40 bg-surface-0 p-2.5 shadow-card">
          <div className="flex items-center gap-2 text-12 text-ink">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
            <span className="font-medium text-ink">
              <Text path="library.lineups.creatingMode" />:
            </span>
            <span className="text-ink-dim">
              <Text
                path={
                  draftOrigin === null
                    ? 'library.lineups.placeOriginPrompt'
                    : isAddingBounce
                      ? 'library.lineups.placeBouncePrompt'
                      : 'library.lineups.placeLandingPrompt'
                }
              />
            </span>
            {draftOrigin !== null && (
              <span className="rounded-chip border border-primary/30 bg-primary/10 px-2 py-0.5 text-11 text-primary">
                <Text path="library.lineups.placeBounceHint" />
              </span>
            )}
            {draftWaypoints && draftWaypoints.length > 0 && (
              <span className="rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 font-mono text-ink-dim">
                <Text
                  path="library.lineups.bouncesCount"
                  values={{ count: draftWaypoints.length }}
                />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {draftOrigin !== null && onToggleAddBounce && (
              <Button
                variant={isAddingBounce ? 'primary' : 'secondary'}
                onClick={onToggleAddBounce}
              >
                <Plus className="size-3.5" />
                <Text path="library.lineups.addBounce" />
              </Button>
            )}
            {onCancelPlacement && (
              <Button
                variant="ghost"
                onClick={onCancelPlacement}
                className="text-ink-dim hover:text-ink"
              >
                <X className="size-3.5" />
                <Text path="library.lineups.form.cancel" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Edit mode active indicator / node selected count */}
      {mode === 'edit' && !isPlacing && (
        <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-card border border-primary/30 bg-surface-0 px-2.5 py-1 text-11 shadow-sm">
          <span className="flex size-2 rounded-full bg-primary" />
          <span className="font-medium text-primary">
            <Text path="library.lineups.editModeActive" />
          </span>
          {selectedNodes && selectedNodes.length > 0 && (
            <>
              <span className="border-l border-line pl-2 font-mono text-10 text-ink">
                <Text
                  path="library.lineups.nodeSelected"
                  values={{ count: selectedNodes.length }}
                />
              </span>
              {selectedNodes.map((node) => {
                const lineup = lineupsById.get(node.lineupId);
                if (lineup === undefined) return null;

                return (
                  <span
                    key={`${node.lineupId}:${node.target}:${node.waypointIndex ?? ''}`}
                    title={lineup.title}
                    className="flex max-w-64 min-w-0 flex-wrap items-center gap-x-1 rounded-chip border border-line bg-surface-1 px-1.5 py-0.5 text-10 text-ink"
                  >
                    <span className="max-w-40 truncate">{lineup.title}</span>
                    <span className="text-ink-dim">·</span>
                    {node.target === 'origin' ? (
                      <Text path="library.lineups.selectedOrigin" />
                    ) : node.target === 'landing' ? (
                      <Text path="library.lineups.selectedLanding" />
                    ) : (
                      <Text
                        path="library.lineups.selectedBounce"
                        values={{ index: (node.waypointIndex ?? 0) + 1 }}
                      />
                    )}
                  </span>
                );
              })}
            </>
          )}
        </div>
      )}
    </>
  );
}
