import { type Lineup, type LineupSide, UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';

interface Props {
  readonly lineup: Lineup | null;
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  readonly onEdit?: ((lineup: Lineup) => void) | undefined;
  readonly onDelete?: ((id: string) => void) | undefined;
}

const SIDE_STYLES: Readonly<Record<LineupSide, string>> = {
  CT: 'text-ct border-ct/30 bg-ct/10',
  T: 'text-t border-t/30 bg-t/10',
  BOTH: 'text-ink border-line bg-surface-3',
};

function safeMediaUrl(url: string | undefined): string | null {
  return url && /^https?:\/\/[^\s]+$/i.test(url) ? url : null;
}

function imageUrlOf(url: string | null): string | null {
  return url && /\.(?:png|jpe?g|webp|gif)(?:\?[^\s]*)?$/i.test(url) ? url : null;
}

function LineupDetailHeader({
  lineup,
  onDismiss,
  onEdit,
  onDelete,
}: {
  readonly lineup: Lineup;
  readonly onDismiss: () => void;
  readonly onEdit?: ((lineup: Lineup) => void) | undefined;
  readonly onDelete?: ((id: string) => void) | undefined;
}) {
  const t = useT();

  const handleDelete = () => {
    if (onDelete !== undefined && !lineup.isBuiltIn) {
      if (window.confirm(t('library.lineups.deleteConfirm'))) {
        onDelete(lineup.id);
        onDismiss();
      }
    }
  };

  const handleEdit = () => {
    if (onEdit !== undefined) {
      onEdit(lineup);
      onDismiss();
    }
  };

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface-1 px-5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-ui font-medium text-14 text-ink">
          <Text path="library.lineups.detailsTitle" />
        </span>
        <span
          className={`rounded-chip border px-2 py-0.5 font-medium text-11 ${
            SIDE_STYLES[lineup.side]
          }`}
        >
          {lineup.side === 'BOTH' ? <Text path="library.lineups.bothSides" /> : lineup.side}
        </span>

        <span className="flex items-center gap-1 rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink">
          <UtilityGlyph kind={lineup.kind} label={UTILITY_NAMES[lineup.kind]} size="control" />
          <span>{UTILITY_NAMES[lineup.kind]}</span>
        </span>

        <span className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink-dim">
          <Text path={`review.maps.throw.types.${lineup.throwType}`} />
        </span>

        <span className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink-dim">
          <Text path={lineup.isBuiltIn ? 'library.lineups.builtIn' : 'library.lineups.custom'} />
        </span>
      </div>

      <div className="flex items-center gap-1">
        {!lineup.isBuiltIn && (
          <>
            {onEdit !== undefined && (
              <button
                type="button"
                onClick={handleEdit}
                title={t('library.lineups.edit')}
                aria-label={t('library.lineups.edit')}
                className="rounded-chip p-1.5 text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <Pencil className="size-4" />
              </button>
            )}
            {onDelete !== undefined && (
              <button
                type="button"
                onClick={handleDelete}
                title={t('library.lineups.delete')}
                aria-label={t('library.lineups.delete')}
                className="rounded-chip p-1.5 text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('library.lineups.form.close')}
          className="rounded-chip p-1.5 text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function LineupImageViewer({
  title,
  imageUrls,
  kind,
}: {
  readonly title: string;
  readonly imageUrls: readonly string[];
  readonly kind: Lineup['kind'];
}) {
  const t = useT();
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);

  const activeUrl = imageUrls[activeIndex];

  const handleZoom = (nextZoom: number) => {
    const clamped = Math.max(1, Math.min(5, nextZoom));
    setZoom(clamped);
    if (clamped <= 1) {
      setPan({ x: 0, y: 0 });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.detail === 2) {
      handleZoom(zoom > 1 ? 1 : 2.5);
      return;
    }
    if (zoom <= 1) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({
      x: dragRef.current.initialPanX + dx,
      y: dragRef.current.initialPanY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  if (!activeUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-surface-0 p-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-card border border-line bg-surface-2 text-ink-dim">
          <UtilityGlyph kind={kind} label={UTILITY_NAMES[kind]} size="control" />
        </span>
        <span className="text-13 text-ink-dim">
          <Text path="library.lineups.noImagesNotice" />
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 min-h-0 min-w-0 flex-col bg-surface-0 overflow-hidden select-none">
      {/* Zoom toolbar */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-card border border-line bg-surface-1/90 p-1 backdrop-blur-sm shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleZoom(zoom + 0.5)}
          title={t('library.lineups.zoomIn')}
          aria-label={t('library.lineups.zoomIn')}
          className="size-7"
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleZoom(zoom - 0.5)}
          title={t('library.lineups.zoomOut')}
          aria-label={t('library.lineups.zoomOut')}
          className="size-7"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleZoom(1)}
          title={t('library.lineups.zoomReset')}
          aria-label={t('library.lineups.zoomReset')}
          className="size-7"
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <span className="px-1.5 font-mono text-11 text-ink-dim tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Main Image Viewport */}
      <div
        className={`relative flex flex-1 min-h-0 min-w-0 items-center justify-center overflow-hidden p-4 ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={(e) => {
          e.preventDefault();
          handleZoom(e.deltaY < 0 ? zoom + 0.25 : zoom - 0.25);
        }}
      >
        <img
          src={activeUrl}
          alt={title}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          className="max-h-full max-w-full rounded object-contain transition-transform duration-75 select-none"
        />
      </div>

      {/* Thumbnails strip */}
      {imageUrls.length > 1 && (
        <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface-1 p-2.5 overflow-x-auto">
          {imageUrls.map((url, idx) => (
            <button
              key={url}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className={`relative size-14 shrink-0 overflow-hidden rounded-chip border-2 transition-all ${
                idx === activeIndex
                  ? 'border-focus shadow-sm opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={`${title} ${idx + 1}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LineupExplanation({
  instructions,
  notes,
}: {
  readonly instructions?: string | undefined;
  readonly notes?: string | undefined;
}) {
  if (!instructions && !notes) return null;

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3.5">
      <span className="label-dense text-ink-dim">
        <Text path="library.lineups.explanation" />
      </span>
      {instructions && <p className="text-13 font-medium text-ink leading-prose">{instructions}</p>}
      {notes && <p className="text-12 text-ink-dim leading-prose">{notes}</p>}
    </div>
  );
}

function LineupMovementCard({
  throwType,
  movementKeys,
}: {
  readonly throwType: Lineup['throwType'];
  readonly movementKeys: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface-2 p-3.5">
      <span className="label-dense text-ink-dim">
        <Text path="library.lineups.movement" />
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-chip border border-line bg-surface-3 px-2.5 py-1 text-12 font-medium text-ink">
          <Text path={`review.maps.throw.types.${throwType}`} />
        </span>
        {movementKeys.map((key) => (
          <kbd
            key={key}
            className="rounded-chip border border-line bg-surface-3 px-2.5 py-1 font-mono font-medium text-12 text-ink shadow-sm"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

function LineupCoordinatesCollapsible({
  lineup,
  landingCommand,
}: {
  readonly lineup: Lineup;
  readonly landingCommand: string | null;
}) {
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [copiedLanding, setCopiedLanding] = useState(false);

  useEffect(() => {
    if (!copiedOrigin) return;
    const timer = setTimeout(() => setCopiedOrigin(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedOrigin]);

  useEffect(() => {
    if (!copiedLanding) return;
    const timer = setTimeout(() => setCopiedLanding(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedLanding]);

  const copyToClipboard = async (text: string, type: 'origin' | 'landing') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'origin') setCopiedOrigin(true);
      else setCopiedLanding(true);
    } catch {
      // Ignore clipboard write failure in non-secure context
    }
  };

  return (
    <details className="group rounded-card border border-line bg-surface-2/60 overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between p-3 select-none text-12 font-medium text-ink transition-colors hover:bg-surface-3/50">
        <span className="flex items-center gap-2">
          <ChevronDown className="size-4 text-ink-dim transition-transform duration-200 group-open:rotate-180" />
          <Text path="library.lineups.coordinatesTitle" />
        </span>
        <span className="rounded-chip border border-ct/30 bg-ct/10 px-2 py-0.5 font-mono text-10 text-ct">
          <Text path="library.lineups.fromDemoNotice" />
        </span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-line/60 p-3 pt-2.5">
        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.coordinatesOrigin" />
          </span>
          <div className="rounded-card border border-line bg-surface-1 p-2 font-mono text-11 text-ink-dim">
            X: {lineup.origin.x.toFixed(1)} · Y: {lineup.origin.y.toFixed(1)}
            {lineup.origin.z !== undefined ? ` · Z: ${lineup.origin.z.toFixed(1)}` : ''}
            <br />
            Pitch: {lineup.pitch.toFixed(1)}° · Yaw: {lineup.yaw.toFixed(1)}°
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.coordinatesLanding" />
          </span>
          <div className="rounded-card border border-line bg-surface-1 p-2 font-mono text-11 text-ink-dim">
            X: {lineup.landing.x.toFixed(1)} · Y: {lineup.landing.y.toFixed(1)}
            {lineup.landing.z !== undefined ? ` · Z: ${lineup.landing.z.toFixed(1)}` : ''}
          </div>
        </div>

        {lineup.command && (
          <div className="flex flex-col gap-1.5">
            <span className="label-dense text-11 text-ink-dim">
              <Text path="library.lineups.commandOrigin" />
            </span>
            <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface-1 p-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-11 text-ink">
                {lineup.command}
              </code>
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(lineup.command, 'origin')}
                className="h-6 shrink-0 gap-1 px-2 text-11"
              >
                {copiedOrigin ? (
                  <>
                    <Check className="size-3 text-ct" />
                    <Text path="library.lineups.copied" />
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <Text path="library.lineups.copyCommand" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {landingCommand && (
          <div className="flex flex-col gap-1.5">
            <span className="label-dense text-11 text-ink-dim">
              <Text path="library.lineups.commandLanding" />
            </span>
            <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface-1 p-1.5">
              <code className="min-w-0 flex-1 truncate font-mono text-11 text-ink">
                {landingCommand}
              </code>
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(landingCommand, 'landing')}
                className="h-6 shrink-0 gap-1 px-2 text-11"
              >
                {copiedLanding ? (
                  <>
                    <Check className="size-3 text-ct" />
                    <Text path="library.lineups.copied" />
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <Text path="library.lineups.copyLandingCommand" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function LineupInfoSidebar({
  lineup,
  landingCommand,
  isFromDemo,
  mediaUrl,
}: {
  readonly lineup: Lineup;
  readonly landingCommand: string | null;
  readonly isFromDemo: boolean;
  readonly mediaUrl: string | null;
}) {
  return (
    <div className="flex w-full min-h-0 shrink-0 flex-col gap-4 overflow-y-auto border-t border-line bg-surface-1 p-5 lg:w-[22rem] lg:border-l lg:border-t-0 xl:w-[26rem]">
      <div className="flex flex-col gap-1">
        <h2 className="font-ui font-medium text-20 text-ink leading-dense">{lineup.title}</h2>
        {mediaUrl && (
          <div>
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-12 text-ink-dim transition-colors hover:text-ink"
            >
              <ExternalLink className="size-3.5" />
              <Text path="library.lineups.media" />
            </a>
          </div>
        )}
      </div>

      <LineupExplanation instructions={lineup.movementInstructions} notes={lineup.notes} />

      <LineupMovementCard throwType={lineup.throwType} movementKeys={lineup.movementKeys ?? []} />

      {isFromDemo && (
        <LineupCoordinatesCollapsible lineup={lineup} landingCommand={landingCommand} />
      )}
    </div>
  );
}

export function LineupDetailModal({ lineup, isOpen, onDismiss, onEdit, onDelete }: Props) {
  if (lineup === null) return null;

  const mediaUrl = safeMediaUrl(lineup.mediaUrl);
  const imageUrls = lineup.imageUrls?.length
    ? lineup.imageUrls
    : [imageUrlOf(mediaUrl)].filter((url): url is string => url !== null);

  const isFromDemo = Boolean(
    lineup.fromDemo ?? (lineup.command && lineup.command.trim().length > 0),
  );

  const landingCommand =
    lineup.landingCommand ??
    (isFromDemo
      ? `setpos ${lineup.landing.x.toFixed(2)} ${lineup.landing.y.toFixed(2)} ${lineup.landing.z.toFixed(2)}`
      : null);

  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={onDismiss}
      className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[96rem] flex-col overflow-hidden p-0"
    >
      <LineupDetailHeader
        lineup={lineup}
        onDismiss={onDismiss}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        <LineupImageViewer title={lineup.title} imageUrls={imageUrls} kind={lineup.kind} />

        <LineupInfoSidebar
          lineup={lineup}
          landingCommand={landingCommand}
          isFromDemo={isFromDemo}
          mediaUrl={mediaUrl}
        />
      </div>
    </Dialog>
  );
}
