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

type PictureOptions = Pick<HeatLayerOptions, 'plate' | 'view'>;

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

export function fieldPicture(field: HeatField, identity: HeatIdentity): HeatPicture {
  return (colors, { plate, view }) =>
    heatLayer({ image: fieldImage(field, colors, identity), plate, view });
}

export function differencePicture(difference: HeatDifference): HeatPicture {
  return (colors, { plate, view }) =>
    heatLayer({ image: differenceImage(difference, colors), plate, view });
}

export function ringPicture(marks: HeatRings, identity: HeatIdentity): HeatPicture {
  return (colors, { plate, view }) =>
    ringLayer({
      marks,
      plate,
      colour: ringColour(identity, colors),
      outline: colors.hollow,
      view,
    });
}
