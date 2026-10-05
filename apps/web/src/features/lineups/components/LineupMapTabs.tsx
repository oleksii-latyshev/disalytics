import { useT } from '@disa/i18n';
import { MAP_IDS, type MapId } from '@disa/map-data';
import { mapName } from '../helpers/map-name';

interface Props {
  map: MapId;
  counts: ReadonlyMap<string, number>;
  onMap: (map: MapId) => void;
}

/** A tab per map with how many lineups it has, so a map with none is not a click to find out. */
export function LineupMapTabs({ map, counts, onMap }: Props) {
  const t = useT();

  return (
    <nav
      aria-label={t('library.lineups.map')}
      className="flex flex-wrap gap-1 rounded-card border border-line bg-surface-1 p-1"
    >
      {MAP_IDS.map((id) => {
        const isOn = id === map;
        const count = counts.get(id) ?? 0;

        return (
          <button
            key={id}
            type="button"
            aria-current={isOn ? 'page' : undefined}
            onClick={() => onMap(id)}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-chip px-1.5 text-12 wide:px-3 wide:text-13 transition-colors duration-(--duration-micro) ease-out ${isOn ? 'bg-selected font-semibold text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'}`}
          >
            {mapName(id)}
            <span className={`numeric text-11 ${count === 0 ? 'text-ink-faint' : 'text-ink-dim'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
