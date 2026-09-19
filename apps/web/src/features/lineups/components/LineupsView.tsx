import { THROWN_UTILITY_KINDS, UTILITY_NAMES, type UtilityKind } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { BUILT_IN_LINEUP_MAPS, type BuiltInLineupMap } from '@disa/map-data';
import { Button } from '@disa/ui';
import { Download, Search, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { filterLineups } from '../helpers/lineup-filter';
import { useMapLineups } from '../hooks/use-map-lineups';
import { LineupDetailCard } from './LineupDetailCard';
import { LineupList } from './LineupList';
import { LineupPlate } from './LineupPlate';

type SideScope = 'ALL' | 'CT' | 'T';
type KindScope = 'all' | UtilityKind;

export function LineupsView() {
  const t = useT();

  const [map, setMap] = useState<BuiltInLineupMap>('de_mirage');
  const [side, setSide] = useState<SideScope>('ALL');
  const [kind, setKind] = useState<KindScope>('all');
  const [search, setSearch] = useState('');

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { lineups, deleteLineup, importLineups, exportLineups } = useMapLineups(map);

  const filteredLineups = useMemo(
    () => filterLineups(lineups, { side, kind, search }),
    [lineups, side, kind, search],
  );

  // If filtered items change and selected item is out of bounds, reset selection
  const safeSelectedIndex =
    selectedIndex !== null && selectedIndex < filteredLineups.length ? selectedIndex : null;
  const focusedIndex = hoveredIndex ?? safeSelectedIndex;
  const selectedLineup =
    safeSelectedIndex !== null ? (filteredLineups[safeSelectedIndex] ?? null) : null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const count = await importLineups(file);
      setNotice({
        message: t('library.lineups.importSuccess', { count }),
        isError: false,
      });
    } catch {
      setNotice({
        message: t('library.lineups.importError'),
        isError: true,
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-6 py-4">
      {/* Header & Map switcher */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-ui font-medium text-28 text-ink leading-dense">
            <Text path="library.lineups.title" />
          </h2>
          <p className="text-14 text-ink-dim leading-prose">
            <Text path="library.lineups.note" />
          </p>
        </div>

        {/* Map tabs & Import/Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label={t('library.lineups.map')}
            className="flex flex-wrap items-center gap-1 rounded-card bg-surface-2 p-1"
          >
            {BUILT_IN_LINEUP_MAPS.map((mapId) => (
              <button
                key={mapId}
                type="button"
                onClick={() => {
                  setMap(mapId);
                  setSelectedIndex(null);
                  setHoveredIndex(null);
                }}
                className={`h-8 rounded-card px-2.5 font-ui text-12 font-medium transition-colors ${
                  map === mapId ? 'bg-surface-0 text-ink shadow-xs' : 'text-ink-dim hover:text-ink'
                }`}
              >
                {mapId}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 gap-1.5 px-2.5 text-12"
            >
              <Upload className="size-3.5" />
              <Text path="library.lineups.import" />
            </Button>
            <Button
              variant="secondary"
              onClick={exportLineups}
              className="h-8 gap-1.5 px-2.5 text-12"
            >
              <Download className="size-3.5" />
              <Text path="library.lineups.export" />
            </Button>
          </div>
        </div>
      </header>

      {/* Notice toast */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-card border border-line bg-surface-2 p-2.5 text-13 text-ink"
        >
          {notice.message}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface-2 p-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Side filter */}
          <fieldset
            aria-label={t('library.lineups.side')}
            className="m-0 flex items-center gap-1 rounded-chip border-none bg-surface-1 p-0.5"
          >
            {(['ALL', 'CT', 'T'] as const).map((sideOption) => (
              <button
                key={sideOption}
                type="button"
                onClick={() => {
                  setSide(sideOption);
                  setSelectedIndex(null);
                }}
                className={`h-7 rounded-chip px-2.5 font-mono text-11 font-medium transition-colors ${
                  side === sideOption ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'
                }`}
              >
                {sideOption === 'ALL' ? <Text path="library.lineups.bothSides" /> : sideOption}
              </button>
            ))}
          </fieldset>

          {/* Utility kind filter */}
          <div className="flex flex-wrap items-center gap-1 rounded-chip bg-surface-1 p-0.5">
            <button
              type="button"
              onClick={() => {
                setKind('all');
                setSelectedIndex(null);
              }}
              className={`h-7 rounded-chip px-2.5 text-11 font-medium transition-colors ${
                kind === 'all' ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'
              }`}
            >
              <Text path="library.lineups.allKinds" />
            </button>
            {THROWN_UTILITY_KINDS.map((utilityKind) => (
              <button
                key={utilityKind}
                type="button"
                onClick={() => {
                  setKind(utilityKind);
                  setSelectedIndex(null);
                }}
                className={`flex h-7 items-center gap-1 rounded-chip px-2 text-11 transition-colors ${
                  kind === utilityKind ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'
                }`}
              >
                <UtilityGlyph
                  kind={utilityKind}
                  label={UTILITY_NAMES[utilityKind]}
                  size="control"
                />
                <span className="hidden sm:inline">{UTILITY_NAMES[utilityKind]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search input & Count */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 size-3.5 text-ink-dim" />
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSelectedIndex(null);
              }}
              placeholder={t('library.lineups.searchPlaceholder')}
              className="h-7 w-40 rounded-card border border-line bg-surface-1 pl-8 pr-2 text-12 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus sm:w-52"
            />
          </div>

          <span className="numeric shrink-0 text-12 text-ink-dim">
            <Text path="library.lineups.count" values={{ count: filteredLineups.length }} />
          </span>
        </div>
      </div>

      {/* Main content grid: List + Detail Card on left, Radar Plate on right */}
      <div className="grid min-h-[36rem] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <div className="surface-card flex h-[18rem] flex-col rounded-float p-2">
            <LineupList
              lineups={filteredLineups}
              focused={focusedIndex}
              selectedIndex={safeSelectedIndex}
              onHover={setHoveredIndex}
              onSelect={(index) => setSelectedIndex((prev) => (prev === index ? null : index))}
            />
          </div>

          <LineupDetailCard
            lineup={selectedLineup}
            onDelete={async (id) => {
              await deleteLineup(id);
              setSelectedIndex(null);
            }}
          />
        </aside>

        <section className="surface-card flex min-h-0 min-w-0 items-center justify-center rounded-float p-3">
          <LineupPlate
            map={map}
            lineups={filteredLineups}
            focused={focusedIndex}
            onSelect={(index) => setSelectedIndex(index)}
          />
        </section>
      </div>
    </div>
  );
}
