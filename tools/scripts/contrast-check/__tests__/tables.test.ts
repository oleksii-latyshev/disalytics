import { describe, expect, it } from 'vitest';
import { readTokenLayer, tokenValue } from '../tables';

const SOURCE = `@theme static {
  /* Three ink levels:

                surface-0   surface-1
       ink          19.53       18.97

     Prose that is not a row. */
  --color-ink: #fafafa;
  --color-surface-0: #050505;
  --color-surface-1: #0a0a0a;

  /* Two palettes at once:

                        default              colour-blind
                    surface-0  surface-1   surface-0  surface-1
       ct               7.78       7.56        8.10       7.87

     The floor across all four is **7.56**, which follows its own table. */
  --color-ct: #4fa3ff;
}

:root[data-palette="colour-blind"] {
  --color-ct: #5aa9ff;
}
`;

const layer = readTokenLayer(SOURCE);

describe('readTokenLayer', () => {
  it('finds a table per header and stops at the prose under it', () => {
    expect(layer.tables).toHaveLength(2);
    expect(layer.tables[0]?.rows).toHaveLength(1);
    expect(layer.tables[0]?.rows[0]).toMatchObject({ name: 'ink', cells: ['19.53', '18.97'] });
  });

  it('spreads the palette groups above a header across its columns', () => {
    expect(layer.tables[1]?.columns.map((column) => `${column.palette}/${column.name}`)).toEqual([
      'default/surface-0',
      'default/surface-1',
      'colour-blind/surface-0',
      'colour-blind/surface-1',
    ]);
  });

  it('puts every column of an ungrouped table in the default palette', () => {
    expect(layer.tables[0]?.columns.every((column) => column.palette === 'default')).toBe(true);
  });

  it('attaches a floor claim to the table it follows', () => {
    expect(layer.floors).toEqual([expect.objectContaining({ value: '7.56', tableIndex: 1 })]);
  });
});

describe('tokenValue', () => {
  it('reads an override the palette states', () => {
    expect(tokenValue(layer, '--color-ct', 'colour-blind')).toBe('#5aa9ff');
  });

  it('falls back to the default the palettes are a swap over', () => {
    expect(tokenValue(layer, '--color-ink', 'colour-blind')).toBe('#fafafa');
  });
});

describe('the column vocabulary', () => {
  it('names a composite table by what its columns mean', () => {
    const composites = readTokenLayer(`@theme static {
  /* Interaction:

                    composite    ink  ink-dim
       hover          #191919  16.84     6.80
  */
  --color-hover: rgb(255 255 255 / 0.06);
}
`);

    expect(composites.tables[0]?.columns.map((column) => column.kind)).toEqual([
      'composite',
      'ink',
      'ink',
    ]);
  });
});
