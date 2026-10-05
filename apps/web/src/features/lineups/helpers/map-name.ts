/** A map as players say it: `de_dust2` is "Dust2". Game vocabulary, so it is never translated. */
export function mapName(map: string): string {
  const bare = map.replace(/^de_/, '');

  return `${bare.charAt(0).toUpperCase()}${bare.slice(1)}`;
}
