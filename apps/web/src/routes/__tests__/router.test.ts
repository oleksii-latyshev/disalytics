import { createMemoryHistory } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { type DemoParse, IDLE_PARSE } from '@/core/parsing';
import { createAppRouter } from '../router';

const parse: DemoParse = {
  state: IDLE_PARSE,
  open: () => undefined,
  openSaved: () => undefined,
  openSample: () => undefined,
  restoreKey: () => () => undefined,
  close: () => undefined,
};

describe('application routes', () => {
  it('restores a section on direct entry and follows back navigation', async () => {
    const history = createMemoryHistory({ initialEntries: ['/lineups'] });
    const router = createAppRouter(
      { parse, onUpdate: null, parseOrigin: { current: null } },
      history,
    );
    const unsubscribe = history.subscribe(router.load);

    await router.load({ sync: true });
    expect(router.state.location.pathname).toBe('/lineups');

    history.push('/tools');
    await router.load({ sync: true });
    expect(router.state.location.pathname).toBe('/tools');

    router.history.back();
    await router.load({ sync: true });
    expect(router.state.location.pathname).toBe('/lineups');
    unsubscribe();
  });
});
