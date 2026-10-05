import { describe, expect, it } from 'vitest';
import {
  calloutLabel,
  type NameableTarget,
  nameLineups,
  originTitle,
  targetTitle,
} from '../helpers/lineup-names';

function variant(id: string, origin: { x: number; y: number }) {
  return { id, origin: { ...origin, z: 0 } };
}

const xbox: NameableTarget = {
  id: 'smoke:-457:1602',
  kind: 'smoke',
  landing: { x: -457, y: 1602, z: 0 },
  variants: [variant('b-doors', { x: -1250, y: 2280 }), variant('nowhere', { x: 9000, y: 9000 })],
};

describe('nameLineups', () => {
  const names = nameLineups('de_dust2', [xbox]).get(xbox.id);

  it('names the landing and every origin by callout, and says what it could not name', () => {
    expect(names?.target).toEqual({ name: 'Xbox', isApproximate: false });
    expect(names?.origins.get('b-doors')?.name).toBe('B Doors');
    expect(names?.origins.get('nowhere')).toBeNull();
  });

  it('keeps one lower-case string to search, with the kind and the origins in it', () => {
    expect(names?.searchText).toBe('xbox smoke b doors');
  });

  it('titles a target and an origin, falling back to the given word', () => {
    if (names === undefined) throw new Error('expected names');
    const [first, second] = xbox.variants;
    if (first === undefined || second === undefined) throw new Error('expected variants');

    expect(targetTitle(xbox, names, 'Unnamed')).toBe('Smoke · Xbox');
    expect(originTitle(first, names, 'Unnamed')).toBe('B Doors');
    expect(originTitle(second, names, 'Unnamed')).toBe('Unnamed');
  });
});

describe('calloutLabel', () => {
  it('marks an approximate callout with a leading ≈', () => {
    expect(calloutLabel({ name: 'A Long', isApproximate: true })).toBe('≈ A Long');
    expect(calloutLabel({ name: 'A Long', isApproximate: false })).toBe('A Long');
    expect(calloutLabel(null)).toBeNull();
  });
});
