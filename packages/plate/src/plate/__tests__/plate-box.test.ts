import { describe, expect, it } from 'vitest';
import { plateBox } from '../helpers/plate-box';

describe('plateBox', () => {
  it('is the smaller of the two axes for a square plate', () => {
    const box = plateBox({ width: 1024, height: 1024 });

    expect(box.style).toEqual({ aspectRatio: '1024 / 1024', width: 'min(100cqi, 100cqb)' });
    expect(box.height).toBe('calc(min(100cqi, 100cqb) * 1)');
  });

  it('lets a tall plate take the cell height times its ratio, and no more than the width', () => {
    const box = plateBox({ width: 500, height: 1000 });

    expect(box.width).toBe('min(100cqi, 50cqb)');
    expect(box.height).toBe('calc(min(100cqi, 50cqb) * 2)');
  });
});
