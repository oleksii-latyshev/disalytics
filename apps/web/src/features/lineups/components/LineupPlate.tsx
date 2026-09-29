import type { Lineup } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import {
  getMapOverview,
  type MapOverview,
  RADAR_IMAGE_SIZE,
  radarAssetPath,
  radarToWorld,
  radarX,
  radarY,
} from '@disa/map-data';
import { Button } from '@disa/ui';
import {
  CornerDownRight,
  GripVertical,
  Layers,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { UnknownMap } from '@/features/radar/components/UnknownMap';
import { radarBackdrop } from '@/features/radar/helpers/backdrop';
import { radarColors } from '@/features/radar/helpers/colors';
import { levelAt } from '@/features/radar/helpers/levels';
import {
  panBy,
  plateView,
  radarPointAt,
  ZOOM_STEP,
  zoomAbout,
  zoomByStep,
} from '@/features/radar/helpers/view';
import { useRadarImage } from '@/features/radar/hooks/use-radar-image';
import { type ActiveDragPoint, lineupLayer } from '../helpers/lineup-layer';
import {
  findNearestLineupTarget,
  groupLineupsByLanding,
  groupLineupsByOrigin,
  type LineupHit,
  lineupPlot,
} from '../helpers/lineup-plot';

const HIT_RADIUS_PX = 20;
const HANDLE_RADIUS_PX = 16;

export interface LineupPlateProps {
  readonly map: string;
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly onSelect: (hit: LineupHit | null, modifierKey?: boolean) => void;
  readonly onPlacePoint?:
    | ((point: { readonly x: number; readonly y: number }, isBounce?: boolean) => void)
    | undefined;
  readonly isPlacing?: boolean | undefined;
  readonly isAddingBounce?: boolean | undefined;
  readonly onToggleAddBounce?: (() => void) | undefined;
  readonly onCancelPlacement?: (() => void) | undefined;
  readonly draftOrigin?: { readonly x: number; readonly y: number } | null | undefined;
  readonly draftWaypoints?: readonly { readonly x: number; readonly y: number }[] | undefined;
  readonly onUpdatePoint?:
    | ((
        lineupId: string,
        target: 'origin' | 'landing' | 'waypoint',
        point: { readonly x: number; readonly y: number },
        waypointIndex?: number,
      ) => void)
    | undefined;
  readonly onMergeSelected?: (() => void) | undefined;
  readonly onUnmergeLineup?: ((lineupId: string) => void) | undefined;
  readonly onAddBounceToLineup?: ((lineupId: string) => void) | undefined;
  readonly onDeleteBounceFromLineup?:
    | ((lineupId: string, waypointIndex: number) => void)
    | undefined;
  readonly onEditLineup?: ((lineup: Lineup) => void) | undefined;
  readonly onDeleteLineup?: ((lineupId: string) => void) | undefined;
}

interface HandleTarget {
  readonly target: 'origin' | 'landing' | 'waypoint';
  readonly waypointIndex?: number | undefined;
}

function findHandleUnderPoint(
  pt: { readonly x: number; readonly y: number },
  lineup: Lineup,
  overview: MapOverview,
  scale: number,
  hitRadiusPx = HANDLE_RADIUS_PX,
): HandleTarget | null {
  const maxRadarDist = hitRadiusPx / scale;
  const maxDistSq = maxRadarDist * maxRadarDist;

  const ox = radarX(overview, lineup.origin.x);
  const oy = radarY(overview, lineup.origin.y);
  const dOx = ox - pt.x;
  const dOy = oy - pt.y;
  if (dOx * dOx + dOy * dOy <= maxDistSq) {
    return { target: 'origin' };
  }

  const lx = radarX(overview, lineup.landing.x);
  const ly = radarY(overview, lineup.landing.y);
  const dLx = lx - pt.x;
  const dLy = ly - pt.y;
  if (dLx * dLx + dLy * dLy <= maxDistSq) {
    return { target: 'landing' };
  }

  if (lineup.waypoints) {
    for (let w = 0; w < lineup.waypoints.length; w++) {
      const wp = lineup.waypoints[w];
      if (!wp) continue;
      const wx = radarX(overview, wp.x);
      const wy = radarY(overview, wp.y);
      const dWx = wx - pt.x;
      const dWy = wy - pt.y;
      if (dWx * dWx + dWy * dWy <= maxDistSq) {
        return { target: 'waypoint', waypointIndex: w };
      }
    }
  }

  return null;
}

interface ContextMenuData {
  readonly x: number;
  readonly y: number;
  readonly hitLineup: Lineup | null;
  readonly hitWaypointIndex: number | null;
}

function LineupCanvas({
  overview,
  lineups,
  focused,
  selectedIds,
  onSelect,
  onPlacePoint,
  isPlacing = false,
  isAddingBounce = false,
  onToggleAddBounce,
  onCancelPlacement,
  draftOrigin,
  draftWaypoints,
  onUpdatePoint,
  onMergeSelected,
  onUnmergeLineup,
  onAddBounceToLineup,
  onDeleteBounceFromLineup,
  onEditLineup,
  onDeleteLineup,
}: {
  readonly overview: MapOverview;
  readonly lineups: readonly Lineup[];
  readonly focused: number | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly onSelect: (hit: LineupHit | null, modifierKey?: boolean) => void;
  readonly onPlacePoint?:
    | ((point: { readonly x: number; readonly y: number }, isBounce?: boolean) => void)
    | undefined;
  readonly isPlacing?: boolean | undefined;
  readonly isAddingBounce?: boolean | undefined;
  readonly onToggleAddBounce?: (() => void) | undefined;
  readonly onCancelPlacement?: (() => void) | undefined;
  readonly draftOrigin?: { readonly x: number; readonly y: number } | null | undefined;
  readonly draftWaypoints?: readonly { readonly x: number; readonly y: number }[] | undefined;
  readonly onUpdatePoint?:
    | ((
        lineupId: string,
        target: 'origin' | 'landing' | 'waypoint',
        point: { readonly x: number; readonly y: number },
        waypointIndex?: number,
      ) => void)
    | undefined;
  readonly onMergeSelected?: (() => void) | undefined;
  readonly onUnmergeLineup?: ((lineupId: string) => void) | undefined;
  readonly onAddBounceToLineup?: ((lineupId: string) => void) | undefined;
  readonly onDeleteBounceFromLineup?:
    | ((lineupId: string, waypointIndex: number) => void)
    | undefined;
  readonly onEditLineup?: ((lineup: Lineup) => void) | undefined;
  readonly onDeleteLineup?: ((lineupId: string) => void) | undefined;
}) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');

  const image = useRadarImage(radarAssetPath(levelAt(overview, 0), theme));
  const colors = radarColors(palette);

  const viewRef = useRef(plateView());
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const pointDragRef = useRef<{
    target: 'origin' | 'landing' | 'waypoint';
    waypointIndex?: number | undefined;
    moved: boolean;
  } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [activeDrag, setActiveDrag] = useState<ActiveDragPoint | null>(null);
  const [hoverWorldPoint, setHoverWorldPoint] = useState<{ x: number; y: number } | null>(null);
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing' | 'crosshair' | 'default'>(
    'crosshair',
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null);

  const plot = useMemo(() => lineupPlot(overview, lineups), [overview, lineups]);
  const groups = useMemo(() => groupLineupsByOrigin(lineups), [lineups]);
  const landingGroups = useMemo(() => groupLineupsByLanding(lineups), [lineups]);

  const selectedLineup = focused !== null ? (lineups[focused] ?? null) : null;

  const layers = useMemo(() => {
    const layer = lineupLayer({
      lineups,
      plot,
      groups,
      landingGroups,
      overview,
      colors,
      view: viewRef,
      focused,
      draftOrigin,
      draftWaypoints,
      hoverPoint: hoverWorldPoint,
      hideLineups: isPlacing,
      activeDrag,
    });

    return image.status === 'ready' ? [radarBackdrop(image.image, viewRef), layer] : [layer];
  }, [
    lineups,
    plot,
    groups,
    landingGroups,
    overview,
    colors,
    image,
    focused,
    draftOrigin,
    draftWaypoints,
    hoverWorldPoint,
    isPlacing,
    activeDrag,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);

  const canvasSize = () => {
    const box = canvasRef.current?.getBoundingClientRect();
    return box ? { width: box.width, height: box.height } : null;
  };

  const changeZoom = (factor: number) => {
    const size = canvasSize();
    if (size === null) return;
    zoomByStep(viewRef.current, factor, size);
    setZoom(viewRef.current.zoom);
    repaint();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (contextMenu !== null) {
          setContextMenu(null);
        } else if (isPlacing) {
          onCancelPlacement?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, isPlacing, onCancelPlacement]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (contextMenu !== null) {
      setContextMenu(null);
    }
    if (dragRef.current?.moved || pointDragRef.current?.moved) {
      dragRef.current = null;
      pointDragRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    const pt = radarPointAt(
      viewRef.current,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      RADAR_IMAGE_SIZE,
    );

    if (isPlacing) {
      if (pt.x < 0 || pt.y < 0 || pt.x > RADAR_IMAGE_SIZE || pt.y > RADAR_IMAGE_SIZE) return;
      const worldPoint = radarToWorld(overview, pt);
      onPlacePoint?.(worldPoint, isAddingBounce);
      return;
    }

    const extent = Math.min(box.width, box.height);
    const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;
    if (scale <= 0) return;

    const hit = findNearestLineupTarget(pt, plot, lineups.length, scale, HIT_RADIUS_PX);
    const isModifier = event.shiftKey || event.ctrlKey || event.metaKey;
    onSelect(hit, isModifier);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (isPlacing) {
      onCancelPlacement?.();
      return;
    }

    const canvas = canvasRef.current;
    if (canvas === null) return;
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    const pt = radarPointAt(
      viewRef.current,
      event.clientX - box.left,
      event.clientY - box.top,
      box,
      RADAR_IMAGE_SIZE,
    );
    const extent = Math.min(box.width, box.height);
    const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;

    const hit = findNearestLineupTarget(pt, plot, lineups.length, scale, HIT_RADIUS_PX);
    const hitLineup = hit !== null ? (lineups[hit.index] ?? null) : null;
    const handle =
      selectedLineup !== null
        ? findHandleUnderPoint(pt, selectedLineup, overview, scale, HANDLE_RADIUS_PX)
        : null;

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      hitLineup: hitLineup ?? selectedLineup,
      hitWaypointIndex: handle?.target === 'waypoint' ? (handle.waypointIndex ?? null) : null,
    });
  };

  return (
    <div className="relative grid size-full min-h-0 min-w-0 place-items-center">
      <div className="relative aspect-square w-full max-w-[calc(100dvh-10rem)] overflow-hidden rounded-card lg:w-[min(100cqi,100cqb)] lg:max-w-none">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('radar.label', { map: overview.id })}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onWheel={(event) => {
            event.preventDefault();
            const size = canvasSize();
            if (size === null) return;
            const box = event.currentTarget.getBoundingClientRect();
            zoomAbout(
              viewRef.current,
              event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP,
              event.clientX - box.left,
              event.clientY - box.top,
              size,
            );
            setZoom(viewRef.current.zoom);
            repaint();
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const canvas = canvasRef.current;
            if (canvas === null) return;
            const box = canvas.getBoundingClientRect();
            const pt = radarPointAt(
              viewRef.current,
              event.clientX - box.left,
              event.clientY - box.top,
              box,
              RADAR_IMAGE_SIZE,
            );
            const extent = Math.min(box.width, box.height);
            const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;

            if (selectedLineup && !isPlacing) {
              const handle = findHandleUnderPoint(pt, selectedLineup, overview, scale);
              if (handle !== null) {
                pointDragRef.current = {
                  target: handle.target,
                  waypointIndex: handle.waypointIndex,
                  moved: false,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
                setCursorStyle('grabbing');
                return;
              }
            }

            if (viewRef.current.zoom > 1) {
              dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }}
          onPointerMove={(event) => {
            const canvas = canvasRef.current;
            if (canvas === null) return;
            const box = canvas.getBoundingClientRect();
            const pt = radarPointAt(
              viewRef.current,
              event.clientX - box.left,
              event.clientY - box.top,
              box,
              RADAR_IMAGE_SIZE,
            );
            const extent = Math.min(box.width, box.height);
            const scale = (extent * viewRef.current.zoom) / RADAR_IMAGE_SIZE;

            // Handle active dragging of points
            if (pointDragRef.current !== null) {
              pointDragRef.current.moved = true;
              const clampedX = Math.max(0, Math.min(RADAR_IMAGE_SIZE, pt.x));
              const clampedY = Math.max(0, Math.min(RADAR_IMAGE_SIZE, pt.y));
              setActiveDrag({
                target: pointDragRef.current.target,
                waypointIndex: pointDragRef.current.waypointIndex,
                radarX: clampedX,
                radarY: clampedY,
              });
              repaint();
              return;
            }

            // Handle panning the map
            const drag = dragRef.current;
            if (drag !== null) {
              const dx = event.clientX - drag.x;
              const dy = event.clientY - drag.y;
              const size = canvasSize();
              if (size === null) return;
              if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
              panBy(viewRef.current, dx, dy, size);
              drag.x = event.clientX;
              drag.y = event.clientY;
              repaint();
              return;
            }

            // Update preview arc during placement
            if (isPlacing && draftOrigin) {
              const clampedX = Math.max(0, Math.min(RADAR_IMAGE_SIZE, pt.x));
              const clampedY = Math.max(0, Math.min(RADAR_IMAGE_SIZE, pt.y));
              setHoverWorldPoint(radarToWorld(overview, { x: clampedX, y: clampedY }));
              repaint();
            }

            // Dynamic cursor styling
            if (selectedLineup && !isPlacing) {
              const handle = findHandleUnderPoint(pt, selectedLineup, overview, scale);
              if (handle !== null) {
                setCursorStyle('grab');
                return;
              }
            }
            if (isPlacing) {
              setCursorStyle('crosshair');
            } else if (viewRef.current.zoom > 1) {
              setCursorStyle('default');
            } else {
              setCursorStyle('crosshair');
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }

            if (pointDragRef.current !== null) {
              if (
                pointDragRef.current.moved &&
                activeDrag &&
                selectedLineup &&
                onUpdatePoint !== undefined
              ) {
                const worldPoint = radarToWorld(overview, {
                  x: activeDrag.radarX,
                  y: activeDrag.radarY,
                });
                onUpdatePoint(
                  selectedLineup.id,
                  pointDragRef.current.target,
                  worldPoint,
                  pointDragRef.current.waypointIndex,
                );
              }
              pointDragRef.current = null;
              setActiveDrag(null);
              setCursorStyle('crosshair');
              repaint();
              return;
            }

            if (!dragRef.current?.moved) dragRef.current = null;
          }}
          className={`size-full bg-surface-0 ${
            cursorStyle === 'grab'
              ? 'cursor-grab'
              : cursorStyle === 'grabbing'
                ? 'cursor-grabbing'
                : 'cursor-crosshair'
          } ${zoom > 1 ? 'touch-none' : 'touch-pan-y'}`}
        />

        {/* Creation Mode floating HUD overlay */}
        {isPlacing && (
          <div className="absolute top-3 inset-x-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-card border border-primary/40 bg-surface-0/95 p-2.5 shadow-card backdrop-blur-md">
            <div className="flex items-center gap-2 text-12 text-ink">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
              <span className="font-medium text-ink">
                <Text path="library.lineups.creatingMode" />:
              </span>
              <span className="text-ink-dim">
                <Text
                  path={
                    draftOrigin === null
                      ? 'library.lineups.placeOriginPrompt'
                      : isAddingBounce
                        ? 'library.lineups.placeBouncePrompt'
                        : 'library.lineups.placeLandingPrompt'
                  }
                />
              </span>
              {draftWaypoints && draftWaypoints.length > 0 && (
                <span className="rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 font-mono text-ink-dim">
                  <Text
                    path="library.lineups.bouncesCount"
                    values={{ count: draftWaypoints.length }}
                  />
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {draftOrigin !== null && onToggleAddBounce && (
                <Button
                  variant={isAddingBounce ? 'primary' : 'secondary'}
                  onClick={onToggleAddBounce}
                  className="h-7 text-11"
                >
                  <Plus className="size-3.5" />
                  <Text path="library.lineups.addBounce" />
                </Button>
              )}
              {onCancelPlacement && (
                <Button
                  variant="ghost"
                  onClick={onCancelPlacement}
                  className="h-7 text-11 text-ink-dim hover:text-ink"
                >
                  <X className="size-3.5" />
                  <Text path="library.lineups.form.cancel" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Drag to adjust prompt when selected */}
        {selectedLineup !== null && !isPlacing && (
          <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1.5 rounded-card border border-line bg-surface-0/80 px-2.5 py-1 text-10 text-ink-dim backdrop-blur-xs">
            <GripVertical className="size-3 text-ink-dim" />
            <Text path="library.lineups.dragToAdjust" />
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-card border border-line bg-surface-0/90 p-1">
          <button
            type="button"
            onClick={() => changeZoom(1 / ZOOM_STEP)}
            disabled={zoom <= 1}
            aria-label={t('library.lineups.zoomOut')}
            className="rounded-chip p-1.5 text-ink disabled:opacity-40"
          >
            <Minus className="size-4" />
          </button>
          <span className="numeric min-w-10 text-center text-11 text-ink">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => changeZoom(ZOOM_STEP)}
            disabled={zoom >= 4}
            aria-label={t('library.lineups.zoomIn')}
            className="rounded-chip p-1.5 text-ink disabled:opacity-40"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Context Menu (Right Click ПКМ) */}
      {contextMenu !== null && (
        <div
          role="menu"
          tabIndex={-1}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 flex min-w-[12rem] flex-col gap-0.5 rounded-card border border-line bg-surface-1 p-1 text-12 shadow-card"
        >
          {selectedIds.size >= 2 && onMergeSelected && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onMergeSelected();
                setContextMenu(null);
              }}
              className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
            >
              <Layers className="size-3.5 text-primary" />
              <Text path="library.lineups.mergeSelected" values={{ count: selectedIds.size }} />
            </button>
          )}

          {contextMenu.hitWaypointIndex !== null &&
            contextMenu.hitLineup &&
            onDeleteBounceFromLineup && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (contextMenu.hitLineup && contextMenu.hitWaypointIndex !== null) {
                    onDeleteBounceFromLineup(
                      contextMenu.hitLineup.id,
                      contextMenu.hitWaypointIndex,
                    );
                  }
                  setContextMenu(null);
                }}
                className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-damage hover:bg-surface-2"
              >
                <Trash2 className="size-3.5" />
                <Text path="library.lineups.deleteBounce" />
              </button>
            )}

          {contextMenu.hitLineup && (
            <>
              {contextMenu.hitLineup.groupId && onUnmergeLineup && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (contextMenu.hitLineup) {
                      onUnmergeLineup(contextMenu.hitLineup.id);
                    }
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
                >
                  <Unlink className="size-3.5" />
                  <Text path="library.lineups.unmerge" />
                </button>
              )}

              {onAddBounceToLineup && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (contextMenu.hitLineup) {
                      onAddBounceToLineup(contextMenu.hitLineup.id);
                    }
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
                >
                  <CornerDownRight className="size-3.5" />
                  <Text path="library.lineups.addBouncePoint" />
                </button>
              )}

              {onEditLineup && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (contextMenu.hitLineup) {
                      onEditLineup(contextMenu.hitLineup);
                    }
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-ink hover:bg-surface-2"
                >
                  <Pencil className="size-3.5" />
                  <Text path="library.lineups.edit" />
                </button>
              )}

              {onDeleteLineup && !contextMenu.hitLineup.isBuiltIn && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (contextMenu.hitLineup) {
                      onDeleteLineup(contextMenu.hitLineup.id);
                    }
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 rounded-chip px-2.5 py-1.5 text-left text-damage hover:bg-surface-2"
                >
                  <Trash2 className="size-3.5" />
                  <Text path="library.lineups.delete" />
                </button>
              )}
            </>
          )}

          <div className="my-0.5 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => setContextMenu(null)}
            className="flex items-center rounded-chip px-2.5 py-1 text-left text-11 text-ink-dim hover:bg-surface-2"
          >
            <Text path="library.lineups.form.close" />
          </button>
        </div>
      )}
    </div>
  );
}

export function LineupPlate(props: LineupPlateProps) {
  const overview = getMapOverview(props.map);

  return overview === undefined ? (
    <UnknownMap map={props.map} />
  ) : (
    <LineupCanvas key={props.map} overview={overview} {...props} />
  );
}
