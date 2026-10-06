import { Text } from '@disa/i18n';
import type { PlateLayout } from '@disa/map-data';
import type { PlatePoint } from '@/features/radar';
import { photosOf } from '../helpers/lineup-photos';
import type { SavedVariant } from '../helpers/lineup-targets';
import { type PeekPlacement, peekPlacement } from '../helpers/peek-placement';
import { LineupPhoto } from './LineupPhoto';
import { LineupThrowKeys } from './LineupThrowKeys';

/** Clear of the origin's own marker, so the card never covers what it describes. */
const SIDE_CLASS: Readonly<Record<PeekPlacement['side'], string>> = {
  right: 'origin-left translate-x-[1.375rem]',
  left: 'origin-right -translate-x-[calc(100%+1.375rem)]',
};

const ALIGN_CLASS: Readonly<Record<PeekPlacement['align'], string>> = {
  start: '-translate-y-[12%]',
  center: '-translate-y-1/2',
  end: '-translate-y-[88%]',
};

const BADGE =
  'numeric absolute top-2 left-2 rounded-chip bg-surface-0/80 px-1.5 py-0.5 font-medium text-10 text-ink-dim';

interface Props {
  id: string;
  variant: SavedVariant;
  number: number;
  origin: PlatePoint;
  layout: PlateLayout;
}

/**
 * What a position looks like from where it is thrown, beside its origin on the map: the first
 * crosshair screenshot and how to throw it. It takes no pointer events, so it can never be between
 * the reader and the next origin.
 */
export function LineupPeek({ id, variant, number, origin, layout }: Props) {
  const { lineup } = variant;
  const photos = photosOf(lineup);
  const [first] = photos;
  const placement = peekPlacement(origin, layout);

  return (
    <div
      id={id}
      role="tooltip"
      style={{
        left: `${((origin.x / layout.width) * 100).toFixed(2)}%`,
        top: `${((origin.y / layout.height) * 100).toFixed(2)}%`,
      }}
      className={`lineup-peek pointer-events-none absolute z-20 w-60 overflow-hidden rounded-float border border-line-strong bg-surface-1 shadow-float ${SIDE_CLASS[placement.side]} ${ALIGN_CLASS[placement.align]}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-2">
        {first !== undefined && (
          <LineupPhoto
            src={first}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        )}
        <span className={BADGE}>
          {first === undefined ? (
            <Text path="library.lineups.peek.noShot" />
          ) : (
            <Text path="library.lineups.peek.shot" values={{ index: 1, count: photos.length }} />
          )}
        </span>
      </div>

      <div className="flex flex-col gap-1 px-3 pt-2.5 pb-3">
        <span className="flex items-center gap-2">
          <span className="numeric grid size-5 shrink-0 place-items-center rounded-full bg-ink font-semibold text-10 text-surface-0">
            {number}
          </span>
          <span className="font-semibold text-13 text-ink leading-snug">{lineup.title}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1 text-12 text-ink-dim">
          <LineupThrowKeys lineup={lineup} />
        </span>
        <span className="label-dense pt-0.5 text-ink-faint">
          <Text path="library.lineups.peek.open" />
        </span>
      </div>
    </div>
  );
}
