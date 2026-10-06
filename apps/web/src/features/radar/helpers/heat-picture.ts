import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import type { HeatDifference } from './heat-difference';
import type { HeatField, HeatRings } from './heat-field';
import {
  differenceImage,
  fieldImage,
  type HeatLayerOptions,
  heatLayer,
  ringLayer,
} from './heat-layer';
import type { HeatIdentity } from './heat-ramp';

/** Which of two compared players' layers an overlay draws. */
export interface HeatShown {
  readonly first: boolean;
  readonly second: boolean;
}

export const BOTH_SHOWN: HeatShown = { first: true, second: true };

type PictureOptions = Pick<HeatLayerOptions, 'plate' | 'view'> & {
  /** Read by an overlay only; a picture of one player has nobody to hide. */
  readonly shown?: HeatShown;
};

/**
 * What a heat plate draws over its map, as the layer it will be once it knows the plate it is on and
 * the colours of the palette: a field, a field's difference, or where things happened.
 *
 * **It is a function and not the data it was made from, on purpose.** The field is a quarter of a
 * million floats, and a prop that holds one is walked key by key by React's development tooling
 * every time it changes — measured at 0.5 s a press. A closure holds the same arrays where nothing
 * enumerates them, and the image is painted from them once, when the layer is built.
 */
export type HeatPicture = (colors: RadarColors, options: PictureOptions) => Layer;

function ringColour(identity: HeatIdentity, colors: RadarColors): string {
  if (identity === 'first') return colors.heat.high;

  return identity === 'second' ? colors.heat.second : colors.selectionRing;
}

/**
 * A field's image is painted when a picture is first drawn with a palette and kept: hiding a
 * player in an overlay changes what is drawn and not what it is drawn from, and repainting a
 * quarter-million bins for an eye would be a cost nobody asked for.
 */
function once<T extends object, R>(make: (key: T) => R): (key: T) => R {
  const made = new WeakMap<T, R>();

  return (key) => {
    const known = made.get(key);
    if (known !== undefined) return known;

    const fresh = make(key);
    made.set(key, fresh);

    return fresh;
  };
}

export function fieldPicture(
  field: HeatField,
  identity: HeatIdentity,
  isHatched = false,
): HeatPicture {
  const imageOf = once((colors: RadarColors) => fieldImage(field, colors, identity, isHatched));

  return (colors, { plate, view }) => heatLayer({ image: imageOf(colors), plate, view });
}

export function differencePicture(difference: HeatDifference): HeatPicture {
  return (colors, { plate, view }) =>
    heatLayer({ image: differenceImage(difference, colors), plate, view });
}

export function ringPicture(
  marks: HeatRings,
  identity: HeatIdentity,
  isDashed = false,
): HeatPicture {
  return (colors, { plate, view }) =>
    ringLayer({
      marks,
      plate,
      colour: ringColour(identity, colors),
      outline: colors.hollow,
      isDashed,
      view,
    });
}

/**
 * Two players on one plate: the first underneath and solid, the second over it and striped (or
 * dashed, for rings), each only while it is shown. The two layers are built once per palette and
 * the draw is one or two `drawImage` calls, so a press on an eye repaints and builds nothing.
 */
export function overlayPicture(first: HeatPicture, second: HeatPicture): HeatPicture {
  return (colors, options) => {
    const shown = options.shown ?? BOTH_SHOWN;
    const under = first(colors, options);
    const over = second(colors, options);

    return (context, size) => {
      if (shown.first) under(context, size);
      if (shown.second) over(context, size);
    };
  };
}
