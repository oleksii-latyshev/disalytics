import type { Palette } from '@/core/settings';
import { readCssToken } from '@/shared/lib';

/** The colour of each of the five slots, as the document resolves `--color-tactic-1..5` now. */
export type SlotColors = readonly string[];

const SLOT_TOKENS = [
  '--color-tactic-1',
  '--color-tactic-2',
  '--color-tactic-3',
  '--color-tactic-4',
  '--color-tactic-5',
] as const;

const SLOT_VARS = SLOT_TOKENS.map((token) => `var(${token})`);

let cached: { readonly palette: Palette; readonly colors: SlotColors } | null = null;

/** Held until the palette changes, so the layer array is not rebuilt by a fresh array each render. */
export function slotColors(palette: Palette): SlotColors {
  if (cached !== null && cached.palette === palette) return cached.colors;
  const colors = SLOT_TOKENS.map((token) => readCssToken(token));
  cached = { palette, colors };
  return colors;
}

/** A slot's colour as a CSS value for markup: the token itself, so it follows the palette. */
export function slotVar(slot: number): string {
  return SLOT_VARS[slot % SLOT_VARS.length] ?? SLOT_VARS[0] ?? '';
}
