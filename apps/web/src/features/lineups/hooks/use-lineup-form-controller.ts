import type { Lineup, MovementKey } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { useEffect, useRef, useState } from 'react';
import { buildLineupFromForm } from '../helpers/build-lineup-from-form';
import {
  autoDetectCallout,
  basicValidationKey,
  initFormValues,
  type LineupFormData,
  type LineupFormValues,
} from '../helpers/lineup-form-model';
import { persistLineup, storePreparedPhotos } from '../helpers/persist-lineup';
import { prepareLineupImage, submitImageToCatbox } from '../helpers/prepare-image';
import type { PreparedImage } from '../helpers/prepared-image';
import { useLineupFormExitGuard } from './use-lineup-form-exit-guard';

function withLocalPhotos(
  values: LineupFormValues,
  refs: readonly string[],
  images: readonly PreparedImage[],
): LineupFormValues {
  const imageUrls = [...values.imageUrls];
  const imageCaptions = [...values.imageCaptions];
  refs.forEach((ref, index) => {
    if (imageUrls.includes(ref)) return;
    imageUrls.push(ref);
    imageCaptions.push(images[index]?.caption ?? '');
  });
  return { ...values, imageUrls, imageCaptions };
}

export function useLineupFormController({
  isOpen,
  initialData,
  defaultMap,
  onSaved,
  onDismiss,
}: {
  readonly isOpen: boolean;
  readonly initialData?: LineupFormData | null | undefined;
  readonly defaultMap: string;
  readonly onSaved?: ((lineup: Lineup) => void) | undefined;
  readonly onDismiss: () => void;
}) {
  const t = useT();
  const [values, setValues] = useState<LineupFormValues>(() =>
    initFormValues(initialData, defaultMap),
  );
  const [error, setError] = useState<string | null>(null);
  const [errorSection, setErrorSection] = useState<
    'title' | 'photos' | 'coordinates' | 'media' | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [preparedImages, setPreparedImages] = useState<readonly PreparedImage[]>([]);
  const [previewEnlargedUrl, setPreviewEnlargedUrl] = useState<string | null>(null);
  const [showCatboxModal, setShowCatboxModal] = useState(false);
  const [pendingCatboxImage, setPendingCatboxImage] = useState<PreparedImage | null>(null);
  const [dontRemindCatbox, setDontRemindCatbox] = useState(false);
  const previewUrlsRef = useRef(new Set<string>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef<HTMLDivElement>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
      previewUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = 'hidden';
    return () => {
      if (appRoot) appRoot.inert = wasInert;
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleManualUploadClick = (image: PreparedImage) => {
    let isDismissed = false;
    try {
      isDismissed = localStorage.getItem('disa.lineup_catbox_notice_dismissed') === 'true';
    } catch {}
    if (isDismissed) {
      try {
        submitImageToCatbox(image.file);
      } catch {
        window.open('https://catbox.moe/', '_blank');
      }
    } else {
      setPendingCatboxImage(image);
      setDontRemindCatbox(false);
      setShowCatboxModal(true);
    }
  };

  const confirmManualUpload = () => {
    if (dontRemindCatbox) {
      try {
        localStorage.setItem('disa.lineup_catbox_notice_dismissed', 'true');
      } catch {}
    }
    if (pendingCatboxImage) {
      try {
        submitImageToCatbox(pendingCatboxImage.file);
      } catch {
        window.open('https://catbox.moe/', '_blank');
      }
    }
    setShowCatboxModal(false);
    setPendingCatboxImage(null);
  };

  const updateValue = <K extends keyof LineupFormValues>(key: K, val: LineupFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const updateMap = (val?: string | null) => {
    const newMap = val ?? defaultMap;
    setValues((prev) => {
      const suggested = autoDetectCallout(newMap, prev.landingX, prev.landingY);
      return {
        ...prev,
        map: newMap,
        targetCallout: suggested ?? prev.targetCallout,
      };
    });
  };

  const updateLandingCoord = (axis: 'landingX' | 'landingY' | 'landingZ', val: string) => {
    setValues((prev) => {
      const next = { ...prev, [axis]: val };
      if (prev.targetCallout || axis === 'landingZ') return next;
      const detected = autoDetectCallout(next.map, next.landingX, next.landingY);
      return detected ? { ...next, targetCallout: detected } : next;
    });
  };

  const toggleMovementKey = (key: MovementKey) => {
    setValues((prev) => ({
      ...prev,
      movementKeys: prev.movementKeys.includes(key)
        ? prev.movementKeys.filter((k) => k !== key)
        : [...prev.movementKeys, key],
    }));
  };

  const handleImages = async (files: readonly File[]) => {
    if (files.length === 0) return;
    try {
      const prepared = await Promise.all(files.map(prepareLineupImage));
      const images = prepared.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      }));
      for (const image of images) previewUrlsRef.current.add(image.previewUrl);
      setPreparedImages((previous) => [...previous, ...images]);
      setError(null);
    } catch {
      setError(t('library.lineups.form.validation.imageProcessingFailed'));
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationKey = basicValidationKey(values);
    if (validationKey !== null) {
      setError(t(validationKey));
      setErrorSection(validationKey.includes('title') ? 'title' : 'media');
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (newImageUrl.trim()) {
      setError(t('library.lineups.form.validation.imageLinkPending'));
      setErrorSection('photos');
      requestAnimationFrame(() => {
        photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    setSaving(true);
    const localRefs = await storePreparedPhotos(preparedImages);
    if (localRefs === null) {
      setSaving(false);
      setError(t('library.lineups.form.validation.saveFailed'));
      return;
    }

    const lineup = buildLineupFromForm(
      withLocalPhotos(values, localRefs, preparedImages),
      initialData?.id,
      initialData?.createdAt,
      values.fromDemo,
    );
    if (!lineup) {
      setSaving(false);
      setError(t('library.lineups.form.validation.coordinatesRequired'));
      setErrorSection('coordinates');
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    const saved = await persistLineup(lineup);
    setSaving(false);
    if (!saved) {
      setError(t('library.lineups.form.validation.saveFailed'));
      return;
    }
    onSaved?.(lineup);
    onDismiss();
  };

  const initialValues = initFormValues(initialData, defaultMap);
  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialValues) ||
    preparedImages.length > 0 ||
    newImageUrl.trim().length > 0;
  const handleExit = useLineupFormExitGuard({ isOpen, isDirty, onDismiss });

  return {
    values,
    setValues,
    error,
    setError,
    errorSection,
    saving,
    setSaving,
    newImageUrl,
    setNewImageUrl,
    preparedImages,
    setPreparedImages,
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
  };
}
