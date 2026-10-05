import { type Lineup, UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import { useLineupImageViewer } from '../hooks/use-lineup-image-viewer';
import { LineupPhoto } from './LineupPhoto';

export function LineupImageViewer({
  title,
  imageUrls,
  imageCaptions,
  kind,
  initialIndex = 0,
}: {
  readonly title: string;
  readonly imageUrls: readonly string[];
  readonly imageCaptions: readonly string[];
  readonly kind: Lineup['kind'];
  readonly initialIndex?: number;
}) {
  const t = useT();
  const {
    activeIndex,
    activeUrl,
    activeCaption,
    zoom,
    isDragging,
    canPan,
    containerRef,
    imageRef,
    selectImage,
    handleZoom,
    handleKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    onImageLoad,
  } = useLineupImageViewer(imageUrls, imageCaptions, initialIndex);

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
        <LineupPhoto
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
          onLoad={onImageLoad}
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
              <LineupPhoto
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
