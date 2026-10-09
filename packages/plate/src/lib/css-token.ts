/**
 * The value a design token currently resolves to. Canvas takes colours as strings and cannot read
 * a CSS custom property itself, so anything drawn has to look one up rather than repeat a literal.
 */
export function readCssToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
