import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import type { LineupFormValues } from '../helpers/lineup-form-model';
import { isHttpUrl, moved, reorderLineupPhotos } from '../helpers/lineup-form-model';
import type { PreparedImage } from '../helpers/prepared-image';
import { AddedImagesList, PreparedImagesList } from './LineupPhotoLists';

export function LineupPhotosField({
  values,
  updateValue,
  setValues,
  errorSection,
  preparedImages,
  setPreparedImages,
  newImageUrl,
  setNewImageUrl,
  photosRef,
  fileInputRef,
  isDraggingFiles,
  setIsDraggingFiles,
  handleImages,
  handleManualUploadClick,
  setPreviewEnlargedUrl,
  previewUrlsRef,
  setError,
}: {
  readonly values: LineupFormValues;
  readonly updateValue: <K extends keyof LineupFormValues>(
    key: K,
    value: LineupFormValues[K],
  ) => void;
  readonly setValues: React.Dispatch<React.SetStateAction<LineupFormValues>>;
  readonly errorSection: 'title' | 'photos' | 'coordinates' | 'media' | null;
  readonly preparedImages: readonly PreparedImage[];
  readonly setPreparedImages: React.Dispatch<React.SetStateAction<readonly PreparedImage[]>>;
  readonly newImageUrl: string;
  readonly setNewImageUrl: (value: string) => void;
  readonly photosRef: React.RefObject<HTMLDivElement | null>;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly isDraggingFiles: boolean;
  readonly setIsDraggingFiles: (value: boolean) => void;
  readonly handleImages: (files: readonly File[]) => void;
  readonly handleManualUploadClick: (image: PreparedImage) => void;
  readonly setPreviewEnlargedUrl: (value: string | null) => void;
  readonly previewUrlsRef: React.RefObject<Set<string>>;
  readonly setError: (value: string | null) => void;
}) {
  const t = useT();
  return (
    <div
      ref={photosRef}
      className={`flex flex-col gap-2 rounded-card p-2 transition-colors ${
        errorSection === 'photos' ? 'border border-red-500/40 bg-red-500/5' : ''
      }`}
    >
      <label htmlFor="lineup-image-url" className="label-dense text-ink-dim">
        <Text path="library.lineups.form.imageUrls" />
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          void handleImages(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
        className="sr-only"
        aria-label={t('library.lineups.form.choosePhotos')}
      />
      <fieldset
        aria-label={t('library.lineups.form.dropPhotos')}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDraggingFiles(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setIsDraggingFiles(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDraggingFiles(false);
          void handleImages(
            Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/')),
          );
        }}
        className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-dashed p-4 text-center ${isDraggingFiles ? 'border-ink bg-surface-2' : 'border-line bg-surface-1'}`}
      >
        <p className="text-12 text-ink-dim">
          <Text path="library.lineups.form.dropPhotos" />
        </p>
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Text path="library.lineups.form.choosePhotos" />
        </Button>
      </fieldset>
      <PreparedImagesList
        images={preparedImages}
        onPreviewEnlarged={setPreviewEnlargedUrl}
        onManualUpload={handleManualUploadClick}
        onReorder={(from, to) => setPreparedImages((current) => moved(current, from, to))}
        onRemove={(index) => {
          const image = preparedImages[index];
          if (image) {
            URL.revokeObjectURL(image.previewUrl);
            previewUrlsRef.current.delete(image.previewUrl);
            setPreparedImages((previous) => previous.filter((_, at) => at !== index));
          }
        }}
        onCaptionChange={(index, caption) =>
          setPreparedImages((current) =>
            current.map((item, at) => (at === index ? { ...item, caption } : item)),
          )
        }
      />
      <AddedImagesList
        urls={values.imageUrls}
        captions={values.imageCaptions}
        onPreviewEnlarged={setPreviewEnlargedUrl}
        onReorder={(from, to) => setValues((current) => reorderLineupPhotos(current, from, to))}
        onRemove={(index) =>
          setValues((current) => ({
            ...current,
            imageUrls: current.imageUrls.filter((_, at) => at !== index),
            imageCaptions: current.imageCaptions.filter((_, at) => at !== index),
          }))
        }
        onCaptionChange={(index, caption) =>
          updateValue(
            'imageCaptions',
            values.imageCaptions.map((item, at) => (at === index ? caption : item)),
          )
        }
      />
      <div className="flex gap-2">
        <input
          id="lineup-image-url"
          type="url"
          value={newImageUrl}
          onChange={(event) => setNewImageUrl(event.target.value)}
          placeholder="https://..."
          className="h-8 min-w-0 flex-1 rounded-card border border-line bg-surface-1 px-3 text-12 text-ink"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const url = newImageUrl.trim();
            if (!isHttpUrl(url)) {
              setError(t('library.lineups.form.validation.mediaUrlInvalid'));
              return;
            }
            const firstPrepared = preparedImages[0];
            if (!values.imageUrls.includes(url)) {
              setValues((current) => ({
                ...current,
                imageUrls: [...current.imageUrls, url],
                imageCaptions: [...current.imageCaptions, firstPrepared?.caption ?? ''],
              }));
            }
            if (firstPrepared !== undefined) {
              URL.revokeObjectURL(firstPrepared.previewUrl);
              previewUrlsRef.current.delete(firstPrepared.previewUrl);
              setPreparedImages((previous) => previous.slice(1));
            }
            setNewImageUrl('');
            setError(null);
          }}
          className="px-3 text-12"
        >
          <Text path="library.lineups.form.addImage" />
        </Button>
      </div>
      <a
        href="https://catbox.moe/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-11 text-ink-dim underline hover:text-ink"
      >
        <Text path="library.lineups.form.uploadToCatbox" />
      </a>
    </div>
  );
}
