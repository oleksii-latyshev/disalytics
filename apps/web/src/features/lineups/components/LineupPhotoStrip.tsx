import type { Lineup } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { captionsOf, photosOf } from '../helpers/lineup-photos';
import { LineupPhoto } from './LineupPhoto';

interface Props {
  lineup: Lineup;
  onOpen: (index: number) => void;
}

/** The lineup's photos as thumbnails, or what to add when it has none. */
export function LineupPhotoStrip({ lineup, onOpen }: Props) {
  const t = useT();
  const photos = photosOf(lineup);
  const captions = captionsOf(lineup);

  if (photos.length === 0) {
    return (
      <p className="text-12 text-ink-faint leading-prose">
        <Text path="library.lineups.noPhotos" />
      </p>
    );
  }

  return (
    <ul className="grid list-none grid-cols-3 gap-1.5">
      {photos.map((url, index) => (
        <li key={url}>
          <button
            type="button"
            title={captions[index] || undefined}
            aria-label={t('library.lineups.openPhoto', { number: index + 1 })}
            onClick={() => onOpen(index)}
            className="block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-card border border-line bg-surface-2 transition-colors duration-(--duration-micro) ease-out hover:border-line-strong"
          >
            <LineupPhoto
              src={url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-full object-cover"
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
