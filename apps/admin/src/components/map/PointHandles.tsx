import type { Lineup, WorldPoint } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { MapOverview, PlateLayout } from '@disa/map-data';
import { useRef } from 'react';
import { isNudgeKey, nudgedPoint } from '../../helpers/nudge';
import { worldPointAt } from '../../helpers/plate-point';
import { type PointName, visiblePoint } from './MapMarks';

interface Props {
  overview: MapOverview;
  layout: PlateLayout;
  lineup: Lineup;
  /** A move is under way: the point follows the pointer without the page being asked to render. */
  onMove: (name: PointName, point: WorldPoint) => void;
  /** The pointer was let go, or an arrow key was. */
  onCommit: (name: PointName, point: WorldPoint) => void;
}

const NAMES: readonly PointName[] = ['origin', 'landing'];

/**
 * The two points of the lineup as things to take hold of. A pointer drags them; with the keyboard an
 * arrow moves one a radar pixel, and eight with Shift.
 */
export function PointHandles({ overview, layout, lineup, onMove, onCommit }: Props) {
  const t = useT();
  const pending = useRef<{ name: PointName; point: WorldPoint } | null>(null);

  const finish = () => {
    const move = pending.current;
    pending.current = null;
    if (move !== null) onCommit(move.name, move.point);
  };

  const moveTo = (name: PointName, point: WorldPoint) => {
    pending.current = { name, point };
    onMove(name, point);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>, name: PointName) => {
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
    moveTo(name, worldPointAt(overview, plate, lineup[name]));
  };

  return (
    <>
      {NAMES.map((name) => {
        const at = visiblePoint(overview, layout, lineup[name]);
        return (
          <button
            key={name}
            type="button"
            aria-label={t(name === 'origin' ? 'admin.map.moveOrigin' : 'admin.map.moveLanding')}
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
            style={{
              left: `${((at.x / layout.width) * 100).toFixed(2)}%`,
              top: `${((at.y / layout.height) * 100).toFixed(2)}%`,
            }}
            onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
            onPointerMove={(event) => handlePointerMove(event, name)}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              finish();
            }}
            onPointerCancel={finish}
            onKeyDown={(event) => {
              if (!isNudgeKey(event.key)) return;
              event.preventDefault();
              moveTo(name, nudgedPoint(overview, lineup[name], event.key, event.shiftKey));
            }}
            onKeyUp={(event) => {
              if (isNudgeKey(event.key)) finish();
            }}
            onBlur={finish}
            className="absolute z-9 size-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-dashed border-ink bg-transparent active:cursor-grabbing"
          />
        );
      })}
    </>
  );
}
