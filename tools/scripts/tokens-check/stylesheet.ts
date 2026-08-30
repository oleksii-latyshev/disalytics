/**
 * What the built stylesheet defines. Names are read out of the CSS rather than matched against it:
 * a class carries its own escapes — `duration-\(--duration-micro\)` — and unescaping once is one
 * rule, where building the escaped selector per candidate is a rule per punctuation mark.
 */

const CUSTOM_PROPERTY_DEFINITION = /(--[\w-]+)\s*:/g;
const NAME_CHARACTER = /[\w-]/;

interface Name {
  readonly value: string;
  readonly next: number;
}

/** The class name that starts one past `dot`, with its escapes resolved. */
function nameAfter(css: string, dot: number): Name {
  let index = dot + 1;
  let value = '';

  while (index < css.length) {
    const char = css[index] as string;

    if (char === '\\') {
      value += css[index + 1] ?? '';
      index += 2;
      continue;
    }

    if (!NAME_CHARACTER.test(char)) break;
    value += char;
    index += 1;
  }

  return { value, next: index };
}

/** Every class the stylesheet has a rule for. */
export function definedClasses(css: string): ReadonlySet<string> {
  const defined = new Set<string>();

  for (let index = 0; index < css.length; index++) {
    // A digit before the dot is a decimal point rather than a selector: `1.25rem` would otherwise
    // define `25rem`. A letter before it is a compound selector — `.glass-panel.has-brow` defines
    // both halves.
    if (css[index] !== '.' || /\d/.test(css[index - 1] ?? '')) continue;

    const name = nameAfter(css, index);
    if (name.value.length > 1) defined.add(name.value);
    index = name.next - 1;
  }

  return defined;
}

/** Every `--token` the stylesheet declares. */
export function definedCustomProperties(css: string): ReadonlySet<string> {
  const defined = new Set<string>();
  for (const [, name] of css.matchAll(CUSTOM_PROPERTY_DEFINITION)) {
    if (name !== undefined) defined.add(name);
  }
  return defined;
}
