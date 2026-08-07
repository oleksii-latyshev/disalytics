export type KeyValues = { [key: string]: string | KeyValues };

type Token = { kind: 'string'; value: string } | { kind: 'open' } | { kind: 'close' };

function skipIgnored(source: string, start: number): number {
  let index = start;

  while (index < source.length) {
    const char = source[index] ?? '';
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === '/' && source[index + 1] === '/') {
      const lineEnd = source.indexOf('\n', index);
      index = lineEnd === -1 ? source.length : lineEnd + 1;
      continue;
    }
    break;
  }

  return index;
}

function readString(source: string, start: number): [string, number] {
  if (source[start] === '"') {
    const end = source.indexOf('"', start + 1);
    if (end === -1) throw new Error(`unterminated string at offset ${start}`);
    return [source.slice(start + 1, end), end + 1];
  }

  let end = start;
  while (end < source.length && !/[\s{}"]/.test(source[end] ?? '')) end += 1;
  return [source.slice(start, end), end];
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    index = skipIgnored(source, index);
    if (index >= source.length) break;

    const char = source[index];
    if (char === '{' || char === '}') {
      tokens.push({ kind: char === '{' ? 'open' : 'close' });
      index += 1;
      continue;
    }

    const [value, next] = readString(source, index);
    tokens.push({ kind: 'string', value });
    index = next;
  }

  return tokens;
}

interface Cursor {
  at: number;
}

function parseBlock(tokens: Token[], cursor: Cursor): KeyValues {
  const block: KeyValues = {};

  while (cursor.at < tokens.length) {
    const key = tokens[cursor.at];
    cursor.at += 1;
    if (key === undefined || key.kind === 'close') return block;
    if (key.kind !== 'string') throw new Error('expected a key, found a block');

    const value = tokens[cursor.at];
    cursor.at += 1;
    if (value === undefined || value.kind === 'close') {
      throw new Error(`key "${key.value}" has no value`);
    }

    block[key.value] = value.kind === 'open' ? parseBlock(tokens, cursor) : value.value;
  }

  return block;
}

/**
 * Valve's KeyValues, reduced to what an overview file uses: quoted pairs, nested blocks and `//`
 * comments. Duplicate keys keep the last value, which is what the engine does.
 */
export function parseKeyValues(source: string): KeyValues {
  return parseBlock(tokenize(source), { at: 0 });
}
