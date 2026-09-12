import { describe, expect, it } from 'vitest';
import { composite, contrast, parseColour, type Rgb, toHex } from '../colour';

function read(value: string): Rgb {
  const colour = parseColour(value);
  if (colour === null) throw new Error(`unreadable: ${value}`);

  return colour;
}

describe('parseColour', () => {
  it('reads a six-digit hex', () => {
    expect(read('#4fa3ff')).toEqual({ r: 0x4f / 255, g: 0xa3 / 255, b: 1, a: 1 });
  });

  it('reads the space-separated rgb the token layer writes an alpha in', () => {
    expect(read('rgb(255 255 255 / 0.06)')).toEqual({ r: 1, g: 1, b: 1, a: 0.06 });
  });

  it('refuses anything else rather than guessing at it', () => {
    expect(parseColour('color-mix(in oklab, white, black)')).toBeNull();
  });
});

describe('contrast', () => {
  it('puts black against white at the top of the scale', () => {
    expect(contrast(read('#000000'), read('#ffffff'))).toBeCloseTo(21, 5);
  });

  it('does not care which way round the pair is given', () => {
    expect(contrast(read('#fafafa'), read('#050505'))).toBeCloseTo(
      contrast(read('#050505'), read('#fafafa')),
      10,
    );
  });

  // The figure `packages/ui/src/styles/tokens.css` states for `--color-ink` on `--color-surface-0`,
  // which is what says this is the same instrument the file was measured with.
  it('reproduces the ink figure the token layer states', () => {
    expect(contrast(read('#fafafa'), read('#050505')).toFixed(2)).toBe('19.53');
  });
});

describe('composite', () => {
  it('quantises to whole bytes, because that is the colour the screen is asked for', () => {
    expect(toHex(composite(read('rgb(255 255 255 / 0.06)'), read('#0a0a0a')))).toBe('#191919');
  });

  it('leaves an opaque colour where it is', () => {
    expect(toHex(composite(read('#4fa3ff'), read('#050505')))).toBe('#4fa3ff');
  });
});
