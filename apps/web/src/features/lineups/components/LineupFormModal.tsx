import {
  type Lineup,
  type LineupSide,
  type MovementKey,
  THROWN_UTILITY_KINDS,
  type ThrowType,
  UTILITY_NAMES,
  type UtilityKind,
} from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { MAP_IDS } from '@disa/map-data';
import { Button, Dialog } from '@disa/ui';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { prepareLineupImage, submitImageToCatbox } from '../helpers/prepare-image';

const ALL_MOVEMENT_KEYS: readonly MovementKey[] = [
  'W',
  'A',
  'S',
  'D',
  'Shift',
  'Ctrl',
  'Jump',
  'Stand',
];

const ALL_THROW_TYPES: readonly ThrowType[] = ['stand', 'jump', 'run', 'crouch', 'unknown'];

interface PreparedImage {
  readonly file: File;
  readonly previewUrl: string;
}

export interface LineupFormData {
  readonly id?: string;
  readonly title?: string;
  readonly map?: string;
  readonly side?: LineupSide;
  readonly kind?: UtilityKind;
  readonly origin?: { readonly x: number; readonly y: number; readonly z?: number };
  readonly landing?: { readonly x: number; readonly y: number; readonly z?: number };
  readonly pitch?: number;
  readonly yaw?: number;
  readonly throwType?: ThrowType;
  readonly movementKeys?: readonly MovementKey[];
  readonly movementInstructions?: string;
  readonly imageUrls?: readonly string[];
  readonly command?: string;
  readonly notes?: string;
  readonly mediaUrl?: string;
  readonly createdAt?: number;
}

export interface LineupFormValues {
  readonly title: string;
  readonly map: string;
  readonly side: LineupSide;
  readonly kind: UtilityKind;
  readonly throwType: ThrowType;
  readonly movementKeys: readonly MovementKey[];
  readonly movementInstructions: string;
  readonly imageUrls: readonly string[];
  readonly originX: string;
  readonly originY: string;
  readonly originZ: string;
  readonly landingX: string;
  readonly landingY: string;
  readonly landingZ: string;
  readonly pitch: string;
  readonly yaw: string;
  readonly command: string;
  readonly notes: string;
  readonly mediaUrl: string;
}

