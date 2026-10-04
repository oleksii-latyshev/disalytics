/** A map's name as a heading: `de_dust2` is Dust II, `de_mirage` is Mirage. Game vocabulary, never translated. */
export function mapTitle(map: string): string {
  const name = map.replace(/^de_/, '').replaceAll('_', ' ');
  return name === 'dust2' ? 'Dust II' : name.charAt(0).toUpperCase() + name.slice(1);
}
