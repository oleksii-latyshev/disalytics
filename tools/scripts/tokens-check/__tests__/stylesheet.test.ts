import { describe, expect, it } from 'vitest';
import { definedClasses, definedCustomProperties } from '../stylesheet';

describe('definedClasses', () => {
  it('reads a plain class', () => {
    expect(definedClasses('.rounded-card{border-radius:12px}')).toContain('rounded-card');
  });

  it('unescapes a variant', () => {
    expect(definedClasses('.hover\\:bg-hover:hover{color:red}')).toContain('hover:bg-hover');
  });

  it('unescapes an arbitrary value', () => {
    expect(definedClasses('.duration-\\(--duration-micro\\){x:1}')).toContain(
      'duration-(--duration-micro)',
    );
  });

  it('reads both halves of a compound selector', () => {
    const defined = definedClasses('.glass-panel.has-brow{x:1}');
    expect([...defined].toSorted()).toEqual(['glass-panel', 'has-brow']);
  });

  it('does not take the fraction of a length for a class', () => {
    expect(definedClasses('.p-2{padding:1.25rem}')).not.toContain('25rem');
  });
});

describe('definedCustomProperties', () => {
  it('reads a declaration', () => {
    expect(definedCustomProperties(':root{--color-ink:#fff}')).toContain('--color-ink');
  });

  it('does not take a reference for a declaration', () => {
    expect(definedCustomProperties('.a{color:var(--color-ink)}')).not.toContain('--color-ink');
  });
});
