import type { Lineup, WorldPoint } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { MapOverview, PlateLayout } from '@disa/map-data';
import { gapUnits, platePointOf } from '../../helpers/plate-point';

export type PointName = 'origin' | 'landing';

const ORIGIN_RADIUS = 13;
const LANDING_RADIUS = 18;
const RING_RADIUS = 34;
const EDGE = 20;

interface Props {
  overview: MapOverview;
  layout: PlateLayout;
  /** The map's other lineups on the site: faint, dashed, never in the way. */
  stored: readonly Lineup[];
  /** The site's version of the lineup being looked at, dashed and clear. */
  counterpart: Lineup | null;
  /** The lineup being looked at, solid, in the colour of what is going to happen to it. */
  current: Lineup | null;
  color: string;
  invalid: readonly PointName[];
}

/** A point kept on the visible plate, so one far off the map is still drawn where it can be reached. */
export function visiblePoint(
  overview: MapOverview,
  layout: PlateLayout,
  point: WorldPoint,
): { x: number; y: number } {
  const plate = platePointOf(overview, point);
  return {
    x: Math.min(layout.width - EDGE, Math.max(EDGE, plate.x)),
    y: Math.min(layout.height - EDGE, Math.max(EDGE, plate.y)),
  };
}

function Arrow({
  overview,
  layout,
  lineup,
  color,
  dashed,
  solid,
}: {
  overview: MapOverview;
  layout: PlateLayout;
  lineup: Lineup;
  color: string;
  dashed: boolean;
  solid: boolean;
}) {
  const from = visiblePoint(overview, layout, lineup.origin);
  const to = visiblePoint(overview, layout, lineup.landing);
  const dash = dashed ? '7 6' : undefined;
  return (
    <g stroke={color}>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        strokeWidth={solid ? 3 : 2}
        strokeDasharray={dash}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={from.x}
        cy={from.y}
        r={ORIGIN_RADIUS}
        fill={solid ? 'var(--color-surface-0)' : 'none'}
        strokeWidth={solid ? 3 : 2}
        strokeDasharray={dash}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={to.x}
        cy={to.y}
        r={LANDING_RADIUS}
        fill={solid ? color : 'none'}
        fillOpacity={0.3}
        strokeWidth={solid ? 3 : 2}
        strokeDasharray={dashed ? '4 3' : undefined}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function Gap({
  overview,
  layout,
  from,
  to,
}: {
  overview: MapOverview;
  layout: PlateLayout;
  from: WorldPoint;
  to: WorldPoint;
}) {
  const t = useT();
  const units = gapUnits(from, to);
  if (units < 1) return null;
  const b = visiblePoint(overview, layout, to);
  return (
    <text
      // Beside the file's mark, past its ring: the two marks are often a few pixels apart.
      x={b.x + 26}
      y={b.y - 22}
      fill="var(--color-ink)"
      fontSize={22}
      className="numeric"
      paintOrder="stroke"
      stroke="var(--color-surface-0)"
      strokeWidth={5}
    >
      {t('admin.map.gap', { units: Math.round(units) })}
    </text>
  );
}

/**
 * The lineups of the map as marks over the plate. It is drawn once into SVG and does not take
 * pointer events, so a press on the map reaches the plate underneath it.
 */
export function MapMarks({
  overview,
  layout,
  stored,
  counterpart,
  current,
  color,
  invalid,
}: Props) {
  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-1 size-full"
    >
      <g opacity={0.35}>
        {stored.map((lineup) => (
          <Arrow
            key={lineup.id}
            overview={overview}
            layout={layout}
            lineup={lineup}
            color="var(--status-stored)"
            dashed
            solid={false}
          />
        ))}
      </g>
      {counterpart === null ? null : (
        <Arrow
          overview={overview}
          layout={layout}
          lineup={counterpart}
          color="var(--status-stored)"
          dashed
          solid={false}
        />
      )}
      {current === null ? null : (
        <>
          <Arrow
            overview={overview}
            layout={layout}
            lineup={current}
            color={color}
            dashed={false}
            solid
          />
          {counterpart === null ? null : (
            <>
              <Gap
                overview={overview}
                layout={layout}
                from={counterpart.origin}
                to={current.origin}
              />
              <Gap
                overview={overview}
                layout={layout}
                from={counterpart.landing}
                to={current.landing}
              />
            </>
          )}
          {invalid.map((name) => {
            const at = visiblePoint(overview, layout, current[name]);
            return (
              <circle
                key={name}
                cx={at.x}
                cy={at.y}
                r={RING_RADIUS}
                fill="none"
                stroke="var(--status-invalid)"
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </>
      )}
    </svg>
  );
}
