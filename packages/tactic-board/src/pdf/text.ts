export type FontId = 'regular' | 'semibold';

/** The width of a line of text in millimetres, set in a font at a size in points. */
export type MeasureText = (text: string, font: FontId, size: number) => number;

const ELLIPSIS = '…';

/** Cuts a word that is wider than the line into pieces that each fit it. */
function breakWord(word: string, fits: (text: string) => boolean): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const character of word) {
    if (current !== '' && !fits(current + character)) {
      pieces.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  if (current !== '') pieces.push(current);
  return pieces;
}

function wrapParagraph(words: readonly string[], fits: (text: string) => boolean): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current !== '') lines.push(current);
    const pieces = fits(word) ? [word] : breakWord(word, fits);
    current = pieces.pop() ?? '';
    lines.push(...pieces);
  }
  if (current !== '') lines.push(current);
  return lines;
}

/**
 * Breaks text into lines no wider than `maxWidth`. A line break in the text is kept, runs of
 * spaces collapse, and a single word wider than the line is cut rather than allowed to overflow.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  font: FontId,
  size: number,
  measure: MeasureText,
): readonly string[] {
  const fits = (line: string) => measure(line, font, size) <= maxWidth;
  return text.split(/\r?\n/).flatMap((paragraph) => {
    const words = paragraph.split(/\s+/).filter((word) => word !== '');
    return words.length === 0 ? [''] : wrapParagraph(words, fits);
  });
}

/** One line cut to `maxWidth` with an ellipsis when it is too long. */
export function fitText(
  text: string,
  maxWidth: number,
  font: FontId,
  size: number,
  measure: MeasureText,
): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (measure(flat, font, size) <= maxWidth) return flat;
  let end = flat.length;
  while (end > 0 && measure(flat.slice(0, end).trimEnd() + ELLIPSIS, font, size) > maxWidth) end--;
  return flat.slice(0, end).trimEnd() + ELLIPSIS;
}
