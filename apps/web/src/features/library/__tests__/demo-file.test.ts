import { describe, expect, it } from 'vitest';
import { carriesFiles } from '../helpers/demo-file';

describe('carriesFiles', () => {
  it('is true for a drag from the desktop', () => {
    expect(carriesFiles(['Files'])).toBe(true);
    expect(carriesFiles(['text/plain', 'Files'])).toBe(true);
  });

  it('is false for a tile being rearranged, and for nothing', () => {
    expect(carriesFiles(['text/plain'])).toBe(false);
    expect(carriesFiles([])).toBe(false);
    expect(carriesFiles(undefined)).toBe(false);
  });
});
