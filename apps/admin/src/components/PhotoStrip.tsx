import { localImageHash } from '@disa/demo-core';
import { useT } from '@disa/i18n';

const SHOWN = 3;

function sourceOf(url: string, images: Readonly<Record<string, string>>): string | null {
  const hash = localImageHash(url);
  if (hash === null) return url;
  return images[hash] ?? null;
}

/** Up to three thumbnails of a lineup's photos, and a count when there are more. */
export function PhotoStrip({
  urls,
  captions,
  images,
}: {
  urls: readonly string[];
  captions: readonly string[];
  images: Readonly<Record<string, string>>;
}) {
  const t = useT();
  if (urls.length === 0) return null;
  return (
    <ul
      className="flex items-center gap-1"
      aria-label={t('admin.row.photos', { count: urls.length })}
    >
      {urls.slice(0, SHOWN).map((url, index) => {
        const src = sourceOf(url, images);
        return (
          <li
            key={url}
            className="size-10 overflow-hidden rounded-chip border border-line bg-surface-2"
          >
            {src === null ? null : (
              <img
                src={src}
                alt={captions[index] ?? ''}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            )}
          </li>
        );
      })}
      {urls.length > SHOWN ? (
        <li className="numeric text-12 text-ink-dim">+{urls.length - SHOWN}</li>
      ) : null}
    </ul>
  );
}
