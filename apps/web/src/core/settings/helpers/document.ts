import type { MotionPreference, Palette, Settings } from './settings';

/**
 * Attributes the whole document answers to, and the two that exist are the two a preference cannot
 * express as a prop: a token swap the canvas reads out of the computed style, and a motion reset
 * that has to beat every author transition in the product.
 */
export interface DocumentSettings {
  /** `null` leaves `docs/DESIGN.md` §2.4's default data colours in place. */
  readonly palette: string | null;
  /** `null` leaves the answer to `prefers-reduced-motion`. */
  readonly motionReduce: string | null;
}

export const PALETTE_ATTRIBUTE = 'data-palette';
export const MOTION_ATTRIBUTE = 'data-motion-reduce';

function paletteAttribute(palette: Palette): string | null {
  return palette === 'default' ? null : palette;
}

function motionAttribute(motion: MotionPreference): string | null {
  if (motion === 'reduced') return 'on';

  return motion === 'full' ? 'off' : null;
}

export function documentSettings(settings: Settings): DocumentSettings {
  return {
    palette: paletteAttribute(settings.palette),
    motionReduce: motionAttribute(settings.motion),
  };
}

function write(element: Element, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(name, value);
}

/**
 * Written outside React on purpose. The plate reads its colours out of the computed style, so the
 * attribute has to be on the document before the render that re-reads them — an effect runs after
 * that render and would paint one frame of the palette the reader just left.
 */
export function applyDocumentSettings(settings: Settings): void {
  if (typeof document === 'undefined') return;

  const applied = documentSettings(settings);
  const root = document.documentElement;

  write(root, PALETTE_ATTRIBUTE, applied.palette);
  write(root, MOTION_ATTRIBUTE, applied.motionReduce);
}
