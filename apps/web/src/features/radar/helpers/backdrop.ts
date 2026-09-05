import { RADAR_IMAGE_SIZE } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import { type PlateView, plateGeometry, readPlateGeometry } from './view';

/**
 * The map itself, under everything. It is drawn at the reader's zoom rather than scaled by CSS, so
 * every mark above it stays on a device pixel — DESIGN.md §6.3. The image is 1024px square, so past
 * about 1.4× the plate is enlarging it rather than resolving more of it; that is the asset's
 * ceiling and not the renderer's.
 */
export function radarBackdrop(
  image: HTMLImageElement,
  view: { readonly current: PlateView },
): Layer {
  // Allocated with the layer and rewritten in place, because this is read once per animation frame.
  const geometry = plateGeometry();

  return (context, size) => {
    readPlateGeometry(view.current, size, RADAR_IMAGE_SIZE, geometry);

    // The image *is* the map, so its side on the canvas is the map's own extent: `scale` is CSS
    // pixels per radar pixel and the asset is `RADAR_IMAGE_SIZE` of them across. Reading it from
    // the geometry rather than from `size` is what lets the plate be wider than the map it holds.
    const extent = geometry.scale * RADAR_IMAGE_SIZE;

    context.drawImage(image, geometry.offsetX, geometry.offsetY, extent, extent);
  };
}
