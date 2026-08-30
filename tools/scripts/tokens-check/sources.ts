/**
 * What the sources write into a class position. Anchoring to `className`, `class` and `cva` is
 * what keeps prose out: Tailwind's own candidate grammar accepts a bare English word, so a sweep
 * that took every token in the tree would report a comment.
 */

/** Where a token is written. Line numbers are 1-based, the way an editor counts them. */
export type Sites = ReadonlyMap<string, readonly number[]>;

/**
 * A token worth asking about. Every step this check exists to catch — `rounded-control`, `text-15`,
 * `duration-micro` — names a scale, and naming a scale takes one of these separators. A bare word
 * like `flex` is left alone: it is a class, but so is every word in a sentence.
 */
const CLASS_SHAPED = /[-:[\](/]/;

/** `className="…"`, `className={…}`, `class="…"` and the whole of a `cva(…)` call. */
const ANCHOR = /\b(?:className|class)\s*=|\bcva\s*\(/g;

const KEY = /(?:'([^'\n]*)'|"([^"\n]*)"|([A-Za-z_$][\w$]*))\s*:/g;

// Three ways this tree names a token, and one pattern covers two of them: `var(--color-line)` in
// an arbitrary class value and Tailwind's own `duration-(--duration-micro)` shorthand both put the
// name straight after a bracket. `readCssToken` is how a canvas asks, since a canvas cannot read a
// custom property itself.
const BRACKETED_PROPERTY = /\(\s*(--[\w-]+)/g;
const NAMED_PROPERTY = /(?:readCssToken|getPropertyValue)\(\s*['"](--[\w-]+)/g;

const QUOTE = /['"`]/;
const OPENS_REGION = /[{(]/;

interface Literal {
  readonly value: string;
  readonly line: number;
}

interface Region {
  readonly start: number;
  readonly end: number;
  readonly isCva: boolean;
}

/** The index one past the closing quote of the literal that opens at `start`. */
function endOfLiteral(source: string, start: number): number {
  const quote = source[start];
  let index = start + 1;

  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === quote) return index + 1;
    if (quote !== '`' && char === '\n') return index;
    index += 1;
  }

  return source.length;
}

/** The index one past the comment that opens at `start`, or `undefined` if none does. */
function endOfComment(source: string, start: number): number | undefined {
  if (source[start] !== '/') return undefined;

  if (source[start + 1] === '/') {
    const end = source.indexOf('\n', start);
    return end === -1 ? source.length : end;
  }

  if (source[start + 1] === '*') {
    const end = source.indexOf('*/', start + 2);
    return end === -1 ? source.length : end + 2;
  }

  return undefined;
}

function countNewlines(source: string, start: number, end: number): number {
  let count = 0;
  for (let index = start; index < end; index++) if (source[index] === '\n') count += 1;
  return count;
}

/**
 * The source with every comment blanked out and newlines kept, so line numbers survive. A
 * commented-out `className={` would otherwise open a region that never closes.
 */
export function withoutComments(source: string): string {
  let out = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index] as string;
    const comment = endOfComment(source, index);

    if (comment !== undefined) {
      for (let at = index; at < comment; at++) out += source[at] === '\n' ? '\n' : ' ';
      index = comment;
      continue;
    }

    if (QUOTE.test(char)) {
      const end = endOfLiteral(source, index);
      out += source.slice(index, end);
      index = end;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/** The end of the `{…}` or `(…)` that opens at `open`, ignoring delimiters inside a literal. */
function endOfRegion(source: string, open: number): number {
  let depth = 0;
  let index = open;

  while (index < source.length) {
    const char = source[index] as string;

    if (QUOTE.test(char)) {
      index = endOfLiteral(source, index);
      continue;
    }

    if (OPENS_REGION.test(char)) depth += 1;
    else if (char === '}' || char === ')') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }

    index += 1;
  }

  return source.length;
}

/** The literal text of a template, plus whatever its interpolations themselves write. */
function chunksIn(source: string, open: number, close: number, firstLine: number): Literal[] {
  const found: Literal[] = [];
  let line = firstLine;
  let chunk = '';
  let chunkLine = firstLine;
  let index = open + 1;

  while (index < close - 1) {
    if (source[index] === '\\') {
      chunk += source.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (source[index] === '$' && source[index + 1] === '{') {
      found.push({ value: chunk, line: chunkLine });
      const stop = endOfRegion(source, index + 1);
      found.push(...literalsIn(source, index + 1, stop, line));
      line += countNewlines(source, index, stop);
      index = stop;
      chunk = '';
      chunkLine = line;
      continue;
    }

    if (source[index] === '\n') line += 1;
    chunk += source[index];
    index += 1;
  }

  found.push({ value: chunk, line: chunkLine });
  return found;
}

/**
 * Every string a region writes, with the line each one sits on. A template is walked rather than
 * taken whole: `${selected ? 'bg-hover' : ''}` holds two class lists, and a rule that dropped every
 * interpolation would drop the half of this codebase that writes a class conditionally.
 */
function literalsIn(source: string, start: number, end: number, firstLine: number): Literal[] {
  const found: Literal[] = [];
  let line = firstLine;
  let index = start;

  while (index < end) {
    const char = source[index] as string;

    if (QUOTE.test(char)) {
      const stop = endOfLiteral(source, index);
      if (char === '`') found.push(...chunksIn(source, index, stop, line));
      else found.push({ value: source.slice(index + 1, stop - 1), line });
      line += countNewlines(source, index, stop);
      index = stop;
      continue;
    }

    if (char === '\n') line += 1;
    index += 1;
  }

  return found;
}

/**
 * The names a `cva` call uses as keys. A variant is named the way a class is written — `icon-lg` is
 * both a size and a shape — so the same token appears as a key and, under `defaultVariants`, as a
 * value. Neither is a class list.
 */
function keysIn(region: string): Set<string> {
  const keys = new Set<string>();
  for (const [, single, double, bare] of region.matchAll(KEY)) {
    const key = single ?? double ?? bare;
    if (key !== undefined) keys.add(key);
  }
  return keys;
}

/** The span an anchor opens, or `undefined` where what follows it is neither a region nor a string. */
function regionAt(code: string, match: RegExpExecArray): Region | undefined {
  const isCva = match[0].endsWith('(');
  let start = match.index + match[0].length - (isCva ? 1 : 0);
  while (/\s/.test(code[start] ?? '')) start += 1;

  const opener = code[start];
  if (opener === undefined) return undefined;
  if (!OPENS_REGION.test(opener) && !QUOTE.test(opener)) return undefined;

  const end = OPENS_REGION.test(opener) ? endOfRegion(code, start) : endOfLiteral(code, start);
  return { start, end, isCva };
}

function addSite(sites: Map<string, number[]>, token: string, line: number): void {
  const lines = sites.get(token);
  if (lines === undefined) sites.set(token, [line]);
  else if (!lines.includes(line)) lines.push(line);
}

/**
 * A class list often runs over several lines, so a report names the line the class is written on
 * rather than the one the string opens on.
 */
function addTokens(sites: Map<string, number[]>, literal: Literal): void {
  let line = literal.line;

  for (const row of literal.value.split('\n')) {
    for (const token of row.split(/\s+/)) {
      if (token !== '' && CLASS_SHAPED.test(token)) addSite(sites, token, line);
    }
    line += 1;
  }
}

/** Every class-shaped token the source writes into a class position. */
export function classesIn(source: string): Sites {
  const code = withoutComments(source);
  const sites = new Map<string, number[]>();

  for (const match of code.matchAll(ANCHOR)) {
    const region = regionAt(code, match);
    if (region === undefined) continue;

    const line = 1 + countNewlines(code, 0, region.start);
    const names = region.isCva ? keysIn(code.slice(region.start, region.end)) : new Set<string>();

    for (const literal of literalsIn(code, region.start, region.end, line)) {
      if (!names.has(literal.value)) addTokens(sites, literal);
    }
  }

  return sites;
}

/** Every `--token` the source asks a stylesheet for, by line. */
export function customPropertiesIn(source: string): Sites {
  const code = withoutComments(source);
  const sites = new Map<string, number[]>();

  for (const pattern of [BRACKETED_PROPERTY, NAMED_PROPERTY]) {
    for (const match of code.matchAll(pattern)) {
      const name = match[1];
      if (name !== undefined) addSite(sites, name, 1 + countNewlines(code, 0, match.index));
    }
  }

  return sites;
}
