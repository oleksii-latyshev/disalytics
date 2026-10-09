import { useT } from '@disa/i18n';
import {
  type MapOverview,
  type PlateLayout,
  plateLayout,
  type RadarTheme,
  radarAssetPath,
} from '@disa/map-data';
import { useMemo } from 'react';
import { type RadarImagesState, useRadarImages } from './use-radar-image';

export interface RadarPlate {
  readonly layout: PlateLayout;
  readonly images: RadarImagesState;
  /** The name of each floor in slot order, which a one-floor map never draws. */
  readonly floorLabels: readonly string[];
}

/** What every plate that draws a whole map needs to put the backdrop under its marks. */
export function useRadarPlate(overview: MapOverview, theme: RadarTheme): RadarPlate {
  const t = useT();

  const layout = plateLayout(overview);
  const images = useRadarImages(overview.levels.map((level) => radarAssetPath(level, theme)));

  const upper = t('radar.floor.upper');
  const lower = t('radar.floor.lower');
  const floorLabels = useMemo(
    () => layout.slots.map((slot) => (slot.floor === 'lower' ? lower : upper)),
    [layout, upper, lower],
  );

  return { layout, images, floorLabels };
}
