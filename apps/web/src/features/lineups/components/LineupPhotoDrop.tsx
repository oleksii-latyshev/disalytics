import { Text, useT } from '@disa/i18n';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PreparedImage } from '../helpers/prepared-image';

interface Props {
  images: readonly PreparedImage[];
  hasFailed: boolean;
  onAdd: (files: readonly File[]) => void;
  onRemove: (index: number) => void;
}

function imagesIn(files: FileList | null | undefined): readonly File[] {
  return Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));
}

/** Where screenshots go: dropped on it, pasted anywhere on the screen, or chosen from the disk. */
export function LineupPhotoDrop({ images, hasFailed, onAdd, onRemove }: Props) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = imagesIn(event.clipboardData?.files);
      if (files.length === 0) return;

      event.preventDefault();
      onAdd(files);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onAdd]);

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label={t('library.lineups.form.choosePhotos')}
        onChange={(event) => {
          onAdd(imagesIn(event.target.files));
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);
          onAdd(imagesIn(event.dataTransfer.files));
        }}
        className={`flex h-16 cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed text-13 transition-colors duration-(--duration-micro) ease-out ${isOver ? 'border-ink bg-hover text-ink' : 'border-line-strong text-ink-dim hover:text-ink'}`}
      >
        <ImagePlus aria-hidden="true" className="size-4" />
        <Text path="library.lineups.addFlow.photos" />
      </button>

      {hasFailed && (
        <p role="alert" className="text-12 text-damage">
          <Text path="library.lineups.form.validation.imageProcessingFailed" />
        </p>
      )}

      {images.length > 0 && (
        <ul className="grid list-none grid-cols-3 gap-1.5">
          {images.map((image, index) => (
            <li key={image.previewUrl} className="relative">
              <img
                src={image.previewUrl}
                alt=""
                className="aspect-[16/10] w-full rounded-card border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={t('library.lineups.form.removeImage')}
                className="absolute top-1 right-1 grid size-5 cursor-pointer place-items-center rounded-full bg-surface-0/80 text-ink hover:bg-surface-0"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
