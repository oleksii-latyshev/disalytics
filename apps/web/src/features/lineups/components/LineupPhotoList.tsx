import { isLocalImageRef } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Maximize2, X } from 'lucide-react';
import { useState } from 'react';
import { type FormPhoto, photoCaption } from '../helpers/lineup-form-photos';
import type { PreparedImage } from '../helpers/prepared-image';
import { LineupPhoto } from './LineupPhoto';

interface PhotoListProps {
  readonly photos: readonly FormPhoto[];
  readonly onPreviewEnlarged: (url: string) => void;
  readonly onManualUpload: (image: PreparedImage) => void;
  readonly onReorder: (from: number, to: number) => void;
  readonly onRemove: (index: number) => void;
  readonly onCaptionChange: (index: number, caption: string) => void;
}

function PhotoThumb({
  photo,
  onPreviewEnlarged,
}: {
  readonly photo: FormPhoto;
  readonly onPreviewEnlarged: (url: string) => void;
}) {
  const t = useT();
  const url = photo.kind === 'stored' ? photo.url : photo.image.previewUrl;
  return (
    <button
      type="button"
      onClick={() => onPreviewEnlarged(url)}
      title={t('library.lineups.form.viewPhoto')}
      aria-label={t('library.lineups.form.viewPhoto')}
      className="group relative size-10 shrink-0 cursor-zoom-in overflow-hidden rounded-chip"
    >
      {photo.kind === 'stored' ? (
        <LineupPhoto src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <img src={url} alt="" className="size-full object-cover" />
      )}
      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <Maximize2 className="size-3.5" />
      </span>
    </button>
  );
}

function PhotoLabel({ photo }: { readonly photo: FormPhoto }) {
  const t = useT();
  const label =
    photo.kind === 'prepared'
      ? `${photo.image.file.name} · ${Math.round(photo.image.file.size / 1024)} KB`
      : isLocalImageRef(photo.url)
        ? t('library.lineups.form.storedOnDevice')
        : photo.url;
  return <span className="min-w-0 flex-1 truncate text-11 text-ink-dim">{label}</span>;
}

function PreparedActions({
  image,
  onManualUpload,
}: {
  readonly image: PreparedImage;
  readonly onManualUpload: (image: PreparedImage) => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onManualUpload(image)}
        className="flex items-center gap-1 rounded-chip border border-line bg-surface-2 px-2 py-1 text-11 text-ink hover:bg-surface-3"
      >
        <ExternalLink className="size-3" />
        <Text path="library.lineups.form.uploadManual" />
      </button>
      <a
        href={image.previewUrl}
        download={image.file.name}
        className="rounded-chip border border-line bg-surface-2 px-2 py-1 text-11 text-ink hover:bg-surface-3"
      >
        <Text path="library.lineups.form.downloadWebp" />
      </a>
    </>
  );
}

/** Every photo of the lineup in the order it is saved — links, stored photos and picked files alike. */
export function PhotoList({
  photos,
  onPreviewEnlarged,
  onManualUpload,
  onReorder,
  onRemove,
  onCaptionChange,
}: PhotoListProps) {
  const t = useT();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {photos.map((photo, index) => (
        <li
          key={photo.kind === 'stored' ? photo.url : photo.image.previewUrl}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', `photo:${index}`);
            setDraggedIndex(index);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverIndex(index);
          }}
          onDragLeave={() => {
            if (dragOverIndex === index) setDragOverIndex(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedIndex !== null && draggedIndex !== index) {
              onReorder(draggedIndex, index);
            }
            setDraggedIndex(null);
            setDragOverIndex(null);
          }}
          onDragEnd={() => {
            setDraggedIndex(null);
            setDragOverIndex(null);
          }}
          className={`flex flex-wrap items-center gap-2 rounded-card border bg-surface-1 p-2 transition-colors ${
            dragOverIndex === index ? 'border-ink bg-surface-2' : 'border-line'
          }`}
        >
          <span
            aria-hidden="true"
            className="cursor-grab p-1 text-ink-dim hover:text-ink active:cursor-grabbing"
            title={t('library.lineups.form.dragToReorder')}
          >
            <GripVertical className="size-4" />
          </span>
          <PhotoThumb photo={photo} onPreviewEnlarged={onPreviewEnlarged} />
          <PhotoLabel photo={photo} />
          {photo.kind === 'prepared' && (
            <PreparedActions image={photo.image} onManualUpload={onManualUpload} />
          )}
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onReorder(index, index - 1)}
            aria-label={t('library.lineups.form.moveUp')}
            className="p-1 text-ink-dim hover:text-ink disabled:opacity-30"
          >
            <ArrowUp className="size-4" />
          </button>
          <button
            type="button"
            disabled={index === photos.length - 1}
            onClick={() => onReorder(index, index + 1)}
            aria-label={t('library.lineups.form.moveDown')}
            className="p-1 text-ink-dim hover:text-ink disabled:opacity-30"
          >
            <ArrowDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={t('library.lineups.form.removeImage')}
            className="rounded-chip p-1 text-ink-dim hover:text-ink"
          >
            <X className="size-4" />
          </button>
          <input
            type="text"
            value={photoCaption(photo)}
            onChange={(event) => onCaptionChange(index, event.target.value)}
            aria-label={t('library.lineups.form.photoCaption')}
            placeholder={t('library.lineups.form.photoCaptionPlaceholder')}
            className="h-8 w-full rounded-card border border-line bg-surface-2 px-3 text-12 text-ink"
          />
        </li>
      ))}
    </ul>
  );
}
