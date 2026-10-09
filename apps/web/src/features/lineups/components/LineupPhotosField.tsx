import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { isHttpUrl, moved } from '../helpers/lineup-form-model';
import { type FormPhoto, withPhotoCaption, withPhotoLink } from '../helpers/lineup-form-photos';
import type { PreparedImage } from '../helpers/prepared-image';
import { LineupOptionalMark } from './LineupOptionalMark';
import { PhotoList } from './LineupPhotoList';

export function LineupPhotosField({
  photos,
  setPhotos,
  errorSection,
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
  readonly photos: readonly FormPhoto[];
  readonly setPhotos: React.Dispatch<React.SetStateAction<readonly FormPhoto[]>>;
  readonly errorSection: 'title' | 'photos' | 'coordinates' | 'metadata' | 'media' | null;
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
        <LineupOptionalMark />
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
      <PhotoList
        photos={photos}
        onPreviewEnlarged={setPreviewEnlargedUrl}
        onManualUpload={handleManualUploadClick}
        onReorder={(from, to) => setPhotos((current) => moved(current, from, to))}
        onRemove={(index) => {
          const photo = photos[index];
          if (photo?.kind === 'prepared') {
            URL.revokeObjectURL(photo.image.previewUrl);
            previewUrlsRef.current.delete(photo.image.previewUrl);
          }
          setPhotos((current) => current.filter((_, at) => at !== index));
        }}
        onCaptionChange={(index, caption) =>
          setPhotos((current) =>
            current.map((item, at) => (at === index ? withPhotoCaption(item, caption) : item)),
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
            const { photos: next, replaced } = withPhotoLink(photos, url);
            if (replaced !== null) {
              URL.revokeObjectURL(replaced.previewUrl);
              previewUrlsRef.current.delete(replaced.previewUrl);
            }
            setPhotos(next);
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
