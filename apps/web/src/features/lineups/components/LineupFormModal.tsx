import type { Lineup } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { LineupFormData } from '../helpers/lineup-form-model';
import { useLineupFormController } from '../hooks/use-lineup-form-controller';
import { LineupBasicFields } from './LineupBasicFields';
import { LineupConfirmDialog } from './LineupConfirmDialog';
import { LineupMetadata } from './LineupMetadata';
import { CatboxNoticeDialog, EnlargedPhotoDialog } from './LineupPhotoDialogs';
import { LineupPhotosField } from './LineupPhotosField';

export { buildLineupFromForm } from '../helpers/build-lineup-from-form';
export {
  initFormValues,
  type LineupFormData,
  type LineupFormValues,
} from '../helpers/lineup-form-model';

interface Props {
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  readonly initialData?: LineupFormData | null | undefined;
  readonly defaultMap?: string | undefined;
  readonly onSaved?: ((lineup: Lineup) => void) | undefined;
}

export function LineupFormModal({
  isOpen,
  onDismiss,
  initialData,
  defaultMap = 'de_mirage',
  onSaved,
}: Props) {
  const t = useT();

  const {
    values,
    error,
    setError,
    errorSection,
    saving,
    newImageUrl,
    setNewImageUrl,
    photos,
    setPhotos,
    previewEnlargedUrl,
    setPreviewEnlargedUrl,
    showCatboxModal,
    setShowCatboxModal,
    dontRemindCatbox,
    setDontRemindCatbox,
    previewUrlsRef,
    fileInputRef,
    errorRef,
    photosRef,
    isDraggingFiles,
    setIsDraggingFiles,
    handleManualUploadClick,
    confirmManualUpload,
    updateValue,
    updateMap,
    updateLandingCoord,
    toggleMovementKey,
    handleImages,
    handleSave,
    handleExit,
    exitGuard,
  } = useLineupFormController({ isOpen, initialData, defaultMap, onSaved, onDismiss });
  if (!isOpen) return null;

  return createPortal(
    <section
      data-shortcuts-suspended
      onDragEnter={(e) => {
        e.preventDefault();
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files).filter((file) =>
          file.type.startsWith('image/'),
        );
        if (files.length > 0) {
          void handleImages(files);
        }
      }}
      className="fixed inset-0 z-30 overflow-y-auto bg-surface-0"
      aria-label={t(initialData?.id ? 'library.lineups.edit' : 'library.lineups.create')}
    >
      <form
        noValidate
        onSubmit={handleSave}
        className="mx-auto flex min-h-dvh w-full max-w-[72rem] flex-col px-4 pb-8 sm:px-8"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 [border-block-end:1px_solid_var(--color-line)] bg-surface-0 py-5">
          <h2 className="font-ui text-20 font-medium text-ink">
            <Text path={initialData?.id ? 'library.lineups.edit' : 'library.lineups.create'} />
          </h2>
          <button
            type="button"
            onClick={handleExit}
            aria-label={t('library.lineups.form.back')}
            className="flex items-center gap-2 rounded-chip px-2 py-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="size-4" />
            <Text path="library.lineups.form.back" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex w-full max-w-[48rem] flex-1 flex-col gap-5 py-6 text-13">
          {error && (
            <div
              ref={errorRef}
              role="alert"
              className="flex items-center gap-2 rounded-card border border-red-500/40 bg-red-500/10 p-3 text-12 text-ink"
            >
              <AlertCircle className="size-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <LineupBasicFields
            values={values}
            updateValue={updateValue}
            updateMap={updateMap}
            toggleMovementKey={toggleMovementKey}
          />

          <LineupPhotosField
            photos={photos}
            setPhotos={setPhotos}
            errorSection={errorSection}
            newImageUrl={newImageUrl}
            setNewImageUrl={setNewImageUrl}
            photosRef={photosRef}
            fileInputRef={fileInputRef}
            isDraggingFiles={isDraggingFiles}
            setIsDraggingFiles={setIsDraggingFiles}
            handleImages={(files) => void handleImages(files)}
            handleManualUploadClick={handleManualUploadClick}
            setPreviewEnlargedUrl={setPreviewEnlargedUrl}
            previewUrlsRef={previewUrlsRef}
            setError={setError}
          />

          <LineupMetadata
            values={values}
            hasError={errorSection === 'coordinates' || errorSection === 'metadata'}
            hasDemoCommand={Boolean(initialData?.command)}
            updateValue={updateValue}
            updateLandingCoord={updateLandingCoord}
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 [border-block-start:1px_solid_var(--color-line)] bg-surface-0 py-3">
          {error ? (
            <div
              role="alert"
              className="flex items-center gap-1.5 text-11 font-medium text-red-400"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleExit} className="px-3 text-12">
              <Text path="library.lineups.form.cancel" />
            </Button>
            <Button render={<button type="submit" />} disabled={saving} className="px-4">
              <Text path="library.lineups.form.save" />
            </Button>
          </div>
        </div>
      </form>

      <EnlargedPhotoDialog url={previewEnlargedUrl} onDismiss={() => setPreviewEnlargedUrl(null)} />

      {exitGuard.isAsking && (
        <LineupConfirmDialog
          message={t('library.lineups.form.discardConfirm')}
          confirmLabel={t('library.lineups.confirm.discard')}
          cancelLabel={t('library.lineups.confirm.keepEditing')}
          isDestructive
          onConfirm={exitGuard.discard}
          onCancel={exitGuard.keepEditing}
        />
      )}

      <CatboxNoticeDialog
        isOpen={showCatboxModal}
        dontRemind={dontRemindCatbox}
        onDontRemindChange={setDontRemindCatbox}
        onDismiss={() => setShowCatboxModal(false)}
        onProceed={confirmManualUpload}
      />
    </section>,
    document.body,
  );
}
