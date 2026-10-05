/**
 * What a radar image is dimmed to under a field: a share of its own brightness, so the map reads
 * as a drawing of the ground and the field is the only thing on the plate with a colour.
 */
const MUTED_LEVEL = 0.6;

const CHANNELS = 4;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;

const MUTED = new WeakMap<HTMLImageElement, HTMLCanvasElement>();

/**
 * A greyscale, darker copy of a radar image, made once per image.
 *
 * It is a copy rather than a `filter` on the context because `CanvasRenderingContext2D.filter` is
 * missing from Safari, and a blend over the plate would paint grey onto its transparent corners.
 * The cost is one pass over a 1024 px image, paid when the plate's images arrive and never in a draw.
 */
export function mutedImage(image: HTMLImageElement): HTMLCanvasElement {
  const known = MUTED.get(image);
  if (known !== undefined) return known;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d');
  if (context === null) throw new Error('The browser gave no 2D context for the radar image.');

  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = pixels;

  for (let at = 0; at < data.length; at += CHANNELS) {
    const level =
      ((data[at] ?? 0) * RED_WEIGHT +
        (data[at + 1] ?? 0) * GREEN_WEIGHT +
        (data[at + 2] ?? 0) * BLUE_WEIGHT) *
      MUTED_LEVEL;

    data[at] = level;
    data[at + 1] = level;
    data[at + 2] = level;
  }

  context.putImageData(pixels, 0, 0);
  MUTED.set(image, canvas);

  return canvas;
}
