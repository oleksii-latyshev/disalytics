import type { Layer } from '@/core/renderer';
import type { PlateView } from './view';

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
  return (context, size) => {
    const { zoom, panX, panY } = view.current;

    context.drawImage(image, panX, panY, size.width * zoom, size.height * zoom);
  };
}