function formatCoord(val?: number): string {
  return val !== undefined ? val.toFixed(2) : '0';
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function hasInvalidMediaUrl(values: LineupFormValues): boolean {
  return (
    (values.mediaUrl.trim().length > 0 && !isHttpUrl(values.mediaUrl.trim())) ||
    values.imageUrls.some((url) => !isHttpUrl(url))
  );
}

function basicValidationKey(
  values: LineupFormValues,
):
  | 'library.lineups.form.validation.titleRequired'
  | 'library.lineups.form.validation.mediaUrlInvalid'
  | null {
  if (!values.title.trim()) return 'library.lineups.form.validation.titleRequired';
  if (hasInvalidMediaUrl(values)) return 'library.lineups.form.validation.mediaUrlInvalid';
  return null;
}

export function initFormValues(
  data?: LineupFormData | null,
  defaultMap = 'de_mirage',
): LineupFormValues {
  if (!data) {
    return {
      title: '',
      map: defaultMap,
      side: 'T',
      kind: 'smoke',
      throwType: 'jump',
      movementKeys: ['Jump'],
      movementInstructions: '',
      imageUrls: [],
      originX: '0',
      originY: '0',
      originZ: '0',
      landingX: '0',
      landingY: '0',
      landingZ: '0',
      pitch: '0',
      yaw: '0',
      command: '',
      notes: '',
      mediaUrl: '',
    };
  }

  const origin = data.origin;
  const landing = data.landing;
  return {
    title: data.title ?? '',
    map: data.map ?? defaultMap,
    side: data.side ?? 'T',
    kind: data.kind ?? 'smoke',
    throwType: data.throwType ?? 'jump',
    movementKeys: data.movementKeys ?? ['Jump'],
    movementInstructions: data.movementInstructions ?? '',
    imageUrls: data.imageUrls ?? [],
    originX: formatCoord(origin?.x),
    originY: formatCoord(origin?.y),
    originZ: formatCoord(origin?.z),
    landingX: formatCoord(landing?.x),
    landingY: formatCoord(landing?.y),
    landingZ: formatCoord(landing?.z),
    pitch: formatCoord(data.pitch),
    yaw: formatCoord(data.yaw),
    command: data.command ?? '',
    notes: data.notes ?? '',
    mediaUrl: data.mediaUrl ?? '',
  };
}

export function buildLineupFromForm(
  values: LineupFormValues,
  initialId?: string,
  initialCreatedAt?: number,
  generateCommand = true,
): Lineup | null {
  const ox = Number.parseFloat(values.originX);
  const oy = Number.parseFloat(values.originY);
  const oz = Number.parseFloat(values.originZ);
  const lx = Number.parseFloat(values.landingX);
  const ly = Number.parseFloat(values.landingY);
  const lz = Number.parseFloat(values.landingZ);
  const p = Number.parseFloat(values.pitch);
  const y = Number.parseFloat(values.yaw);

  if (
    !Number.isFinite(ox) ||
    !Number.isFinite(oy) ||
    !Number.isFinite(lx) ||
    !Number.isFinite(ly)
  ) {
    return null;
  }

  const command =
    values.command.trim() ||
    (generateCommand
      ? `setpos ${ox.toFixed(2)} ${oy.toFixed(2)} ${oz.toFixed(2)}; setang ${p.toFixed(2)} ${y.toFixed(2)} 0`
      : '');

  return {
    id: initialId ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: values.title.trim(),
    map: values.map,
    side: values.side,
    kind: values.kind,
    origin: { x: ox, y: oy, z: oz },
    landing: { x: lx, y: ly, z: lz },
    pitch: p,
    yaw: y,
    throwType: values.throwType,
    movementKeys: values.movementKeys,
    movementKeysSummary:
      values.movementKeys.join(' + ') || (values.throwType === 'stand' ? 'Stand' : 'Jump'),
    ...(values.movementInstructions.trim()
      ? { movementInstructions: values.movementInstructions.trim() }
      : {}),
    ...(values.imageUrls.length > 0 ? { imageUrls: values.imageUrls } : {}),
    command,
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
    ...(values.mediaUrl.trim() ? { mediaUrl: values.mediaUrl.trim() } : {}),
    isBuiltIn: false,
    createdAt: initialCreatedAt ?? Date.now(),
  };
}

async function persistLineup(lineup: Lineup): Promise<boolean> {
  try {
    const store = await openLineupStore();
    if (store === null) return false;
    try {
      await store.put(lineup);
      return true;
    } finally {
      store.close();
    }
  } catch {
    return false;
  }
}

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

  const [values, setValues] = useState<LineupFormValues>(() =>
    initFormValues(initialData, defaultMap),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [preparedImages, setPreparedImages] = useState<readonly PreparedImage[]>([]);
  const [isUploadConfirmed, setUploadConfirmed] = useState(false);
  const previewUrlsRef = useRef(new Set<string>());

  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
      previewUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    setValues(initFormValues(initialData, defaultMap));
    setError(null);
    setNewImageUrl('');
    setPreparedImages([]);
    setUploadConfirmed(false);
  }, [isOpen, initialData, defaultMap]);

  const updateValue = <K extends keyof LineupFormValues>(key: K, val: LineupFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const toggleMovementKey = (key: MovementKey) => {
    setValues((prev) => ({
      ...prev,
      movementKeys: prev.movementKeys.includes(key)
        ? prev.movementKeys.filter((k) => k !== key)
        : [...prev.movementKeys, key],
    }));
  };

  const handleImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    try {
      const prepared = await Promise.all(files.map(prepareLineupImage));
      const images = prepared.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
      for (const image of images) previewUrlsRef.current.add(image.previewUrl);
      setPreparedImages((previous) => [...previous, ...images]);
      setUploadConfirmed(false);
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
      return;
    }
    if (preparedImages.length > 0 && !isUploadConfirmed) {
      setUploadConfirmed(true);
      setError(null);
      return;
    }
    if (preparedImages.length > 0) {
      setError(t('library.lineups.form.validation.imageLinksRequired'));
      return;
    }
    if (newImageUrl.trim()) {
      setError(t('library.lineups.form.validation.imageLinkPending'));
      return;
    }

    const lineup = buildLineupFromForm(
      values,
      initialData?.id,
      initialData?.createdAt,
      initialData?.command !== undefined,
    );
    if (!lineup) {
      setError(t('library.lineups.form.validation.coordinatesRequired'));
      return;
    }

    setSaving(true);
    const saved = await persistLineup(lineup);
    setSaving(false);
    if (!saved) {
      setError(t('library.lineups.form.validation.saveFailed'));
      return;
    }
    onSaved?.(lineup);
    onDismiss();
  };

  return (
    <Dialog isOpen={isOpen} onDismiss={onDismiss} className="w-full max-w-[36rem] overflow-hidden">
      <form noValidate onSubmit={handleSave} className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-ui text-16 font-medium text-ink">
            <Text path={initialData?.id ? 'library.lineups.edit' : 'library.lineups.create'} />
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('library.lineups.form.close')}
            className="rounded-chip p-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-5 py-4 text-13">
          {error && (
            <div
              role="alert"
              className="rounded-card border border-line bg-surface-2 p-2.5 text-12 text-ink"
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lineup-title" className="label-dense text-ink-dim">
              <Text path="library.lineups.form.title" /> *
            </label>
            <input
              id="lineup-title"
              type="text"
              required
              value={values.title}
              onChange={(e) => updateValue('title', e.target.value)}
              placeholder={t('library.lineups.form.titlePlaceholder')}
              className="h-8 rounded-card border border-line bg-surface-1 px-3 text-13 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
            />
          </div>

          {/* Map, Side, Kind */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lineup-map" className="label-dense text-ink-dim">
                <Text path="library.lineups.form.map" />
              </label>
              <select
                id="lineup-map"
                value={values.map}
                onChange={(e) => updateValue('map', e.target.value)}
                className="h-8 rounded-card border border-line bg-surface-1 px-2.5 text-13 text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
              >
                {MAP_IDS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label-dense text-ink-dim">
                <Text path="library.lineups.form.side" />
              </span>
              <div className="flex h-8 items-center rounded-card border border-line bg-surface-1 p-0.5">
                {(['CT', 'T', 'BOTH'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateValue('side', s)}
                    className={`flex-1 rounded-chip py-1 text-center font-mono text-11 font-medium transition-colors ${
                      values.side === s ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'
                    }`}
                  >
                    {s === 'BOTH' ? <Text path="library.lineups.bothSides" /> : s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lineup-kind" className="label-dense text-ink-dim">
                <Text path="library.lineups.form.kind" />
              </label>
              <select
                id="lineup-kind"
                value={values.kind}
                onChange={(e) => updateValue('kind', e.target.value as UtilityKind)}
                className="h-8 rounded-card border border-line bg-surface-1 px-2.5 text-13 text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
              >
                {THROWN_UTILITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {UTILITY_NAMES[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Throw type & Movement keys */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1.5">
              <span className="label-dense text-ink-dim">
                <Text path="library.lineups.form.throwType" />
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {ALL_THROW_TYPES.map((tt) => (
                  <button
                    key={tt}
                    type="button"
                    onClick={() => updateValue('throwType', tt)}
                    className={`h-7 rounded-chip border px-2.5 text-11 font-medium transition-colors ${
                      values.throwType === tt
                        ? 'border-line bg-surface-3 text-ink'
                        : 'border-transparent bg-surface-1 text-ink-dim hover:text-ink'
                    }`}
                  >
                    <Text path={`review.maps.throw.types.${tt}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="label-dense text-ink-dim">
                <Text path="library.lineups.form.movementKeys" />
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {ALL_MOVEMENT_KEYS.map((k) => {
                  const isSelected = values.movementKeys.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleMovementKey(k)}
                      className={`flex h-7 items-center gap-1 rounded-chip border px-2 font-mono text-11 transition-colors ${
                        isSelected
                          ? 'border-line bg-surface-3 font-medium text-ink'
                          : 'border-transparent bg-surface-1 text-ink-dim hover:bg-surface-2 hover:text-ink'
                      }`}
                    >
                      <span>{k}</span>
                      {isSelected && <span className="text-10 text-ink-dim">×</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lineup-movement-instructions" className="label-dense text-ink-dim">
                <Text path="library.lineups.form.movementInstructions" />
              </label>
              <input
                id="lineup-movement-instructions"
                type="text"
                value={values.movementInstructions}
                onChange={(event) => updateValue('movementInstructions', event.target.value)}
                placeholder={t('library.lineups.form.movementInstructionsPlaceholder')}
                className="h-8 rounded-card border border-line bg-surface-1 px-3 text-12 text-ink placeholder:text-ink-dim"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lineup-notes" className="label-dense text-ink-dim">
              <Text path="library.lineups.form.notes" />
            </label>
            <textarea
              id="lineup-notes"
              rows={2}
              value={values.notes}
              onChange={(e) => updateValue('notes', e.target.value)}
              placeholder={t('library.lineups.form.notesPlaceholder')}
              className="rounded-card border border-line bg-surface-1 p-2.5 text-12 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
            />
          </div>

          {/* Media URL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lineup-media" className="label-dense text-ink-dim">
              <Text path="library.lineups.form.mediaUrl" />
            </label>
            <input
              id="lineup-media"
              type="url"
              value={values.mediaUrl}
              onChange={(e) => updateValue('mediaUrl', e.target.value)}
              placeholder="https://..."
              className="h-8 rounded-card border border-line bg-surface-1 px-3 text-12 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="lineup-image-url" className="label-dense text-ink-dim">
              <Text path="library.lineups.form.imageUrls" />
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => void handleImages(event)}
              className="text-11 text-ink-dim file:mr-3 file:rounded-chip file:border file:border-line file:bg-surface-2 file:px-2 file:py-1 file:text-ink"
            />
            {preparedImages.map(({ file, previewUrl }, index) => (
              <div
                key={previewUrl}
                className="flex items-center gap-2 rounded-card border border-line bg-surface-1 p-2"
              >
                <img
                  src={previewUrl}
                  alt=""
                  className="size-10 shrink-0 rounded-chip object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-11 text-ink-dim">
                  {file.name} · {Math.round(file.size / 1024)} KB
                </span>
                {isUploadConfirmed && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        submitImageToCatbox(file);
                      } catch {
                        setError(t('library.lineups.form.validation.uploadFailed'));
                      }
                    }}
                    className="rounded-chip border border-line bg-surface-2 px-2 py-1 text-11 text-ink"
                  >
                    <Text path="library.lineups.form.uploadImage" />
                  </button>
                )}
                {isUploadConfirmed && (
                  <a
                    href={previewUrl}
                    download={file.name}
                    className="rounded-chip border border-line bg-surface-2 px-2 py-1 text-11 text-ink"
                  >
                    <Text path="library.lineups.form.downloadWebp" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(previewUrl);
                    previewUrlsRef.current.delete(previewUrl);
                    setPreparedImages((previous) => previous.filter((_, at) => at !== index));
                  }}
                  aria-label={t('library.lineups.form.removeImage')}
                  className="p-1 text-ink-dim hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {preparedImages.length > 0 && isUploadConfirmed && (
              <p className="text-11 text-ink-dim leading-prose">
                <Text path="library.lineups.form.catboxCopyLink" />
              </p>
            )}
            {Array.from(new Set(values.imageUrls)).map((url) => (
              <div
                key={url}
                className="flex items-center gap-2 rounded-card border border-line bg-surface-1 p-2"
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="size-10 shrink-0 rounded-chip object-cover"
                />
                <span className="min-w-0 flex-1 truncate text-11 text-ink-dim">{url}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateValue(
                      'imageUrls',
                      values.imageUrls.filter((item) => item !== url),
                    )
                  }
                  aria-label={t('library.lineups.form.removeImage')}
                  className="rounded-chip p-1 text-ink-dim hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
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
                  if (!values.imageUrls.includes(url))
                    updateValue('imageUrls', [...values.imageUrls, url]);
                  const firstPrepared = preparedImages[0];
                  if (firstPrepared !== undefined) {
                    URL.revokeObjectURL(firstPrepared.previewUrl);
                    previewUrlsRef.current.delete(firstPrepared.previewUrl);
                    setPreparedImages((previous) => previous.slice(1));
                  }
                  setNewImageUrl('');
                  setError(null);
                }}
                className="h-8 px-3 text-12"
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
          <details className="rounded-card border border-line bg-surface-1 p-3">
            <summary className="cursor-pointer label-dense text-ink-dim">
              <Text path="library.lineups.form.technicalDetails" />
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {/* Coordinates: Origin, Landing, Angles */}
              <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-1 p-3">
                {!initialData?.command && (
                  <p className="text-11 text-ink-dim leading-prose">
                    <Text path="library.lineups.form.mapCoordinatesNote" />
                  </p>
                )}
                <span className="label-dense text-11 text-ink-dim">
                  <Text path="library.lineups.form.origin" />
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={values.originX}
                    onChange={(e) => updateValue('originX', e.target.value)}
                    placeholder="X"
                    className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                  />
                  <input
                    type="text"
                    value={values.originY}
                    onChange={(e) => updateValue('originY', e.target.value)}
                    placeholder="Y"
                    className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                  />
                  <input
                    type="text"
                    value={values.originZ}
                    onChange={(e) => updateValue('originZ', e.target.value)}
                    placeholder="Z"
                    className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                  />
                </div>

                <span className="label-dense text-11 text-ink-dim mt-1">
                  <Text path="library.lineups.form.landing" />
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={values.landingX}
                    onChange={(e) => updateValue('landingX', e.target.value)}
                    placeholder="X"
                    className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                  />
                  <input
                    type="text"
                    value={values.landingY}
                    onChange={(e) => updateValue('landingY', e.target.value)}
                    placeholder="Y"
                    className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                  />
                  <input
                    type="text"
                    value={values.landingZ}
                    onChange={(e) => updateValue('landingZ', e.target.value)}
                    placeholder="Z"
                    className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="label-dense text-10 text-ink-dim">
                      <Text path="library.lineups.form.pitch" />
                    </span>
                    <input
                      type="text"
                      value={values.pitch}
                      onChange={(e) => updateValue('pitch', e.target.value)}
                      placeholder="Pitch"
                      className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="label-dense text-10 text-ink-dim">
                      <Text path="library.lineups.form.yaw" />
                    </span>
                    <input
                      type="text"
                      value={values.yaw}
                      onChange={(e) => updateValue('yaw', e.target.value)}
                      placeholder="Yaw"
                      className="h-7 rounded-chip border border-line bg-surface-2 px-2 font-mono text-11 text-ink"
                    />
                  </div>
                </div>
              </div>

              {/* Console Command */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="lineup-command" className="label-dense text-ink-dim">
                  <Text path="library.lineups.form.command" />
                </label>
                <input
                  id="lineup-command"
                  type="text"
                  value={values.command}
                  onChange={(e) => updateValue('command', e.target.value)}
                  placeholder="setpos ...; setang ..."
                  className="h-8 rounded-card border border-line bg-surface-1 px-3 font-mono text-11 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
                />
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
          <Button type="button" variant="ghost" onClick={onDismiss} className="h-8 px-3 text-12">
            <Text path="library.lineups.form.cancel" />
          </Button>
          <Button render={<button type="submit" />} disabled={saving} className="h-8 px-4">
            <Text
              path={
                preparedImages.length > 0 && !isUploadConfirmed
                  ? 'library.lineups.form.continueToUpload'
                  : 'library.lineups.form.save'
              }
            />
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
