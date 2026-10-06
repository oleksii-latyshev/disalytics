import { Text, useT } from '@disa/i18n';
import { photosOf } from '../helpers/lineup-photos';
import type { SavedTarget } from '../helpers/lineup-targets';
import { LineupPhoto } from './LineupPhoto';

interface Props {
  target: SavedTarget;
  activeId: string;
  /** The row the pointer or the keyboard is on, or the origin on the map that is. */
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}

/**
 * Every position a target can be thrown from, numbered as they are on the map and showing the first
 * crosshair screenshot of each. A row and its origin light together; pressing either opens it.
 */
export function LineupOriginList({ target, activeId, hoveredId, onHover, onOpen }: Props) {
  const t = useT();

  return (
    <div className="flex flex-col gap-1">
      <h3 className="label-dense text-ink-dim">
        <Text path="library.lineups.origins" values={{ count: target.variants.length }} />
      </h3>
      <p className="pb-0.5 text-11 text-ink-faint">
        <Text path="library.lineups.originsHint" />
      </p>
      {target.variants.map(({ id, lineup }, index) => {
        const isOn = id === activeId;
        const isLit = id === hoveredId;
        const photos = photosOf(lineup);
        const [first] = photos;
        const type = t(`review.maps.throw.types.${lineup.throwType}`);

        return (
          <button
            key={id}
            type="button"
            aria-current={isOn}
            aria-haspopup="dialog"
            onClick={() => onOpen(id)}
            onPointerEnter={() => onHover(id)}
            onPointerLeave={() => onHover(null)}
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible')) onHover(id);
            }}
            onBlur={() => onHover(null)}
            className={`flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-card border p-1.5 text-left transition-colors duration-(--duration-micro) ease-out ${isLit ? 'border-line-strong bg-hover' : isOn ? 'border-line-strong bg-selected' : 'border-line hover:bg-hover'}`}
          >
            <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-chip bg-surface-2">
              {first !== undefined && (
                <LineupPhoto
                  src={first}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
              )}
              <span
                className={`numeric absolute top-1 left-1 grid size-4 place-items-center rounded-full font-semibold text-10 ${isOn || isLit ? 'bg-ink text-surface-0' : 'bg-surface-0/80 text-ink'}`}
              >
                {index + 1}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-13 text-ink">{lineup.title}</span>
              <span className="truncate text-11 text-ink-dim">
                {photos.length > 0
                  ? t('library.lineups.originMeta', { type, count: photos.length })
                  : type}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
