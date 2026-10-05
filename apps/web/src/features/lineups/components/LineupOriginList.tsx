import { Text, useT } from '@disa/i18n';
import { photosOf } from '../helpers/lineup-photos';
import type { SavedTarget } from '../helpers/lineup-targets';

interface Props {
  target: SavedTarget;
  activeId: string;
  onPick: (id: string) => void;
}

/** Every position a target can be thrown from, numbered as they are on the map. */
export function LineupOriginList({ target, activeId, onPick }: Props) {
  const t = useT();

  return (
    <div className="flex flex-col gap-1">
      <h3 className="label-dense pb-0.5 text-ink-dim">
        <Text path="library.lineups.origins" values={{ count: target.variants.length }} />
      </h3>
      {target.variants.map(({ id, lineup }, index) => {
        const isOn = id === activeId;
        const photoCount = photosOf(lineup).length;
        const type = t(`review.maps.throw.types.${lineup.throwType}`);

        return (
          <button
            key={id}
            type="button"
            aria-pressed={isOn}
            onClick={() => onPick(id)}
            className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-card border px-2 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out ${isOn ? 'border-line-strong bg-selected' : 'border-line hover:bg-hover'}`}
          >
            <span
              className={`numeric grid size-6 shrink-0 place-items-center rounded-full font-semibold text-11 ${isOn ? 'bg-ink text-surface-0' : 'bg-surface-3 text-ink'}`}
            >
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-13 text-ink">{lineup.title}</span>
              <span className="truncate text-11 text-ink-dim">
                {photoCount > 0
                  ? t('library.lineups.originMeta', { type, count: photoCount })
                  : type}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
