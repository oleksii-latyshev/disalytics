import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ChevronLeft, ChevronRight, Maximize, ZoomIn, ZoomOut } from 'lucide-react';
import { MAX_ZOOM, MIN_ZOOM } from '../helpers/shot-zoom';
import type { useShotZoom } from '../hooks/use-shot-zoom';
import { LineupPhoto } from './LineupPhoto';

const STEP = 'absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-surface-0/70';

interface Props {
  photos: readonly string[];
  captions: readonly string[];
  title: string;
  index: number;
  onIndex: (index: number) => void;
  onAdd: () => void;
  zoom: ReturnType<typeof useShotZoom>;
}

/**
 * A position's crosshair screenshots: one at size that can be zoomed into and dragged around, a way
 * to step through them, and a strip of all.
 */
export function LineupPositionShots({
  photos,
  captions,
  title,
  index,
  onIndex,
  onAdd,
  zoom,
}: Props) {
  const t = useT();
  const url = photos[index];
  const count = photos.length;

  if (url === undefined) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 bg-surface-0 p-6 text-center">
        <p className="text-14 text-ink-dim">
          <Text path="library.lineups.position.noShots" />
        </p>
        <Button variant="outline" size="lg" onClick={onAdd} className="border-dashed">
          <Text path="library.lineups.position.addShot" />
        </Button>
      </div>
    );
  }

  const step = (by: number) => onIndex((index + by + count) % count);
  const isZoomed = zoom.zoom > MIN_ZOOM;
  const cursor = zoom.isDragging ? 'cursor-grabbing' : isZoomed ? 'cursor-grab' : 'cursor-zoom-in';

  return (
    <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-surface-0">
      <div className="relative min-h-64 min-w-0 overflow-hidden">
        {/* The frame takes the wheel, the drag and the double-click; every control sits over it. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer surface for wheel, drag and double-click; the keyboard has the buttons and + − 0 on the dialog. */}
        <div
          ref={zoom.frameRef}
          onPointerDown={zoom.onPointerDown}
          onPointerMove={zoom.onPointerMove}
          onPointerUp={zoom.onPointerUp}
          onPointerCancel={zoom.onPointerCancel}
          onDoubleClick={zoom.onDoubleClick}
          className={`absolute inset-0 touch-none select-none overflow-hidden ${cursor}`}
        >
          <LineupPhoto
            key={url}
            ref={zoom.imageRef}
            src={url}
            alt={captions[index] || title}
            draggable={false}
            referrerPolicy="no-referrer"
            onLoad={zoom.onImageLoad}
            className="pointer-events-none absolute inset-0 size-full origin-center object-contain will-change-transform"
          />
        </div>

        <fieldset
          aria-label={t('library.lineups.position.zoomLevel', {
            percent: Math.round(zoom.zoom * 100),
          })}
          className="absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-card border border-line bg-surface-1/90 p-1 shadow-float"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoom.zoomBy(-1)}
            disabled={!isZoomed}
            aria-label={t('library.lineups.position.zoomOut')}
            title={t('library.lineups.position.zoomOut')}
          >
            <ZoomOut aria-hidden="true" />
          </Button>
          <span className="numeric min-w-11 text-center text-11 text-ink-dim">
            <Text
              path="library.lineups.position.zoomLevel"
              values={{ percent: Math.round(zoom.zoom * 100) }}
            />
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => zoom.zoomBy(1)}
            disabled={zoom.zoom >= MAX_ZOOM}
            aria-label={t('library.lineups.position.zoomIn')}
            title={t('library.lineups.position.zoomIn')}
          >
            <ZoomIn aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoom.reset}
            disabled={!isZoomed}
            aria-label={t('library.lineups.position.zoomReset')}
            title={t('library.lineups.position.zoomReset')}
          >
            <Maximize aria-hidden="true" />
          </Button>
        </fieldset>

        <span
          className={`pointer-events-none absolute top-3 left-3 z-10 max-w-[calc(100%-14rem)] rounded-chip bg-surface-0/80 px-2.5 py-1 text-12 text-ink-dim transition-opacity duration-(--duration-base) ease-out ${zoom.hasZoomed ? 'opacity-0' : 'opacity-100'}`}
        >
          <Text path="library.lineups.position.zoomHint" />
        </span>

        <span className="numeric pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-chip bg-surface-0/80 px-2.5 py-1 font-medium text-12 text-ink-dim">
          <Text path="library.lineups.position.shot" values={{ index: index + 1, count }} />
        </span>
        {count > 1 && (
          <>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => step(-1)}
              aria-label={t('library.lineups.previousPhoto')}
              className={`${STEP} left-3.5`}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={() => step(1)}
              aria-label={t('library.lineups.nextPhoto')}
              className={`${STEP} right-3.5`}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex list-none gap-2 overflow-x-auto [border-block-start:1px_solid_var(--color-line)] bg-surface-1 px-3 py-2.5">
          {photos.map((photo, thumb) => (
            <li key={photo} className="shrink-0">
              <button
                type="button"
                aria-label={t('library.lineups.position.shotNumber', { number: thumb + 1 })}
                aria-current={thumb === index}
                onClick={() => onIndex(thumb)}
                className={`block h-[3.375rem] w-24 cursor-pointer overflow-hidden rounded-chip border-2 bg-surface-2 transition-[border-color,opacity] duration-(--duration-micro) ease-out ${thumb === index ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'}`}
              >
                <LineupPhoto
                  src={photo}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
