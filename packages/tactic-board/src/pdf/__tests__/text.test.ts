import { describe, expect, it } from 'vitest';
import { fitText, wrapText } from '../text';
import { fakeMeasure } from './pdf-fixture';

// 10 pt text measures 0.5 mm a character, so 5 mm holds ten characters.
const wrap = (text: string, width = 5) => wrapText(text, width, 'regular', 10, fakeMeasure);

describe('wrapText', () => {
  it('breaks between words and not inside them', () => {
    expect(wrap('alpha beta gamma')).toEqual(['alpha beta', 'gamma']);
  });

  it('keeps the breaks the text has and collapses runs of spaces', () => {
    expect(wrap('one\n\ntwo   three')).toEqual(['one', '', 'two three']);
  });

  it('cuts a word wider than the line instead of letting it overflow', () => {
    expect(wrap('abcdefghijklmnopqrstuvwxyz')).toEqual(['abcdefghij', 'klmnopqrst', 'uvwxyz']);
  });

  it('wraps Cyrillic like anything else and has nothing to say for empty text', () => {
    expect(wrap('привет мир снова')).toEqual(['привет мир', 'снова']);
    expect(wrap('')).toEqual(['']);
  });
});

describe('fitText', () => {
  it('leaves a line that fits and shortens one that does not', () => {
    expect(fitText('short', 5, 'regular', 10, fakeMeasure)).toBe('short');
    const cut = fitText('a title that is far too long', 5, 'regular', 10, fakeMeasure);
    expect(cut.endsWith('…')).toBe(true);
    expect(fakeMeasure(cut, 'regular', 10)).toBeLessThanOrEqual(5);
  });
});
