import type { PlateLayout } from '@disa/map-data';
import { useId } from 'react';
import { UTILITY_INK } from '@/core/glyphs';
import type { OverlayPlot } from '../helpers/lineup-overlay';

const UNDER_WIDTH_PX = 4;
const UNDER_ACTIVE_WIDTH_PX = 7;
const ARC_WIDTH_PX = 1.5;
const ARC_ACTIVE_WIDTH_PX = 3;
const REVEAL_WIDTH_PX = 12;
const DASH = '4 6';
const ACTIVE_DASH = '10 7';
const INACTIVE_OPACITY = 0.5;
const LANDING_FILL_OPACITY = 0.2;
const LANDING_RING_WIDTH_PX = 2;

interface Props {
  layout: PlateLayout;
  plot: OverlayPlot;
  /** Changes when the plot is another one rather than the same one moved, so it draws itself again. */
  plotKey: string;
  /** Whether the arcs are drawn in along their length as they arrive. */
  isRevealed: boolean;
}

/**
 * What the picked target covers and how it is thrown, over the map: a ring that breathes where it
 * lands, and an arc from every position to it — the active one drawn in, with dashes marching
 * towards the landing.
 *
 * It is SVG with CSS animation rather than canvas, so nothing here draws per frame: the browser
 * runs the motion, and `motion.css` takes all of it to rest under reduced motion.
 */
export function LineupSelectionOverlay({ layout, plot, plotKey, isRevealed }: Props) {
  const maskId = useId();

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-1 size-full"
    >
      {plot.landing !== null && (
        <circle
          key={`ring-${plotKey}`}
          cx={plot.landing.x}
          cy={plot.landing.y}
          r={plot.radiusPlatePx}
          fillOpacity={LANDING_FILL_OPACITY}
          strokeWidth={LANDING_RING_WIDTH_PX}
          className={`lineup-breathe fill-current stroke-current ${UTILITY_INK[plot.kind]}`}
        />
      )}

      {plot.arcs.map((arc, index) => {
        const id = `${maskId}-${index}`;

        return (
          <g
            key={`${plotKey}:${arc.id}`}
            mask={isRevealed && arc.isActive ? `url(#${id})` : undefined}
            opacity={arc.isActive ? 1 : INACTIVE_OPACITY}
          >
            {isRevealed && arc.isActive && (
              <mask
                id={id}
                maskUnits="userSpaceOnUse"
                x={0}
                y={0}
                width={layout.width}
                height={layout.height}
              >
                <path
                  d={arc.path}
                  pathLength={1}
                  fill="none"
                  stroke="white"
                  strokeWidth={REVEAL_WIDTH_PX}
                  strokeLinecap="round"
                  className="lineup-draw"
                />
              </mask>
            )}
            <path
              d={arc.path}
              fill="none"
              strokeLinecap="round"
              strokeWidth={arc.isActive ? UNDER_ACTIVE_WIDTH_PX : UNDER_WIDTH_PX}
              className="stroke-surface-0"
            />
            <path
              d={arc.path}
              fill="none"
              strokeLinecap="round"
              strokeWidth={arc.isActive ? ARC_ACTIVE_WIDTH_PX : ARC_WIDTH_PX}
              strokeDasharray={arc.isActive ? ACTIVE_DASH : DASH}
              className={`stroke-ink ${arc.isActive ? 'lineup-march' : ''}`}
            />
          </g>
        );
      })}
    </svg>
  );
}
