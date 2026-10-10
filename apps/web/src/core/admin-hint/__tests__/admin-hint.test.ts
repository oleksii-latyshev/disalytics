import { describe, expect, it } from 'vitest';
import { adminUrl, hasAdminHint } from '../helpers/admin-hint';

describe('hasAdminHint', () => {
  it('is true only for the hint cookie set to 1', () => {
    expect(hasAdminHint('disa_admin=1')).toBe(true);
    expect(hasAdminHint('a=b; disa_admin=1; c=d')).toBe(true);
    expect(hasAdminHint('')).toBe(false);
    expect(hasAdminHint('disa_admin=')).toBe(false);
    expect(hasAdminHint('disa_admin=0')).toBe(false);
    expect(hasAdminHint('not_disa_admin=1')).toBe(false);
    expect(hasAdminHint('disa_admin=10')).toBe(false);
  });
});

describe('adminUrl', () => {
  it('names the production admin unless configured', () => {
    expect(adminUrl()).toMatch(/^https:\/\//);
  });
});
