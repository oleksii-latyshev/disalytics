import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LineupPhoto } from './LineupPhoto';

const STEP = 'absolute top-1/2 -translate-y-1/2 rounded-full bg-surface-0/70';

interface Props {
  photos: readonly string[];
  captions: readonly string[];
  title: string;
  index: number;
  onIndex: (index: number) => void;
  onAdd: () => void;
}

/** A position's crosshair screenshots: one at size, a way to step through them, and a strip of all. */
export function LineupPositionShots({ photos, captions, title, index, onIndex, onAdd }: Props) {
  const t = useT();
  const url = photos[index];
  const count = photos.length;

  if (url === undefined) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 bg-surface-0 p-6 text-center">
        <p className="text-14 text-ink-dim">
          <Text path="library.lineups.position.noShots" />
        </p>
        <Button variant="outline" size="lg" onClick={onAdd} className="border-dashed">
          <Text path="library.lineups.position.addShot" />
        </Button>
      </div>
    );
  }

  const step = (by: number) => onIndex((index + by + count) % count);

  return (
    <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-surface-0">
      <div className="relative min-h-64 min-w-0">
        <LineupPhoto
          key={url}
          src={url}
          alt={captions[index] || title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-contain"
        />
        <span className="numeric absolute bottom-4 left-1/2 -translate-x-1/2 rounded-chip bg-surface-0/80 px-2.5 py-1 font-medium text-12 text-ink-dim">
          <Text path="library.lineups.position.shot" values={{ index: index + 1, count }} />
        </span>
        {count > 1 && (
          <>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => step(-1)}
              aria-label={t('library.lineups.previousPhoto')}
              className={`${STEP} left-3.5`}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => step(1)}
              aria-label={t('library.lineups.nextPhoto')}
              className={`${STEP} right-3.5`}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex list-none gap-2 overflow-x-auto [border-block-start:1px_solid_var(--color-line)] bg-surface-1 px-3 py-2.5">
          {photos.map((photo, thumb) => (
            <li key={photo} className="shrink-0">
              <button
                type="button"
                aria-label={t('library.lineups.position.shotNumber', { number: thumb + 1 })}
                aria-current={thumb === index}
                onClick={() => onIndex(thumb)}
                className={`block h-[3.375rem] w-24 cursor-pointer overflow-hidden rounded-chip border-2 bg-surface-2 transition-[border-color,opacity] duration-(--duration-micro) ease-out ${thumb === index ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <LineupPhoto
                  src={photo}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
