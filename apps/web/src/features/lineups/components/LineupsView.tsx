import {
  type Lineup,
  THROWN_UTILITY_KINDS,
  UTILITY_NAMES,
  type UtilityKind,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { MAP_IDS, type MapId } from '@disa/map-data';
import { Button, Dialog } from '@disa/ui';
import { Download, Plus, Search, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { filterLineups } from '../helpers/lineup-filter';
import { groupLineupsByOrigin } from '../helpers/lineup-plot';
import { useMapLineups } from '../hooks/use-map-lineups';
import { LineupDetailCard } from './LineupDetailCard';
import { LineupFormModal } from './LineupFormModal';
import { LineupPlate } from './LineupPlate';

type SideScope = 'ALL' | 'CT' | 'T';
type KindScope = 'all' | UtilityKind;
type Point = { readonly x: number; readonly y: number };

function lineupsNearOrigin(lineups: readonly Lineup[], selected: Lineup | null): readonly Lineup[] {
  if (selected === null) return [];
  return lineups.filter((lineup) => {
    const dx = lineup.origin.x - selected.origin.x;
    const dy = lineup.origin.y - selected.origin.y;
    return dx * dx + dy * dy < 80 * 80;
  });
}

function LineupSidebar({
  lineups,
  selected,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: {
  readonly lineups: readonly Lineup[];
  readonly selected: Lineup | null;
  readonly selectedId: string | null;
  readonly onSelect: (id: string | null) => void;
  readonly onEdit: (lineup: Lineup) => void;
  readonly onDelete: (id: string) => void;
}) {
  const t = useT();
  const nearby = lineupsNearOrigin(lineups, selected);

  return (
    <aside className="flex flex-col gap-3">
      {lineups.length > 0 && (
        <select
          aria-label={t('library.lineups.choose')}
          value={selectedId ?? ''}
          onChange={(event) => onSelect(event.target.value || null)}
          className="h-9 w-full rounded-card border border-line bg-surface-1 px-3 text-12 text-ink"
        >
          <option value="">{t('library.lineups.choose')}</option>
          {lineups.map((lineup) => (
            <option key={lineup.id} value={lineup.id}>
              {lineup.title}
            </option>
          ))}
        </select>
      )}
      {selected === null && lineups.length === 0 ? (
        <div className="surface-card flex min-h-[12rem] items-center justify-center rounded-float p-6 text-center text-13 text-ink-dim">
          <Text path="library.lineups.emptyMap" />
        </div>
      ) : (
        <LineupDetailCard lineup={selected} onEdit={onEdit} onDelete={onDelete} />
      )}
      {nearby.length > 1 && (
        <div className="surface-card flex flex-col gap-1 rounded-float p-3">
          <span className="label-dense mb-1 text-ink-dim">
            <Text path="library.lineups.nearby" />
          </span>
          {nearby.map((lineup) => (
            <button
              key={lineup.id}
              type="button"
              onClick={() => onSelect(lineup.id)}
              className={`rounded-card p-2 text-left text-12 ${selectedId === lineup.id ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:bg-surface-2 hover:text-ink'}`}
            >
              {lineup.title}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

export function LineupsView() {
  const t = useT();
  const [map, setMap] = useState<MapId>('de_mirage');
  const [side, setSide] = useState<SideScope>('ALL');
  const [kind, setKind] = useState<KindScope>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Point | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [editingLineup, setEditingLineup] = useState<Lineup | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftLanding, setDraftLanding] = useState<Point | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<readonly string[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { lineups, reload, deleteLineup, importLineups, exportLineups } = useMapLineups(map);

  const filteredLineups = useMemo(
    () => filterLineups(lineups, { side, kind, search }),
    [lineups, side, kind, search],
  );
  const selectedIndex = filteredLineups.findIndex((lineup) => lineup.id === selectedId);
  const selectedLineup = selectedIndex >= 0 ? (filteredLineups[selectedIndex] ?? null) : null;
  const originGroups = useMemo(() => groupLineupsByOrigin(filteredLineups), [filteredLineups]);
  const selectedGroup =
    selectedGroupIds?.flatMap((id) => filteredLineups.filter((item) => item.id === id)) ?? [];

  const handleSelectMarker = (index: number | null) => {
    if (index === null) {
      setSelectedId(null);
      return;
    }
    const group = originGroups.find(({ indices }) => indices.includes(index));
    if (group !== undefined && group.indices.length > 1) {
      setSelectedGroupIds(
        group.indices.flatMap((position) => {
          const lineup = filteredLineups[position];
          return lineup === undefined ? [] : [lineup.id];
        }),
      );
      return;
    }
    setSelectedId(filteredLineups[index]?.id ?? null);
  };

  const handleMapPoint = (point: Point) => {
    if (origin === null) {
      setOrigin(point);
      return;
    }
    setDraftLanding(point);
    setIsPlacing(false);
    setIsModalOpen(true);
  };

  const dismissForm = () => {
    setIsModalOpen(false);
    setEditingLineup(null);
    setOrigin(null);
    setDraftLanding(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const count = await importLineups(file);
      setNotice(t('library.lineups.importSuccess', { count }));
    } catch {
      setNotice(t('library.lineups.importError'));
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-4 py-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-ui font-medium text-28 text-ink leading-dense">
            <Text path="library.lineups.title" />
          </h2>
          <p className="text-14 text-ink-dim leading-prose">
            <Text path="library.lineups.note" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setIsPlacing(true);
              setOrigin(null);
              setSelectedId(null);
            }}
            className="gap-2"
          >
            <Plus className="size-4" />
            <Text path="library.lineups.create" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="size-3.5" />
            <Text path="library.lineups.import" />
          </Button>
          <Button variant="secondary" onClick={() => void exportLineups()} className="gap-1.5">
            <Download className="size-3.5" />
            <Text path="library.lineups.export" />
          </Button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label={t('library.lineups.map')}
        className="flex flex-wrap gap-1 rounded-card bg-surface-2 p-1"
      >
        {MAP_IDS.map((mapId) => (
          <button
            key={mapId}
            type="button"
            role="tab"
            aria-selected={map === mapId}
            onClick={() => {
              setMap(mapId);
              setSelectedId(null);
              setOrigin(null);
              setIsPlacing(false);
            }}
            className={`rounded-card px-3 py-2 font-ui text-12 transition-colors ${map === mapId ? 'bg-surface-0 text-ink' : 'text-ink-dim hover:text-ink'}`}
          >
            {mapId}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-card bg-surface-2 p-2">
        <fieldset
          aria-label={t('library.lineups.side')}
          className="m-0 flex items-center gap-1 border-none p-0"
        >
          {(['ALL', 'CT', 'T'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSide(option);
                setSelectedId(null);
              }}
              className={`rounded-chip px-2.5 py-1.5 text-11 ${side === option ? 'bg-surface-3 text-ink' : 'text-ink-dim'}`}
            >
              {option === 'ALL' ? <Text path="library.lineups.bothSides" /> : option}
            </button>
          ))}
        </fieldset>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setKind('all');
              setSelectedId(null);
            }}
            className={`rounded-chip px-2.5 py-1.5 text-11 ${kind === 'all' ? 'bg-surface-3 text-ink' : 'text-ink-dim'}`}
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
              className={`flex items-center gap-1 rounded-chip px-2 py-1.5 text-11 ${kind === utilityKind ? 'bg-surface-3 text-ink' : 'text-ink-dim'}`}
            >
              <UtilityGlyph kind={utilityKind} label={UTILITY_NAMES[utilityKind]} size="control" />
              <span className="hidden sm:inline">{UTILITY_NAMES[utilityKind]}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-ink-dim" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedId(null);
            }}
            placeholder={t('library.lineups.searchPlaceholder')}
            className="h-8 w-40 rounded-card border border-line bg-surface-1 pl-8 pr-2 text-12 text-ink placeholder:text-ink-dim sm:w-52"
          />
        </div>
        <span className="numeric text-12 text-ink-dim">
          <Text path="library.lineups.count" values={{ count: filteredLineups.length }} />
        </span>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-card border border-line bg-surface-2 p-2.5 text-13 text-ink"
        >
          {notice}
        </div>
      )}
      {isPlacing && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface-2 px-4 py-3 text-13 text-ink"
        >
          <Text
            path={origin === null ? 'library.lineups.placeOrigin' : 'library.lineups.placeLanding'}
          />
          <button
            type="button"
            onClick={() => {
              setIsPlacing(false);
              setOrigin(null);
              setDraftLanding(null);
              setIsModalOpen(true);
            }}
            className="ml-auto text-11 text-ink-dim underline hover:text-ink"
          >
            <Text path="library.lineups.enterCoordinates" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlacing(false);
              setOrigin(null);
            }}
            aria-label={t('library.lineups.form.cancel')}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <section className="surface-card flex min-w-0 items-center justify-center rounded-float p-3">
          <LineupPlate
            map={map}
            lineups={filteredLineups}
            focused={selectedIndex >= 0 ? selectedIndex : null}
            onSelect={handleSelectMarker}
            onPlace={isPlacing ? handleMapPoint : undefined}
            draftOrigin={origin}
          />
        </section>
        <LineupSidebar
          lineups={filteredLineups}
          selected={selectedLineup}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onEdit={(lineup) => {
            setEditingLineup(lineup);
            setIsModalOpen(true);
          }}
          onDelete={(id) => {
            void deleteLineup(id).then(() => setSelectedId(null));
          }}
        />
      </div>
      {selectedGroupIds !== null && (
        <Dialog
          isOpen
          onDismiss={() => setSelectedGroupIds(null)}
          className="w-full max-w-[36rem] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-ui text-16 font-medium text-ink">
              <Text path="library.lineups.fromPosition" values={{ count: selectedGroup.length }} />
            </h3>
            <button
              type="button"
              onClick={() => setSelectedGroupIds(null)}
              aria-label={t('library.lineups.form.close')}
              className="rounded-chip p-1 text-ink-dim hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 grid max-h-[60vh] gap-2 overflow-y-auto">
            {selectedGroup.map((lineup) => {
              const preview =
                lineup.imageUrls?.[0] ??
                (/\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(lineup.mediaUrl ?? '')
                  ? lineup.mediaUrl
                  : undefined);
              return (
                <button
                  key={lineup.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(lineup.id);
                    setSelectedGroupIds(null);
                  }}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-2 text-left hover:bg-surface-2"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-16 shrink-0 rounded-chip object-cover"
                    />
                  ) : (
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-chip bg-surface-2">
                      <UtilityGlyph
                        kind={lineup.kind}
                        label={UTILITY_NAMES[lineup.kind]}
                        size="control"
                      />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-13 font-medium text-ink">{lineup.title}</span>
                    <span className="text-11 text-ink-dim">{UTILITY_NAMES[lineup.kind]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Dialog>
      )}
      {isModalOpen && (
        <LineupFormModal
          isOpen
          onDismiss={dismissForm}
          initialData={
            editingLineup ??
            (origin && draftLanding
              ? { origin: { ...origin, z: 0 }, landing: { ...draftLanding, z: 0 }, map }
              : undefined)
          }
          defaultMap={map}
          onSaved={(lineup) => {
            setSelectedId(lineup.id);
            void reload();
          }}
        />
      )}
    </div>
  );
}
