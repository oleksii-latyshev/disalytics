import { DEFAULT_RADAR_THEME, type RadarTheme } from '@disa/map-data';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

/** The colour set the document's tokens resolve to; it is the cache key of `radarColors`. */
export type Palette = 'default' | 'colour-blind' | 'cyber';

/** Which grenade paths a plate draws: every one in flight, the selected player's, or none. */
export type TrajectoryVisibility = 'flight' | 'selected' | 'off';

export interface PlateSettings {
  readonly palette: Palette;
  readonly radarTheme: RadarTheme;
  /**
   * Where the unhashed `/radar/` images are served from, ending in a slash. A different origin
   * than the page's own is allowed; the images are drawn, never read back.
   */
  readonly imageBase: string;
  /** The `crossOrigin` the radar images are requested with; omitted, the request is a plain one. */
  readonly imageCrossOrigin?: 'anonymous' | 'use-credentials' | undefined;
}

export const DEFAULT_PLATE_SETTINGS: PlateSettings = {
  palette: 'default',
  radarTheme: DEFAULT_RADAR_THEME,
  imageBase: '/',
};

const PlateSettingsContext = createContext<PlateSettings>(DEFAULT_PLATE_SETTINGS);

interface ProviderProps extends Partial<PlateSettings> {
  children: ReactNode;
}

/**
 * What a plate needs from the app around it, so the package never imports an app's settings store.
 * Anything left out takes its default, so a host that wants the defaults needs no provider at all.
 */
export function PlateSettingsProvider({
  palette = DEFAULT_PLATE_SETTINGS.palette,
  radarTheme = DEFAULT_PLATE_SETTINGS.radarTheme,
  imageBase = DEFAULT_PLATE_SETTINGS.imageBase,
  imageCrossOrigin,
  children,
}: ProviderProps) {
  const value = useMemo(
    () => ({ palette, radarTheme, imageBase, imageCrossOrigin }),
    [palette, radarTheme, imageBase, imageCrossOrigin],
  );

  return <PlateSettingsContext value={value}>{children}</PlateSettingsContext>;
}

export function usePlateSettings(): PlateSettings {
  return useContext(PlateSettingsContext);
}
