import { describe, expect, it } from 'vitest';
import { formatRoute, HOME, parseRoute, SECTIONS } from '../helpers/route';

describe('parseRoute and formatRoute', () => {
  it('reads every section from the hash it writes', () => {
    for (const section of SECTIONS) {
      expect(parseRoute(formatRoute({ section }))).toEqual({ section });
    }
  });

  it('keeps the map under Lineups on the site, and the new-tactic flag', () => {
    const onSite = { section: 'onSite', map: 'de_mirage' } as const;
    expect(formatRoute(onSite)).toBe('#/lineups/site/de_mirage');
    expect(parseRoute('#/lineups/site/de_mirage')).toEqual(onSite);
    const fresh = { section: 'tactics', isNewTactic: true } as const;
    expect(formatRoute(fresh)).toBe('#/tactics/new');
    expect(parseRoute('#/tactics/new')).toEqual(fresh);
  });

  it('writes the paths the owner will see', () => {
    expect(formatRoute(HOME)).toBe('#/');
    expect(formatRoute({ section: 'import' })).toBe('#/lineups/add');
    expect(formatRoute({ section: 'onSite' })).toBe('#/lineups/site');
    expect(formatRoute({ section: 'tactics' })).toBe('#/tactics');
  });

  it('lands on the overview for anything it does not know', () => {
    for (const hash of ['', '#', '#/', '#invite=abc', '#/nope', '#/people/x', '#/lineups']) {
      expect(parseRoute(hash)).toEqual(HOME);
    }
    expect(parseRoute('#/lineups/site/de_nowhere')).toEqual({ section: 'onSite' });
  });
});
