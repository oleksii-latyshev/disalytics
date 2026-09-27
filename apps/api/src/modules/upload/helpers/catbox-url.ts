export function catboxImageUrl(raw: string): string | null {
  const url = new URL(raw.trim());
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'files.catbox.moe' ||
    !/^\/[a-zA-Z0-9]{6,12}\.webp$/.test(url.pathname) ||
    url.search ||
    url.hash
  ) {
    return null;
  }
  return url.href;
}
