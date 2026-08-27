/** A key path as the locale resources spell it: a namespace, then at least one segment. */
const KEY_PATH = /^([a-z][A-Za-z0-9]*)(?:\.[A-Za-z0-9_]+)+$/;

const QUOTED = /'([^'\n]*)'|"([^"\n]*)"/g;
const TEMPLATE = /`([^`\n]*)`/g;
const INTERPOLATION = /\$\{[^}]*\}/g;

// One interpolation stands for exactly one key segment, so `errors.${stem}.title` covers
// `errors.povDemo.title` and nothing deeper. A wider pattern would cover keys no switch can build.
const SEGMENT = '[^.]+';

const REGEXP_SPECIAL = /[.*+?^${}()|[\]\\]/g;

export interface KeyReaders {
  /** Keys written out in full — `<Text path="library.open.title" />`. */
  readonly literals: ReadonlySet<string>;
  /** Keys assembled at runtime — one pattern per template literal that starts with a namespace. */
  readonly patterns: readonly RegExp[];
}

function isKeyPath(value: string, namespaces: readonly string[]): boolean {
  const namespace = KEY_PATH.exec(value)?.[1];
  return namespace !== undefined && namespaces.includes(namespace);
}

function literalsIn(line: string, namespaces: readonly string[]): string[] {
  const found: string[] = [];

  for (const [, single, double] of line.matchAll(QUOTED)) {
    const value = single ?? double;
    if (value !== undefined && isKeyPath(value, namespaces)) found.push(value);
  }

  return found;
}

function patternFor(template: string, namespaces: readonly string[]): RegExp | undefined {
  const parts = template.split(INTERPOLATION);
  const head = parts[0];

  if (parts.length < 2 || head === undefined) return undefined;
  if (!namespaces.some((namespace) => head.startsWith(`${namespace}.`))) return undefined;

  const literal = parts.map((part) => part.replace(REGEXP_SPECIAL, '\\$&')).join(SEGMENT);
  return new RegExp(`^${literal}$`);
}

function patternsIn(line: string, namespaces: readonly string[]): RegExp[] {
  const found: RegExp[] = [];

  for (const [, template] of line.matchAll(TEMPLATE)) {
    const pattern = template === undefined ? undefined : patternFor(template, namespaces);
    if (pattern !== undefined) found.push(pattern);
  }

  return found;
}

/**
 * Every key the given sources can ask for. Scanning is per line, so an unbalanced backtick in a
 * comment costs its own line rather than every template literal below it.
 */
export function collectReaders(
  sources: readonly string[],
  namespaces: readonly string[],
): KeyReaders {
  const literals = new Set<string>();
  const patterns: RegExp[] = [];

  for (const source of sources) {
    for (const line of source.split('\n')) {
      for (const literal of literalsIn(line, namespaces)) literals.add(literal);
      patterns.push(...patternsIn(line, namespaces));
    }
  }

  return { literals, patterns };
}

/** The keys no source asks for, in the order they should be reported. */
export function unreadKeys(keys: readonly string[], readers: KeyReaders): readonly string[] {
  return keys
    .filter((key) => !readers.literals.has(key))
    .filter((key) => !readers.patterns.some((pattern) => pattern.test(key)))
    .toSorted();
}
