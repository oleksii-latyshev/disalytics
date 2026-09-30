import { describe, expect, it } from 'vitest';
import { afterRouteNavigation } from '..';

describe('afterRouteNavigation', () => {
  it('waits for route commit before starting the parse action', async () => {
    let commitRoute: (() => void) | undefined;
    const order: string[] = [];
    const pendingNavigation = new Promise<void>((resolve) => {
      commitRoute = resolve;
    });
    const opening = afterRouteNavigation(
      () => pendingNavigation,
      () => order.push('open'),
    );

    order.push('navigate');
    expect(order).toEqual(['navigate']);
    commitRoute?.();
    await opening;

    expect(order).toEqual(['navigate', 'open']);
  });
});
