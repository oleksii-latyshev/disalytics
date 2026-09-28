import { type Lineup, type LineupSide, UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, cn, Dialog } from '@disa/ui';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    if (
      onDelete !== undefined &&
      !lineup.isBuiltIn &&
      window.confirm(t('library.lineups.deleteConfirm'))
    ) {
      onDelete(lineup.id);
      onDismiss();
    }
  };

  const handleEdit = () => {
    if (onEdit !== undefined) {
      onEdit(lineup);
      onDismiss();
    }
  };

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-line bg-surface-1 px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 mr-2">
        <h2
          id="lineup-detail-title"
          className="truncate font-ui font-medium text-13 sm:text-14 text-ink max-w-[12rem] sm:max-w-xs md:max-w-md"
          title={lineup.title}
        >
          {lineup.title}
        </h2>
        <span
          className={`shrink-0 rounded-chip border px-1.5 py-0.5 font-medium text-10 ${
            SIDE_STYLES[lineup.side]
          }`}
        >
          {lineup.side === 'BOTH' ? <Text path="library.lineups.bothSides" /> : lineup.side}
        </span>
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 text-ink">
          <UtilityGlyph kind={lineup.kind} label={UTILITY_NAMES[lineup.kind]} size="control" />
          <span>{UTILITY_NAMES[lineup.kind]}</span>
        </span>
        <span className="hidden md:inline-block shrink-0 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 text-ink-dim">
          <Text path={`review.maps.throw.types.${lineup.throwType}`} />
        </span>
        <span className="hidden lg:inline-block shrink-0 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 text-ink-dim">
          <Text path={lineup.isBuiltIn ? 'library.lineups.builtIn' : 'library.lineups.custom'} />
        </span>
        {lineup.targetCallout && (
          <span className="shrink-0 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 font-medium text-10 text-ink">
            {lineup.targetCallout}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
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
                <Pencil className="size-3.5 sm:size-4" />
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
                <Trash2 className="size-3.5 sm:size-4" />
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
  imageCaptions,
  kind,
}: {
  readonly title: string;
  readonly imageUrls: readonly string[];
  readonly imageCaptions: readonly string[];
  readonly kind: Lineup['kind'];
}) {
  const t = useT();
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
  } | null>(null);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    isHorizontal: boolean;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const activeUrl = imageUrls[activeIndex];
  const activeCaption = imageCaptions[activeIndex]?.trim() ?? '';

  const selectImage = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= imageUrls.length || nextIndex === activeIndex) return;
      setActiveIndex(nextIndex);
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      setZoom(1);
      setIsDragging(false);
      dragRef.current = null;
      swipeRef.current = null;
    },
    [activeIndex, imageUrls.length],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (imageUrls.length < 2 || zoomRef.current > 1) return;
    if (e.key === 'ArrowLeft' && activeIndex > 0) {
      e.preventDefault();
      selectImage(activeIndex - 1);
    } else if (e.key === 'ArrowRight' && activeIndex < imageUrls.length - 1) {
      e.preventDefault();
      selectImage(activeIndex + 1);
    }
  };

  const getBounds = useCallback((currentZoom: number) => {
    if (currentZoom <= 1 || !containerRef.current || !imageRef.current) {
      return { maxPanX: 0, maxPanY: 0 };
    }
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    if (cw <= 0 || ch <= 0) return { maxPanX: 0, maxPanY: 0 };

    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    if (naturalWidth <= 0 || naturalHeight <= 0) return { maxPanX: 0, maxPanY: 0 };
    const fit = Math.min(cw / naturalWidth, ch / naturalHeight);
    const iw = naturalWidth * fit;
    const ih = naturalHeight * fit;
    const enlargedWidth = iw * currentZoom;
    const enlargedHeight = ih * currentZoom;

    return {
      maxPanX: Math.max(0, (enlargedWidth - cw) / 2),
      maxPanY: Math.max(0, (enlargedHeight - ch) / 2),
    };
  }, []);

  const clampPan = useCallback(
    (x: number, y: number, currentZoom: number) => {
      const { maxPanX, maxPanY } = getBounds(currentZoom);
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, y)),
      };
    },
    [getBounds],
  );

  const applyTransform = useCallback((x: number, y: number, currentZoom: number) => {
    if (imageRef.current) {
      imageRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${currentZoom})`;
    }
  }, []);

  const handleZoom = useCallback(
    (nextZoom: number) => {
      const clampedZoom = Math.max(1, Math.min(5, Math.round(nextZoom * 100) / 100));
      setZoom(clampedZoom);
      zoomRef.current = clampedZoom;
      const clamped = clampPan(panRef.current.x, panRef.current.y, clampedZoom);
      panRef.current = clamped;
      applyTransform(clamped.x, clamped.y, clampedZoom);
    },
    [applyTransform, clampPan],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(zoomRef.current + (e.deltaY < 0 ? 0.25 : -0.25));
    };

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            const clamped = clampPan(panRef.current.x, panRef.current.y, zoomRef.current);
            panRef.current = clamped;
            applyTransform(clamped.x, clamped.y, zoomRef.current);
          })
        : null;

    container.addEventListener('wheel', onWheel, { passive: false });
    observer?.observe(container);

    return () => {
      container.removeEventListener('wheel', onWheel);
      observer?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [applyTransform, clampPan, handleZoom]);

  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const { maxPanX, maxPanY } = getBounds(zoomRef.current);
    if (maxPanX <= 0 && maxPanY <= 0) return;

    e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialPanX: panRef.current.x,
      initialPanY: panRef.current.y,
    };
    setIsDragging(true);
    if (imageRef.current) {
      imageRef.current.style.transition = 'none';
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const startSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || imageUrls.length < 2) return;
    swipeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      isHorizontal: false,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (e.detail === 2) {
      handleZoom(zoomRef.current > 1 ? 1 : 2.5);
      return;
    }
    if (zoomRef.current <= 1) {
      startSwipe(e);
      return;
    }
    startPan(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (swipe?.pointerId === e.pointerId && zoomRef.current <= 1) {
      const dx = e.clientX - swipe.startX;
      const dy = e.clientY - swipe.startY;
      if (!swipe.isHorizontal && Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy)) {
        swipe.isHorizontal = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      if (swipe.isHorizontal) e.preventDefault();
      return;
    }
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const targetX = dragRef.current.initialPanX + dx;
    const targetY = dragRef.current.initialPanY + dy;
    const clamped = clampPan(targetX, targetY, zoomRef.current);
    panRef.current = clamped;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        applyTransform(panRef.current.x, panRef.current.y, zoomRef.current);
      });
    }
  };

  const finishSwipe = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId) return false;
    const dx = e.clientX - swipe.startX;
    const dy = e.clientY - swipe.startY;
    if (swipe.isHorizontal && Math.abs(dx) >= 56 && Math.abs(dx) > Math.abs(dy)) {
      selectImage(activeIndex + (dx < 0 ? 1 : -1));
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    swipeRef.current = null;
    return true;
  };

  const finishPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && e.currentTarget.hasPointerCapture(dragRef.current.pointerId)) {
      e.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    applyTransform(panRef.current.x, panRef.current.y, zoomRef.current);
    if (imageRef.current) {
      imageRef.current.style.transition = '';
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (finishSwipe(e)) return;
    finishPan(e);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeRef.current = null;
    finishPan(e);
  };

  if (!activeUrl) {
    return (
      <div className="flex flex-1 min-h-[220px] flex-col items-center justify-center gap-3 bg-surface-0 p-6 text-center">
        <span className="flex size-16 sm:size-20 items-center justify-center rounded-card border border-line bg-surface-2 text-ink-dim">
          <UtilityGlyph kind={kind} label={UTILITY_NAMES[kind]} size="control" />
        </span>
        <span className="text-13 text-ink-dim">
          <Text path="library.lineups.noImagesNotice" />
        </span>
      </div>
    );
  }

  const { maxPanX, maxPanY } = getBounds(zoom);
  const canPan = zoom > 1 && (maxPanX > 0 || maxPanY > 0);

  return (
    <div className="relative flex flex-col bg-surface-0 overflow-hidden select-none h-[42vh] min-h-[220px] shrink-0 lg:h-full lg:min-h-0 lg:flex-1">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-card border border-line bg-surface-2 p-1 shadow-float">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleZoom(zoom + 0.5)}
          title={t('library.lineups.zoomIn')}
          aria-label={t('library.lineups.zoomIn')}
          className="size-7 text-ink-dim hover:text-ink"
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
          className="size-7 text-ink-dim hover:text-ink"
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
          className="size-7 text-ink-dim hover:text-ink"
        >
          <RotateCcw className="size-3.5" />
        </Button>
        <span className="px-1.5 font-mono text-11 text-ink-dim tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <section
        tabIndex={imageUrls.length > 1 ? 0 : undefined}
        aria-label={title}
        ref={containerRef}
        className={cn(
          'relative flex flex-1 min-h-0 min-w-0 items-center justify-center overflow-hidden select-none p-1 sm:p-2',
          canPan ? 'touch-none' : 'touch-pan-y',
          canPan ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
      >
        <img
          key={activeUrl}
          ref={imageRef}
          src={activeUrl}
          alt={activeCaption || title}
          draggable={false}
          referrerPolicy="no-referrer"
          style={{
            transform: 'translate3d(0px, 0px, 0) scale(1)',
            transformOrigin: 'center center',
          }}
          onLoad={() => {
            const clamped = clampPan(panRef.current.x, panRef.current.y, zoomRef.current);
            panRef.current = clamped;
            applyTransform(clamped.x, clamped.y, zoomRef.current);
          }}
          className={cn(
            'size-full rounded object-contain select-none pointer-events-none',
            isDragging
              ? 'transition-none'
              : 'motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-reduce:transition-none',
          )}
        />
      </section>

      {activeCaption && (
        <p className="shrink-0 [border-block-start:1px_solid_var(--color-line)] bg-surface-1 px-3 py-2 text-12 text-ink">
          {activeCaption}
        </p>
      )}

      {imageUrls.length > 1 && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={activeIndex === 0}
            onClick={() => selectImage(activeIndex - 1)}
            title={t('library.lineups.previousPhoto')}
            aria-label={t('library.lineups.previousPhoto')}
            className="absolute left-3 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full border border-line bg-surface-2 text-ink-dim shadow-float hover:text-ink motion-reduce:transition-none"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={activeIndex === imageUrls.length - 1}
            onClick={() => selectImage(activeIndex + 1)}
            title={t('library.lineups.nextPhoto')}
            aria-label={t('library.lineups.nextPhoto')}
            className="absolute right-3 top-1/2 z-10 size-9 -translate-y-1/2 rounded-full border border-line bg-surface-2 text-ink-dim shadow-float hover:text-ink motion-reduce:transition-none"
          >
            <ChevronRight className="size-5" />
          </Button>
        </>
      )}

      {/* Thumbnails strip */}
      {imageUrls.length > 1 && (
        <div className="flex shrink-0 items-center gap-2 [border-block-start:1px_solid_var(--color-line)] bg-surface-1 p-2 overflow-x-auto">
          {imageUrls.map((url, idx) => (
            <button
              key={url}
              type="button"
              aria-current={idx === activeIndex ? 'true' : undefined}
              onClick={() => selectImage(idx)}
              className={`relative size-12 sm:size-14 shrink-0 overflow-hidden rounded-chip border-2 transition-opacity motion-reduce:transition-none ${
                idx === activeIndex
                  ? 'border-focus opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={url}
                alt={imageCaptions[idx]?.trim() || `${title} ${idx + 1}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-full object-cover select-none pointer-events-none"
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

function LineupMovementCard({ movementKeys }: { readonly movementKeys: readonly string[] }) {
  if (movementKeys.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface-2 p-3.5">
      <span className="label-dense text-ink-dim">
        <Text path="library.lineups.movement" />
      </span>
      <div className="flex flex-wrap items-center gap-2">
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
  const [copiedKey, setCopiedKey] = useState<'origin' | 'landing' | null>(null);

  useEffect(() => {
    if (copiedKey === null) return;
    const timer = setTimeout(() => setCopiedKey(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedKey]);

  const copyToClipboard = async (text: string, key: 'origin' | 'landing') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
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

      <div className="flex flex-col gap-3 [border-block-start:1px_solid_var(--color-line-soft)] p-3 pt-2.5">
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
                onClick={() => copyToClipboard(lineup.command ?? '', 'origin')}
                className="h-6 shrink-0 gap-1 px-2 text-11"
              >
                {copiedKey === 'origin' ? (
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
                {copiedKey === 'landing' ? (
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
    <div className="flex w-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden [border-block-start:1px_solid_var(--color-line)] bg-surface-1 p-4 sm:p-5 lg:w-[22rem] lg:flex-none lg:[border-block-start:0] lg:[border-inline-start:1px_solid_var(--color-line)] xl:w-[24rem]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.detailsTitle" />
          </span>
          {mediaUrl && (
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-12 text-ink-dim transition-colors hover:text-ink"
            >
              <ExternalLink className="size-3.5" />
              <Text path="library.lineups.media" />
            </a>
          )}
        </div>

        <h2 className="font-ui font-medium text-16 text-ink leading-dense break-words">
          {lineup.title}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5">
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
      </div>

      <LineupExplanation instructions={lineup.movementInstructions} notes={lineup.notes} />

      <LineupMovementCard movementKeys={lineup.movementKeys ?? []} />

      {lineup.mouseButtons && lineup.mouseButtons.length > 0 && (
        <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3.5">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.mouseButtons" />
          </span>
          <div className="flex flex-wrap gap-2">
            {lineup.mouseButtons.map((button) => (
              <kbd
                key={button}
                className="rounded-chip border border-line bg-surface-3 px-2.5 py-1 font-mono text-12 text-ink"
              >
                <Text path={`library.lineups.form.mouse.${button}`} />
              </kbd>
            ))}
          </div>
        </div>
      )}

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
      aria-labelledby="lineup-detail-title"
      className="flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[120rem] flex-col overflow-hidden p-0"
    >
      <LineupDetailHeader
        lineup={lineup}
        onDismiss={onDismiss}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        <LineupImageViewer
          title={lineup.title}
          imageUrls={imageUrls}
          imageCaptions={lineup.imageCaptions ?? []}
          kind={lineup.kind}
        />

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
