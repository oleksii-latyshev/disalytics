import type { UtilityKind } from '@disa/demo-core';
import { THROWN_UTILITY_KINDS, UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { MAP_IDS, type MapId } from '@disa/map-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@disa/ui';
import { X } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import type { InteractionMode } from '../hooks/use-lineup-selection';

type SideScope = 'ALL' | 'CT' | 'T';
type Point = { readonly x: number; readonly y: number };

export function LineupsFilterSidebar({
  map,
  setMap,
  side,
  setSide,
  kind,
  setKind,
  mode,
  editGrenadeKind,
  setEditGrenadeKind,
  setSelectedId,
  setSelectedIds,
  setSelectedNodes,
  setHoveredId,
  setOrigin,
  setDraftWaypoints,
  setIsAddingBounce,
  setIsPlacing,
  isPlacing,
  origin,
  isAddingBounce,
  notice,
  handleCancelPlacement,
  onEnterCoordinates,
}: {
  readonly map: MapId;
  readonly setMap: React.Dispatch<React.SetStateAction<MapId>>;
  readonly side: SideScope;
  readonly setSide: React.Dispatch<React.SetStateAction<SideScope>>;
  readonly kind: 'all' | UtilityKind;
  readonly setKind: React.Dispatch<React.SetStateAction<'all' | UtilityKind>>;
  readonly mode: InteractionMode;
  readonly editGrenadeKind: UtilityKind;
  readonly setEditGrenadeKind: React.Dispatch<React.SetStateAction<UtilityKind>>;
  readonly setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly setSelectedNodes: React.Dispatch<
    React.SetStateAction<readonly import('../helpers/lineup-layer').SelectedLineupNode[]>
  >;
  readonly setHoveredId: React.Dispatch<React.SetStateAction<string | null>>;
  readonly setOrigin: React.Dispatch<React.SetStateAction<Point | null>>;
  readonly setDraftWaypoints: React.Dispatch<React.SetStateAction<Point[]>>;
  readonly setIsAddingBounce: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setIsPlacing: React.Dispatch<React.SetStateAction<boolean>>;
  readonly isPlacing: boolean;
  readonly origin: Point | null;
  readonly isAddingBounce: boolean;
  readonly notice: string | null;
  readonly handleCancelPlacement: () => void;
  readonly onEnterCoordinates: () => void;
}) {
  const t = useT();
  return (
    <aside className="surface-card z-10 flex min-w-0 flex-col gap-4 rounded-float p-3 lg:min-h-0 lg:overflow-y-auto xl:absolute xl:inset-y-3 xl:left-3 xl:w-[14rem]">
      <div className="flex flex-col gap-2">
        <span className="label-dense text-ink-dim">
          <Text path="library.lineups.map" />
        </span>
        <Select
          value={map}
          onValueChange={(val) => {
            if (!val) return;
            setMap(val as MapId);
            setSelectedId(null);
            setSelectedIds(new Set());
            setSelectedNodes([]);
            setHoveredId(null);
            setOrigin(null);
            setDraftWaypoints([]);
            setIsAddingBounce(false);
            setIsPlacing(false);
          }}
        >
          <SelectTrigger aria-label={t('library.lineups.map')} className="h-8 w-full bg-surface-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAP_IDS.map((mapId) => (
              <SelectItem key={mapId} value={mapId}>
                {mapId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset
        aria-label={t('library.lineups.side')}
        className="m-0 flex flex-col gap-2 border-none p-0"
      >
        <legend className="label-dense text-ink-dim">
          <Text path="library.lineups.side" />
        </legend>
        <div className="flex items-center gap-1">
          {(['ALL', 'CT', 'T'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSide(option);
                setSelectedId(null);
              }}
              className={`flex-1 rounded-chip px-2.5 py-1.5 text-11 ${side === option ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-surface-2'}`}
            >
              {option === 'ALL' ? <Text path="library.lineups.bothSides" /> : option}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="label-dense text-ink-dim">
          <Text path="library.lineups.form.kind" />
        </span>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
          <button
            type="button"
            onClick={() => {
              setKind('all');
              setSelectedId(null);
            }}
            className={`rounded-card px-3 py-2 text-left text-12 ${kind === 'all' ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
          >
            <Text path="library.lineups.allKinds" />
          </button>
          {THROWN_UTILITY_KINDS.map((utilityKind) => (
            <button
              key={utilityKind}
              type="button"
              onClick={() => {
                setKind(utilityKind);
                setSelectedId(null);
              }}
              aria-label={UTILITY_NAMES[utilityKind]}
              className={`flex items-center gap-2 rounded-card px-3 py-2 text-left text-12 ${kind === utilityKind ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
            >
              <UtilityGlyph kind={utilityKind} label={UTILITY_NAMES[utilityKind]} size="control" />
              <span>{UTILITY_NAMES[utilityKind]}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'edit' && isPlacing && (
        <div className="flex flex-col gap-2">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.grenadeKind" />
          </span>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
            {THROWN_UTILITY_KINDS.map((utilityKind) => (
              <button
                key={utilityKind}
                type="button"
                onClick={() => setEditGrenadeKind(utilityKind)}
                aria-label={UTILITY_NAMES[utilityKind]}
                className={`flex items-center gap-2 rounded-card px-3 py-2 text-left text-12 ${editGrenadeKind === utilityKind ? 'bg-primary/15 text-ink ring-1 ring-primary/40' : 'text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
              >
                <UtilityGlyph
                  kind={utilityKind}
                  label={UTILITY_NAMES[utilityKind]}
                  size="control"
                />
                <span>{UTILITY_NAMES[utilityKind]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        role="status"
        className="rounded-card border border-line bg-surface-2 p-2.5 text-11 text-ink-dim"
      >
        <Text
          path={mode === 'edit' ? 'library.lineups.editModeHint' : 'library.lineups.viewModeHint'}
        />
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-card border border-line bg-surface-2 p-2.5 text-12 text-ink"
        >
          {notice}
        </div>
      )}

      {isPlacing && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-card border border-primary/40 bg-surface-2 p-3 text-12 text-ink"
        >
          <Text
            path={
              origin === null
                ? 'library.lineups.placeOrigin'
                : isAddingBounce
                  ? 'library.lineups.placeBouncePrompt'
                  : 'library.lineups.placeLanding'
            }
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onEnterCoordinates}
              className="text-left text-11 text-ink-dim underline hover:text-ink"
            >
              <Text path="library.lineups.enterCoordinates" />
            </button>
            <button
              type="button"
              onClick={handleCancelPlacement}
              aria-label={t('library.lineups.form.cancel')}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
