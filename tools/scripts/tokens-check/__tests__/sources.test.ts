import { describe, expect, it } from 'vitest';
import { classesIn, customPropertiesIn, withoutComments } from '../sources';

const classes = (source: string) => [...classesIn(source).keys()];
const lines = (source: string, token: string) => classesIn(source).get(token);

describe('classesIn', () => {
  it('reads a class out of a quoted attribute', () => {
    expect(classes('<div className="rounded-card bg-surface-1" />')).toEqual([
      'rounded-card',
      'bg-surface-1',
    ]);
  });

  it('reads a class out of a braced expression', () => {
    expect(classes('<div className={`rounded-card`} />')).toContain('rounded-card');
  });

  it('reads both arms of a conditional inside a template', () => {
    const source = ['<li className={`px-2 $', '{on ? "bg-hover" : "bg-surface-2"}`} />'].join('');
    expect(classes(source)).toEqual(['px-2', 'bg-hover', 'bg-surface-2']);
  });

  it('leaves a bare word alone, because so is every word in a sentence', () => {
    expect(classes('<div className="flex rounded-card" />')).toEqual(['rounded-card']);
  });

  it('does not split an arbitrary variant into a fragment that resolves to nothing', () => {
    const source = '<input className="[&::-moz-range-thumb]:bg-transparent" />';
    expect(classes(source)).toEqual(['[&::-moz-range-thumb]:bg-transparent']);
  });

  it('keeps an arbitrary property whole', () => {
    const source = '<div className="[border-block-start:1px_solid_var(--color-line)]" />';
    expect(classes(source)).toEqual(['[border-block-start:1px_solid_var(--color-line)]']);
  });

  it('ignores prose in a line comment', () => {
    expect(classes('// the text-rate is drawn per round\n<div className="px-2" />')).toEqual([
      'px-2',
    ]);
  });

  it('ignores prose in a block comment', () => {
    expect(
      classes('/* a round-trip through the\n   time-axis */\n<div className="px-2" />'),
    ).toEqual(['px-2']);
  });

  it('is not opened by a commented-out attribute', () => {
    expect(classes('// <div className={`\nconst gap = "sub-pixel";')).toEqual([]);
  });

  it('ignores a hyphenated string that is not in a class position', () => {
    expect(classes('const agent = "user-agent";')).toEqual([]);
  });

  it('reads a cva base argument', () => {
    expect(classes("cva('inline-flex rounded-md', { variants: {} })")).toEqual([
      'inline-flex',
      'rounded-md',
    ]);
  });

  it('reads a cva base written as an array', () => {
    expect(classes("cva(['w-full', 'border-input'], {})")).toEqual(['w-full', 'border-input']);
  });

  it('takes a variant name for a name rather than a class list', () => {
    const source = "cva('p-0', { variants: { size: { 'icon-lg': 'size-10' } } })";
    expect(classes(source)).toEqual(['p-0', 'size-10']);
  });

  it('takes a variant name for a name where it is used as a default', () => {
    const source =
      "cva('p-0', { variants: { size: { 'icon-lg': 'size-10' } }, defaultVariants: { size: 'icon-lg' } })";
    expect(classes(source)).not.toContain('icon-lg');
  });

  it('reports every line a class is written on', () => {
    const source = ['<a className="px-2" />', '<b className="px-2" />'].join('\n');
    expect(lines(source, 'px-2')).toEqual([1, 2]);
  });

  it('counts lines through a multi-line attribute', () => {
    const source = ['<a', '  className={`px-2', '    py-1`}', '/>'].join('\n');
    expect(lines(source, 'py-1')).toEqual([3]);
  });
});

describe('customPropertiesIn', () => {
  it('reads a token out of a var()', () => {
    expect([...customPropertiesIn('background: var(--color-line);').keys()]).toEqual([
      '--color-line',
    ]);
  });

  it("reads a token out of Tailwind's bracket shorthand", () => {
    const source = '<div className="duration-(--duration-micro)" />';
    expect([...customPropertiesIn(source).keys()]).toEqual(['--duration-micro']);
  });

  it('reads a token the canvas asks for by name', () => {
    expect([...customPropertiesIn("readCssToken('--color-ct')").keys()]).toEqual(['--color-ct']);
  });

  it('ignores a token named in a comment', () => {
    expect([...customPropertiesIn('// falls back to var(--color-ink)').keys()]).toEqual([]);
  });
});

describe('withoutComments', () => {
  it('keeps the line count so a report can name a line', () => {
    const source = ['/* one', '   two */', 'three'].join('\n');
    expect(withoutComments(source).split('\n')).toHaveLength(3);
  });

  it('leaves a slash inside a string alone', () => {
    expect(withoutComments('const url = "https://example.test/a";')).toContain('https://');
  });
});
