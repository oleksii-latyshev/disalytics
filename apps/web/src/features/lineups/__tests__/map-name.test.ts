import { describe, expect, it } from 'vitest';
import { mapName } from '../helpers/map-name';

describe('mapName', () => {
  it('drops the game prefix and capitalises', () => {
    expect([mapName('de_dust2'), mapName('de_mirage')]).toEqual(['Dust2', 'Mirage']);
  });

  it('leaves a name without the prefix as it is, capitalised', () => {
    expect(mapName('cs_office')).toBe('Cs_office');
  });
});
