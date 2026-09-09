import type { RadarTheme } from '@disa/map-data';
import type { Palette, Settings } from './settings';

/**
 * A *look* is the two visual axes chosen together — #339, and the owner's answer of 6 September
 * 2026 to whether a third value of each stays two settings a reader can cross.
 *
 * It is deliberately **not a stored setting**. What is remembered is still `palette` and
 * `radarTheme`, one key each, exactly as before; a look is a way of writing both at once and a way
 * of reading back which pair the reader is standing on. Storing it as well would be a third key
 * that can disagree with the two it summarises, and the disagreement would have to be resolved
 * somewhere — which is the bug this shape does not have.
 *
 * Both settings stay individually reachable for the same reason they always were: a reader who
 * wants the violet plate under the default colours can still have it. What a look does is stop that
 * being the arrangement the product offers first.
 */
export type LookId = 'default' | 'cyber';

export interface Look {
  readonly id: LookId;
  readonly palette: Palette;
  readonly radarTheme: RadarTheme;
}

export const LOOKS: readonly Look[] = [
  { id: 'default', palette: 'default', radarTheme: 'blue' },
  { id: 'cyber', palette: 'cyber', radarTheme: 'cyber' },
];

/**
 * Which look the reader is standing on, or `null` when they have crossed the two axes into a pair
 * no look names.
 *
 * `null` is a real answer rather than a gap: the colour-blind palette is one, and so is the violet
 * plate under the default colours. A control that had to pick one of the two looks there would be
 * lying about what is on screen.
 */
export function lookOf(settings: Pick<Settings, 'palette' | 'radarTheme'>): LookId | null {
  const match = LOOKS.find(
    (look) => look.palette === settings.palette && look.radarTheme === settings.radarTheme,
  );

  return match?.id ?? null;
}

export function lookById(id: LookId): Look {
  const match = LOOKS.find((look) => look.id === id);
  if (match === undefined) throw new Error(`No look called ${id}.`);

  return match;
}
