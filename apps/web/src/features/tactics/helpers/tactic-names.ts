/** A name the user left empty reads as the screen's own wording instead of a stored English string. */
export function nameOrFallback(name: string, fallback: string): string {
  return name.trim() === '' ? fallback : name;
}
