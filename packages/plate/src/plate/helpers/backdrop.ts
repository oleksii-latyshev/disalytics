import { type PlateLayout, SQUARE_PLATE_LAYOUT } from '@disa/map-data';
import type { Layer } from '../../renderer/helpers/canvas';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

const FLOOR_LABEL_FONT = '600 11px Onest, sans-serif';
const FLOOR_LABEL_INSET_PX = 8;

export interface RadarBackdropOptions {
  /** One decoded image per level, in the order of the layout's slots. */
  readonly images: readonly CanvasImageSource[];
  readonly layout: PlateLayout;
  /** The name of each floor, in slot order — read only where the layout names its floors. */
  readonly floorLabels: readonly string[];
  readonly labelColor: string;
  readonly view: { readonly current: PlateView };
}

/**
 * The map itself, under everything. It is drawn at the reader's zoom rather than scaled by CSS, so
 * every mark above it stays on a device pixel — DESIGN.md §6.3. The images are 1024px square, so
 * past about 1.4× the plate is enlarging them rather than resolving more of them; that is the
 * asset's ceiling and not the renderer's.
 *
 * Each level's image is cropped to the slot the layout gives it, and a map with more than one is
 * drawn stacked, every floor named at its upper-left corner.
 */
export function radarBackdrop(options: RadarBackdropOptions): Layer {
  const { images, layout, floorLabels, labelColor, view } = options;

  // Allocated with the layer and rewritten in place, because this is read once per animation frame.
  const geometry = plateGeometry();

  return (context, size) => {
    readPlateGeometry(view.current, size, layout, geometry);

    const { scale, offsetX, offsetY } = geometry;

    for (let index = 0; index < layout.slots.length; index++) {
      const slot = layout.slots[index];
      const image = images[index];
      if (slot === undefined || image === undefined) continue;

      context.drawImage(
        image,
        slot.cropX,
        slot.cropY,
        slot.width,
        slot.height,
        offsetX + slot.x * scale,
        offsetY + slot.y * scale,
        slot.width * scale,
        slot.height * scale,
      );
    }

    if (layout.slots.length < 2) return;

    context.font = FLOOR_LABEL_FONT;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillStyle = labelColor;

    for (let index = 0; index < layout.slots.length; index++) {
      const slot = layout.slots[index];
      const label = floorLabels[index];
      if (slot === undefined || label === undefined) continue;

      context.fillText(
        label,
        offsetX + slot.x * scale + FLOOR_LABEL_INSET_PX,
        offsetY + slot.y * scale + FLOOR_LABEL_INSET_PX,
      );
    }
  };
}

/** One image on its own square plate, for a view that is not of a match's map and names no floor. */
export function squareBackdrop(
  image: HTMLImageElement,
  view: { readonly current: PlateView },
): Layer {
  return radarBackdrop({
    images: [image],
    layout: SQUARE_PLATE_LAYOUT,
    floorLabels: [],
    labelColor: '',
    view,
  });
}
