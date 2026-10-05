import type { Lineup, WorldPoint } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { MapOverview, PlateLayout } from '@disa/map-data';
import { useRef } from 'react';
import type { PointMove } from '../helpers/lineup-move';
import { isNudgeKey, nudgedPoint } from '../helpers/nudge-point';
import { altitudeOnDrop, platePointOf, worldPointAt } from '../helpers/plate-point';
import { placeStyle } from '../helpers/plate-style';

type Target = PointMove['target'];

interface Handle {
  readonly key: string;
  readonly target: Target;
  readonly waypointIndex?: number;
  readonly point: WorldPoint;
}

interface Props {
  overview: MapOverview;
  layout: PlateLayout;
  /** The lineup being edited, as it is now — a move in progress included. */
  lineup: Lineup;
  /** The id of the text that says how to move a handle. */
  describedBy: string;
  onMove: (move: PointMove) => void;
  /** The move is over: a pointer let go, or an arrow key was. */
  onCommit: (move: PointMove) => void;
}

const BASE =
  'absolute z-9 grid -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none place-items-center border-2 border-ink active:cursor-grabbing';

function handlesOf(lineup: Lineup): readonly Handle[] {
  return [
    { key: 'origin', target: 'origin', point: lineup.origin },
    { key: 'landing', target: 'landing', point: lineup.landing },
    ...(lineup.waypoints ?? []).map((point, waypointIndex) => ({
      key: `waypoint-${waypointIndex}`,
      target: 'waypoint' as const,
      waypointIndex,
      point,
    })),
  ];
}

/**
 * The points of the lineup being edited, as things to take hold of. Each is a button, so a pointer
 * drags it and a keyboard moves it with the arrow keys — a pixel, or eight with Shift.
 *
 * A move is reported as it happens, so the arc follows, and committed when it ends: the press is
 * released, or the arrow key is. What is stored is only ever where a handle was let go.
 */
export function LineupEditHandles({
  overview,
  layout,
  lineup,
  describedBy,
  onMove,
  onCommit,
}: Props) {
  const t = useT();
  const pending = useRef<PointMove | null>(null);

  const moveTo = (handle: Handle, point: PointMove['point']) => {
    const move: PointMove = {
      lineupId: lineup.id,
      target: handle.target,
      ...(handle.waypointIndex === undefined ? {} : { waypointIndex: handle.waypointIndex }),
      point,
    };
    pending.current = move;
    onMove(move);
  };

  const finish = () => {
    const move = pending.current;
    pending.current = null;
    if (move !== null) onCommit(move);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>, handle: Handle) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || box.height === 0) return;

    const plate = {
      x: Math.min(
        Math.max(((event.clientX - box.left) / box.width) * layout.width, 0),
        layout.width,
      ),
      y: Math.min(
        Math.max(((event.clientY - box.top) / box.height) * layout.height, 0),
        layout.height,
      ),
    };
    const world = worldPointAt(overview, plate);
    const z = altitudeOnDrop(overview, plate);

    moveTo(handle, { x: world.x, y: world.y, ...(z === undefined ? {} : { z }) });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, handle: Handle) => {
    if (!isNudgeKey(event.key)) return;
    event.preventDefault();

    const next = nudgedPoint(overview, handle.point, event.key, event.shiftKey);
    moveTo(handle, { x: next.x, y: next.y });
  };

  return (
    <>
      {handlesOf(lineup).map((handle) => {
        const isBounce = handle.target === 'waypoint';
        const label =
          handle.target === 'origin'
            ? t('library.lineups.selectedOrigin')
            : handle.target === 'landing'
              ? t('library.lineups.selectedLanding')
              : t('library.lineups.selectedBounce', { index: (handle.waypointIndex ?? 0) + 1 });

        return (
          <button
            key={handle.key}
            type="button"
            aria-label={label}
            aria-describedby={describedBy}
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
            style={placeStyle(layout, platePointOf(overview, handle.point))}
            onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
            onPointerMove={(event) => handlePointerMove(event, handle)}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              finish();
            }}
            onPointerCancel={finish}
            onKeyDown={(event) => handleKeyDown(event, handle)}
            onKeyUp={(event) => {
              if (isNudgeKey(event.key)) finish();
            }}
            onBlur={finish}
            className={
              isBounce
                ? `${BASE} numeric size-5 rounded-chip bg-surface-0 font-semibold text-10 text-ink`
                : `${BASE} rounded-full border-dashed ${handle.target === 'origin' ? 'size-10' : 'size-11'}`
            }
          >
            {isBounce ? (handle.waypointIndex ?? 0) + 1 : null}
          </button>
        );
      })}
    </>
  );
}
