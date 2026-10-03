import { describe, expect, it } from 'vitest';
import { cn } from '../utils';

describe('cn', () => {
  it('keeps a text colour beside a token font size', () => {
    expect(cn('bg-primary text-primary-foreground', 'text-12')).toBe(
      'bg-primary text-primary-foreground text-12',
    );
    expect(cn('text-ink-dim', 'text-13')).toBe('text-ink-dim text-13');
  });

  it('still lets a later token size replace an earlier one', () => {
    expect(cn('text-12', 'text-14')).toBe('text-14');
  });

  it('treats the control heights as heights', () => {
    expect(cn('h-control', 'h-8')).toBe('h-8');
    expect(cn('h-8', 'h-control-lg')).toBe('h-control-lg');
  });

  it('treats the token radii, leading and tracking as their own groups', () => {
    expect(cn('rounded-chip', 'rounded-card')).toBe('rounded-card');
    expect(cn('leading-dense text-ink', 'leading-prose')).toBe('text-ink leading-prose');
    expect(cn('tracking-label', 'text-ink')).toBe('tracking-label text-ink');
  });
});
