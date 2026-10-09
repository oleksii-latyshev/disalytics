import { Text, useT } from '@disa/i18n';
import { AnimatePresence, Button, cn, DURATION_BASE_SECONDS, motion } from '@disa/ui';
import { embeddedBytes, photoSrc } from '../../helpers/photo-src';
import {
  groupPhotos,
  keptTiles,
  movedOrder,
  orderedTiles,
  type PhotoGroup,
  type PhotoTile,
  type Sizes,
  sharperOf,
} from '../../helpers/photos';
import type { ItemState } from '../../helpers/review';

interface Props {
  item: ItemState & { stored: NonNullable<ItemState['stored']> };
  photoBase: string;
  sizes: Sizes;
  images: Readonly<Record<string, string>>;
  onKeep: (tile: string, keep: boolean) => void;
  onOrder: (order: readonly string[]) => void;
}

function kilobytes(bytes: number | null): string | null {
  return bytes === null ? null : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Tile({
  tile,
  label,
  kept,
  best,
  sizes,
  images,
  onToggle,
}: {
  tile: PhotoTile;
  label: string;
  kept: boolean;
  best: boolean;
  sizes: Sizes;
  images: Readonly<Record<string, string>>;
  onToggle: () => void;
}) {
  const size = sizes.get(tile.url);
  const src = photoSrc(tile.url, images);
  const weight = kilobytes(embeddedBytes(tile.url, images));
  return (
    <button
      type="button"
      aria-pressed={kept}
      aria-label={`${label}${size === undefined ? '' : `, ${size.width}×${size.height}`}`}
      onClick={onToggle}
      className={cn(
        'group relative overflow-hidden rounded-chip border bg-surface-2 p-0 text-start transition-[border-color] duration-(--duration-micro)',
        kept ? 'border-ink' : 'border-line hover:border-line-strong',
      )}
    >
      {src === null ? (
        <span className="grid aspect-video place-items-center text-12 text-ink-faint">
          <Text path="admin.photos.unavailable" />
        </span>
      ) : (
        <img
          src={src}
          alt=""
          loading="lazy"
          className={cn(
            'block aspect-video w-full object-cover transition-opacity duration-(--duration-base)',
            kept ? 'opacity-100' : 'opacity-35',
          )}
        />
      )}
      <span className="absolute top-1.5 left-1.5 rounded-[4px] bg-black/70 px-1.5 py-0.5 text-10 uppercase tracking-wider text-ink">
        {label}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-[5px] border-[1.5px] border-ink text-12 transition-[background-color,color] duration-(--duration-micro)',
          kept ? 'bg-ink text-surface-0' : 'bg-black/60',
        )}
      >
        {kept ? '✓' : ''}
      </span>
      <span className="flex justify-between gap-1.5 px-2 py-1.5 text-11 text-ink-dim">
        <span className="numeric">{size === undefined ? '…' : `${size.width}×${size.height}`}</span>
        <span className={cn('numeric', best && 'text-[var(--status-new)]')}>{weight ?? ''}</span>
      </span>
      {tile.caption === '' ? null : (
        <span className="block truncate border-line border-t px-2 py-1 text-11 text-ink-dim">
          {tile.caption}
        </span>
      )}
    </button>
  );
}

function Group({
  group,
  index,
  kept,
  sizes,
  images,
  onKeep,
}: {
  group: PhotoGroup;
  index: number;
  kept: ReadonlySet<string>;
  sizes: Sizes;
  images: Readonly<Record<string, string>>;
  onKeep: (tile: string, keep: boolean) => void;
}) {
  const t = useT();
  const make = (tile: PhotoTile, label: string, best: boolean) => (
    <Tile
      key={tile.id}
      tile={tile}
      label={label}
      kept={kept.has(tile.id)}
      best={best}
      sizes={sizes}
      images={images}
      onToggle={() => onKeep(tile.id, !kept.has(tile.id))}
    />
  );
  if (group.kind === 'same')
    return make(group.tile, t('admin.photos.both', { number: index }), false);
  if (group.kind === 'single') {
    const label = t(group.tile.from === 'stored' ? 'admin.photos.site' : 'admin.photos.file', {
      number: index,
    });
    return make(group.tile, label, false);
  }
  const sharper = sharperOf(group, sizes);
  return (
    <>
      {make(
        group.stored,
        t('admin.photos.site', { number: index }),
        sharper === group.stored && sizes.has(group.file.url),
      )}
      {make(group.file, t('admin.photos.file', { number: index }), sharper === group.file)}
    </>
  );
}

/** The photos of both versions as tiles to keep or drop, and the order the kept ones will have. */
export function PhotoMerge({ item, photoBase, sizes, images, onKeep, onOrder }: Props) {
  const t = useT();
  const groups = groupPhotos(item.stored, item.edited, photoBase);
  const keptList = keptTiles(groups, sizes, item.photoKeep);
  const result = orderedTiles(keptList, item.photoOrder);
  const kept = new Set(keptList.map((tile) => tile.id));
  const ids = result.map((tile) => tile.id);

  return (
    <div className="mt-5 flex flex-col gap-2">
      <h3 className="font-semibold text-16 text-ink">
        <Text path="admin.photos.title" />
      </h3>
      <p className="text-13 text-ink-faint">
        <Text path="admin.photos.hint" />
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {groups.map((group, index) => (
          <Group
            key={group.kind === 'pair' ? group.stored.id : group.tile.id}
            group={group}
            index={index + 1}
            kept={kept}
            sizes={sizes}
            images={images}
            onKeep={onKeep}
          />
        ))}
      </div>
      <p className="text-13 text-ink-faint">
        <Text path="admin.photos.remain" values={{ count: result.length }} />
      </p>
      {result.length > 1 ? (
        <ol
          className="m-0 flex list-none flex-wrap gap-2 p-0"
          aria-label={t('admin.photos.orderLabel')}
        >
          <AnimatePresence initial={false}>
            {result.map((tile, position) => {
              const src = photoSrc(tile.url, images);
              return (
                <motion.li
                  key={tile.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: DURATION_BASE_SECONDS }}
                  className="flex w-28 flex-col gap-1 rounded-chip border border-line bg-surface-2 p-1"
                >
                  {src === null ? null : (
                    <img
                      src={src}
                      alt=""
                      className="aspect-video w-full rounded-[4px] object-cover"
                    />
                  )}
                  <span className="flex items-center justify-between gap-1">
                    <span className="numeric text-12 text-ink-dim">{position + 1}</span>
                    <span className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label={t('admin.photos.earlier')}
                        disabled={position === 0}
                        onClick={() => onOrder(movedOrder(ids, tile.id, -1))}
                      >
                        ←
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label={t('admin.photos.later')}
                        disabled={position === result.length - 1}
                        onClick={() => onOrder(movedOrder(ids, tile.id, 1))}
                      >
                        →
                      </Button>
                    </span>
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      ) : null}
    </div>
  );
}
