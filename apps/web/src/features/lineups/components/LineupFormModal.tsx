import {
  type Lineup,
  type LineupMouseButton,
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
import {
  Button,
  Dialog,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@disa/ui';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  GripVertical,
  Maximize2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { prepareLineupImage, submitImageToCatbox } from '../helpers/prepare-image';
import { loadTurnstile, uploadLineupImage, uploadSiteKey } from '../helpers/upload-image';

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
  readonly caption: string;
}

function moved<T>(items: readonly T[], from: number, to: number): readonly T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const result = [...items];
  const [item] = result.splice(from, 1);
  if (item === undefined) return items;
  result.splice(to, 0, item);
  return result;
}

export function reorderLineupPhotos(
  values: LineupFormValues,
  from: number,
  to: number,
): LineupFormValues {
  return {
    ...values,
    imageUrls: moved(values.imageUrls, from, to),
    imageCaptions: moved(values.imageCaptions, from, to),
  };
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
  readonly mouseButtons?: readonly LineupMouseButton[];
  readonly movementInstructions?: string;
  readonly imageUrls?: readonly string[];
  readonly imageCaptions?: readonly string[];
  readonly command?: string;
  readonly landingCommand?: string;
  readonly fromDemo?: boolean;
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
  readonly mouseButtons: readonly LineupMouseButton[];
  readonly movementInstructions: string;
  readonly imageUrls: readonly string[];
  readonly imageCaptions: readonly string[];
  readonly originX: string;
  readonly originY: string;
  readonly originZ: string;
  readonly landingX: string;
  readonly landingY: string;
  readonly landingZ: string;
  readonly pitch: string;
  readonly yaw: string;
  readonly command: string;
  readonly landingCommand: string;
  readonly fromDemo: boolean;
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

function defaultFormValues(defaultMap: string): LineupFormValues {
  return {
    title: '',
    map: defaultMap,
    side: 'T',
    kind: 'smoke',
    throwType: 'jump',
    movementKeys: ['Jump'],
    mouseButtons: ['left'],
    movementInstructions: '',
    imageUrls: [],
    imageCaptions: [],
    originX: '0',
    originY: '0',
    originZ: '0',
    landingX: '0',
    landingY: '0',
    landingZ: '0',
    pitch: '0',
    yaw: '0',
    command: '',
    landingCommand: '',
    fromDemo: false,
    notes: '',
    mediaUrl: '',
  };
}

function resolveDemoLandingCommand(isFromDemo: boolean, data?: LineupFormData | null): string {
  if (!isFromDemo) return '';
  if (data?.landingCommand) return data.landingCommand;
  if (data?.landing?.z !== undefined) {
    return `setpos ${formatCoord(data.landing.x)} ${formatCoord(data.landing.y)} ${formatCoord(data.landing.z)}`;
  }
  return '';
}

function extractCoords(coord?: { readonly x: number; readonly y: number; readonly z?: number }) {
  return {
    x: formatCoord(coord?.x),
    y: formatCoord(coord?.y),
    z: formatCoord(coord?.z),
  };
}

function captionsOf(data: LineupFormData): readonly string[] {
  return data.imageUrls?.map((_, index) => data.imageCaptions?.[index] ?? '') ?? [];
}

function commandOf(data: LineupFormData, isFromDemo: boolean): string {
  return isFromDemo ? (data.command ?? '') : '';
}

export function initFormValues(
  data?: LineupFormData | null,
  defaultMap = 'de_mirage',
): LineupFormValues {
  if (!data) {
    return defaultFormValues(defaultMap);
  }

  const isFromDemo = Boolean(data.fromDemo || (data.command && data.command.trim().length > 0));
  const origin = extractCoords(data.origin);
  const landing = extractCoords(data.landing);
  const landingCmd = resolveDemoLandingCommand(isFromDemo, data);

  return {
    title: data.title ?? '',
    map: data.map ?? defaultMap,
    side: data.side ?? 'T',
    kind: data.kind ?? 'smoke',
    throwType: data.throwType ?? 'jump',
    movementKeys: data.movementKeys ?? ['Jump'],
    mouseButtons: data.mouseButtons ?? ['left'],
    movementInstructions: data.movementInstructions ?? '',
    imageUrls: data.imageUrls ?? [],
    imageCaptions: captionsOf(data),
    originX: origin.x,
    originY: origin.y,
    originZ: origin.z,
    landingX: landing.x,
    landingY: landing.y,
    landingZ: landing.z,
    pitch: formatCoord(data.pitch),
    yaw: formatCoord(data.yaw),
    command: commandOf(data, isFromDemo),
    landingCommand: landingCmd,
    fromDemo: isFromDemo,
    notes: data.notes ?? '',
    mediaUrl: data.mediaUrl ?? '',
  };
}

interface ParsedCoordinates {
  readonly origin: { readonly x: number; readonly y: number; readonly z: number };
  readonly landing: { readonly x: number; readonly y: number; readonly z: number };
  readonly pitch: number;
  readonly yaw: number;
}

function parseCoordinates(values: LineupFormValues): ParsedCoordinates | null {
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

  return {
    origin: { x: ox, y: oy, z: oz },
    landing: { x: lx, y: ly, z: lz },
    pitch: p,
    yaw: y,
  };
}

function resolveBuildCommands(
  values: LineupFormValues,
  coords: ParsedCoordinates,
  generateCommand: boolean,
): { readonly command: string; readonly landingCommand?: string } {
  if (!values.fromDemo) {
    return { command: '' };
  }
  const cmd = values.command.trim();
  const command =
    cmd ||
    (generateCommand
      ? `setpos ${coords.origin.x.toFixed(2)} ${coords.origin.y.toFixed(2)} ${coords.origin.z.toFixed(2)}; setang ${coords.pitch.toFixed(2)} ${coords.yaw.toFixed(2)} 0`
      : '');

  const landCmd = values.landingCommand.trim();
  const landingCommand =
    landCmd ||
    `setpos ${coords.landing.x.toFixed(2)} ${coords.landing.y.toFixed(2)} ${coords.landing.z.toFixed(2)}`;

  return { command, landingCommand };
}

export function buildLineupFromForm(
  values: LineupFormValues,
  initialId?: string,
  initialCreatedAt?: number,
  generateCommand = true,
): Lineup | null {
  const coords = parseCoordinates(values);
  if (!coords) {
    return null;
  }

  const { command, landingCommand } = resolveBuildCommands(values, coords, generateCommand);
  const movementSummary =
    values.movementKeys.join(' + ') || (values.throwType === 'stand' ? 'Stand' : 'Jump');

  return {
    id: initialId ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: values.title.trim(),
    map: values.map,
    side: values.side,
    kind: values.kind,
    origin: coords.origin,
    landing: coords.landing,
    pitch: coords.pitch,
    yaw: coords.yaw,
    throwType: values.throwType,
    movementKeys: values.movementKeys,
    movementKeysSummary: movementSummary,
    ...(values.mouseButtons.length > 0 ? { mouseButtons: values.mouseButtons } : {}),
    ...(values.movementInstructions.trim()
      ? { movementInstructions: values.movementInstructions.trim() }
      : {}),
    ...(values.imageUrls.length > 0
      ? { imageUrls: values.imageUrls, imageCaptions: values.imageCaptions }
      : {}),
    command,
    ...(landingCommand ? { landingCommand } : {}),
    ...(values.fromDemo ? { fromDemo: true } : {}),
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

function useTurnstileChallenge(enabled: boolean) {
  const [siteKey, setSiteKey] = useState<string | null | undefined>();
  const [challengeToken, setChallengeToken] = useState('');
  const challengeRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setSiteKey(undefined);
    void uploadSiteKey().then((key) => {
      if (active) setSiteKey(key);
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !siteKey || !challengeRef.current) return;
    let active = true;
    let widget: string | null = null;
    void loadTurnstile()
      .then((turnstile) => {
        if (!active || !challengeRef.current) return;
        try {
          widget = turnstile.render(challengeRef.current, {
            sitekey: siteKey,
            callback: setChallengeToken,
            'expired-callback': () => setChallengeToken(''),
            'error-callback': () => {
              setChallengeToken('');
              if (active) setSiteKey(null);
            },
          });
          widgetRef.current = widget;
        } catch {
          if (active) setSiteKey(null);
        }
      })
      .catch(() => {
        if (active) setSiteKey(null);
      });
    return () => {
      active = false;
      if (widget && window.turnstile) {
        try {
          window.turnstile.remove(widget);
        } catch {}
      }
      widgetRef.current = null;
    };
  }, [enabled, siteKey]);

  return { siteKey, challengeToken, challengeRef, widgetRef, setChallengeToken };
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
  const [uploadingUrl, setUploadingUrl] = useState<string | null>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef<HTMLDivElement>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const { siteKey, challengeToken, challengeRef, widgetRef, setChallengeToken } =
    useTurnstileChallenge(isOpen && preparedImages.length > 0);

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

  const handleUpload = async (image: PreparedImage) => {
    if (!challengeToken) return;
    setUploadingUrl(image.previewUrl);
    setChallengeToken('');
    try {
      const url = await uploadLineupImage(image.file, challengeToken);
      setValues((previous) => ({
        ...previous,
        imageUrls: previous.imageUrls.includes(url)
          ? previous.imageUrls
          : [...previous.imageUrls, url],
        imageCaptions: previous.imageUrls.includes(url)
          ? previous.imageCaptions
          : [...previous.imageCaptions, image.caption],
      }));
      URL.revokeObjectURL(image.previewUrl);
      previewUrlsRef.current.delete(image.previewUrl);
      setPreparedImages((previous) =>
        previous.filter((item) => item.previewUrl !== image.previewUrl),
      );
      setError(null);
    } catch {
      setError(t('library.lineups.form.validation.uploadFailed'));
    } finally {
      setUploadingUrl(null);
      if (widgetRef.current && window.turnstile) window.turnstile.reset(widgetRef.current);
    }
  };

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
    if (preparedImages.length > 0) {
      setError(t('library.lineups.form.validation.imageLinksRequired'));
      setErrorSection('photos');
      requestAnimationFrame(() => {
        photosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    const lineup = buildLineupFromForm(
      values,
      initialData?.id,
      initialData?.createdAt,
      values.fromDemo,
    );
    if (!lineup) {
      setError(t('library.lineups.form.validation.coordinatesRequired'));
      setErrorSection('coordinates');
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
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

  const initialValues = initFormValues(initialData, defaultMap);
  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialValues) ||
    preparedImages.length > 0 ||
    newImageUrl.trim().length > 0;
  useEffect(() => {
    if (!isOpen || !isDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isOpen, isDirty]);
  const handleExit = () => {
    if (!isDirty || window.confirm(t('library.lineups.form.discardConfirm'))) onDismiss();
  };

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
      className="fixed inset-0 z-100 overflow-y-auto bg-surface-0"
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

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lineup-title" className="label-dense text-ink-dim">
              <Text path="library.lineups.form.title" /> *
            </label>
            <Input
              id="lineup-title"
              type="text"
              required
              value={values.title}
              onChange={(e) => updateValue('title', e.target.value)}
              placeholder={t('library.lineups.form.titlePlaceholder')}
            />
          </div>

          {/* Map, Side, Kind */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lineup-map" className="label-dense text-ink-dim">
                <Text path="library.lineups.form.map" />
              </label>
              <Select
                value={values.map}
                onValueChange={(val) => updateValue('map', val ?? defaultMap)}
              >
                <SelectTrigger id="lineup-map" className="h-8 bg-surface-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAP_IDS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                value={values.kind}
                onValueChange={(val) => updateValue('kind', (val ?? 'smoke') as UtilityKind)}
              >
                <SelectTrigger id="lineup-kind" className="h-8 bg-surface-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THROWN_UTILITY_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {UTILITY_NAMES[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <fieldset className="flex flex-col gap-1.5 border-0 p-0">
              <legend className="label-dense text-ink-dim">
                <Text path="library.lineups.form.mouseButtons" />
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {(['left', 'right'] as const).map((button) => (
                  <button
                    key={button}
                    type="button"
                    aria-pressed={values.mouseButtons.includes(button)}
                    onClick={() =>
                      updateValue(
                        'mouseButtons',
                        values.mouseButtons.includes(button)
                          ? values.mouseButtons.filter((item) => item !== button)
                          : [...values.mouseButtons, button],
                      )
                    }
                    className={`rounded-chip border px-3 py-1.5 text-11 ${
                      values.mouseButtons.includes(button)
                        ? 'border-line bg-surface-3 text-ink'
                        : 'border-transparent bg-surface-1 text-ink-dim hover:text-ink'
                    }`}
                  >
                    <Text path={`library.lineups.form.mouse.${button}`} />
                  </button>
                ))}
              </div>
            </fieldset>
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

          <div
            ref={photosRef}
            className={`flex flex-col gap-2 rounded-card p-2 transition-colors ${
              errorSection === 'photos' ? 'border border-red-500/40 bg-red-500/5' : ''
            }`}
          >
            <label htmlFor="lineup-image-url" className="label-dense text-ink-dim">
              <Text path="library.lineups.form.imageUrls" />
            </label>
            {errorSection === 'photos' && (
              <div
                role="alert"
                className="flex items-center gap-1.5 rounded-card border border-red-500/40 bg-red-500/10 p-2 text-11 text-red-300"
              >
                <AlertCircle className="size-4 shrink-0 text-red-400" />
                <Text path="library.lineups.form.validation.photosPendingHelp" />
              </div>
            )}
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
                  Array.from(event.dataTransfer.files).filter((file) =>
                    file.type.startsWith('image/'),
                  ),
                );
              }}
              className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-card border border-dashed p-4 text-center ${isDraggingFiles ? 'border-ink bg-surface-2' : 'border-line bg-surface-1'}`}
            >
              <p className="text-12 text-ink-dim">
                <Text path="library.lineups.form.dropPhotos" />
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Text path="library.lineups.form.choosePhotos" />
              </Button>
            </fieldset>
            <PreparedImagesList
              images={preparedImages}
              siteKey={siteKey}
              challengeToken={challengeToken}
              uploadingUrl={uploadingUrl}
              onPreviewEnlarged={setPreviewEnlargedUrl}
              onUpload={(image) => void handleUpload(image)}
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
            {preparedImages.length > 0 && siteKey && <div ref={challengeRef} />}
            {preparedImages.length > 0 && siteKey === null && (
              <p className="text-11 text-ink-dim leading-prose">
                <Text path="library.lineups.form.uploadUnavailable" />
              </p>
            )}
            <AddedImagesList
              urls={values.imageUrls}
              captions={values.imageCaptions}
              onPreviewEnlarged={setPreviewEnlargedUrl}
              onReorder={(from, to) =>
                setValues((current) => reorderLineupPhotos(current, from, to))
              }
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

              {/* Console Command (Only for demo-derived lineups) */}
              {values.fromDemo && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="lineup-command" className="label-dense text-ink-dim">
                      <Text path="library.lineups.form.command" />
                    </label>
                    <Input
                      id="lineup-command"
                      type="text"
                      value={values.command}
                      onChange={(e) => updateValue('command', e.target.value)}
                      placeholder="setpos ...; setang ..."
                      className="font-mono text-11"
                    />
                  </div>
                  {values.landingCommand && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="lineup-landing-command" className="label-dense text-ink-dim">
                        <Text path="library.lineups.commandLanding" />
                      </label>
                      <Input
                        id="lineup-landing-command"
                        type="text"
                        value={values.landingCommand}
                        onChange={(e) => updateValue('landingCommand', e.target.value)}
                        placeholder="setpos ..."
                        className="font-mono text-11"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </details>
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
            <Button type="button" variant="ghost" onClick={handleExit} className="h-8 px-3 text-12">
              <Text path="library.lineups.form.cancel" />
            </Button>
            <Button render={<button type="submit" />} disabled={saving} className="h-8 px-4">
              <Text path="library.lineups.form.save" />
            </Button>
          </div>
        </div>
      </form>

      <EnlargedPhotoDialog url={previewEnlargedUrl} onDismiss={() => setPreviewEnlargedUrl(null)} />

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

interface PreparedImagesListProps {
  readonly images: readonly PreparedImage[];
  readonly siteKey: string | null | undefined;
  readonly challengeToken: string;
  readonly uploadingUrl: string | null;
  readonly onPreviewEnlarged: (url: string) => void;
  readonly onUpload: (image: PreparedImage) => void;
  readonly onManualUpload: (image: PreparedImage) => void;
  readonly onReorder: (from: number, to: number) => void;
  readonly onRemove: (index: number) => void;
  readonly onCaptionChange: (index: number, caption: string) => void;
}

function PreparedImagesList({
  images,
  siteKey,
  challengeToken,
  uploadingUrl,
  onPreviewEnlarged,
  onUpload,
  onManualUpload,
  onReorder,
  onRemove,
  onCaptionChange,
}: PreparedImagesListProps) {
  const t = useT();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {images.map((image, index) => (
        <li
          key={image.previewUrl}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', `prepared:${index}`);
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
          <button
            type="button"
            onClick={() => onPreviewEnlarged(image.previewUrl)}
            title={t('library.lineups.form.viewPhoto')}
            aria-label={t('library.lineups.form.viewPhoto')}
            className="group relative size-10 shrink-0 cursor-zoom-in overflow-hidden rounded-chip"
          >
            <img src={image.previewUrl} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="size-3.5" />
            </span>
          </button>
          <span className="min-w-0 flex-1 truncate text-11 text-ink-dim">
            {image.file.name} · {Math.round(image.file.size / 1024)} KB
          </span>
          {siteKey && (
            <button
              type="button"
              disabled={!challengeToken || uploadingUrl !== null}
              onClick={() => onUpload(image)}
              className="rounded-chip border border-line bg-surface-2 px-2 py-1 text-11 text-ink disabled:opacity-50"
            >
              <Text
                path={
                  uploadingUrl === image.previewUrl
                    ? 'library.lineups.form.uploading'
                    : 'library.lineups.form.uploadImage'
                }
              />
            </button>
          )}
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
            disabled={index === images.length - 1}
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
            className="p-1 text-ink-dim hover:text-ink"
          >
            <X className="size-4" />
          </button>
          <input
            type="text"
            value={image.caption}
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

interface AddedImagesListProps {
  readonly urls: readonly string[];
  readonly captions: readonly string[];
  readonly onPreviewEnlarged: (url: string) => void;
  readonly onReorder: (from: number, to: number) => void;
  readonly onRemove: (index: number) => void;
  readonly onCaptionChange: (index: number, caption: string) => void;
}

function AddedImagesList({
  urls,
  captions,
  onPreviewEnlarged,
  onReorder,
  onRemove,
  onCaptionChange,
}: AddedImagesListProps) {
  const t = useT();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {urls.map((url, index) => (
        <li
          key={url}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', `url:${index}`);
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
          <button
            type="button"
            onClick={() => onPreviewEnlarged(url)}
            title={t('library.lineups.form.viewPhoto')}
            aria-label={t('library.lineups.form.viewPhoto')}
            className="group relative size-10 shrink-0 cursor-zoom-in overflow-hidden rounded-chip"
          >
            <img src={url} alt="" loading="lazy" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="size-3.5" />
            </span>
          </button>
          <span className="min-w-0 flex-1 truncate text-11 text-ink-dim">{url}</span>
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
            disabled={index === urls.length - 1}
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
            value={captions[index] ?? ''}
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

function EnlargedPhotoDialog({
  url,
  onDismiss,
}: {
  readonly url: string | null;
  readonly onDismiss: () => void;
}) {
  const t = useT();
  return (
    <Dialog
      isOpen={url !== null}
      onDismiss={onDismiss}
      aria-label={t('library.lineups.form.viewPhoto')}
      className="max-h-[92dvh] max-w-[92dvw] p-2"
    >
      <div className="relative flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('library.lineups.form.closePhoto')}
          className="absolute top-2 right-2 z-10 rounded-chip bg-surface-0/80 p-1.5 text-ink hover:bg-surface-2"
        >
          <X className="size-5" />
        </button>
        {url && (
          <img
            src={url}
            alt=""
            className="max-h-[85dvh] max-w-[85dvw] rounded-chip object-contain"
          />
        )}
      </div>
    </Dialog>
  );
}

function CatboxNoticeDialog({
  isOpen,
  dontRemind,
  onDontRemindChange,
  onDismiss,
  onProceed,
}: {
  readonly isOpen: boolean;
  readonly dontRemind: boolean;
  readonly onDontRemindChange: (checked: boolean) => void;
  readonly onDismiss: () => void;
  readonly onProceed: () => void;
}) {
  const t = useT();
  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={onDismiss}
      aria-label={t('library.lineups.form.catboxModal.title')}
      className="flex max-w-md flex-col gap-4 p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-ui text-16 font-medium text-ink">
          <Text path="library.lineups.form.catboxModal.title" />
        </h3>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('library.lineups.form.close')}
          className="rounded-chip p-1 text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-12 text-ink-dim leading-relaxed">
        <Text path="library.lineups.form.catboxModal.description" />
      </p>
      <label className="flex cursor-pointer items-center gap-2 text-12 text-ink">
        <input
          type="checkbox"
          checked={dontRemind}
          onChange={(e) => onDontRemindChange(e.target.checked)}
          className="size-4 rounded-chip border-line bg-surface-2"
        />
        <Text path="library.lineups.form.catboxModal.dontShowAgain" />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDismiss} className="h-8 px-3 text-12">
          <Text path="library.lineups.form.cancel" />
        </Button>
        <Button type="button" onClick={onProceed} className="h-8 px-4 text-12">
          <Text path="library.lineups.form.catboxModal.proceed" />
        </Button>
      </div>
    </Dialog>
  );
}
