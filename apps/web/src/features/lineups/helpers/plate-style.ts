import type { PlateLayout } from '@disa/map-data';
import type { CSSProperties } from 'react';
import type { PlatePoint } from '@/features/radar';

/** Where an element over the plate sits: percent of the layout, so it follows the plate's size. */
export function placeStyle(layout: PlateLayout, point: PlatePoint): CSSProperties {
  return {
    left: `${((point.x / layout.width) * 100).toFixed(2)}%`,
    top: `${((point.y / layout.height) * 100).toFixed(2)}%`,
  };
}
