export const RADAR_THEMES = ['vanilla', 'blue'] as const;
export type RadarTheme = (typeof RADAR_THEMES)[number];

export const DEFAULT_RADAR_THEME: RadarTheme = 'blue';

export function isRadarTheme(value: string): value is RadarTheme {
  return (RADAR_THEMES as readonly string[]).includes(value);
}

/**
 * Where a level's image sits inside this package's `assets/`. The consumer owns the base it is
 * resolved against — these files are served as static assets and never enter the JS graph.
 */
export function radarAssetPath(level: { readonly image: string }, theme: RadarTheme): string {
  return `radar/${theme}/${level.image}.png`;
}
