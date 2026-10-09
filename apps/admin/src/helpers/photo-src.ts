import { localImageHash } from '@disa/demo-core';

/** What an `<img>` can load for a photo ref: the embedded data for a `local:` ref, else the link. */
export function photoSrc(ref: string, images: Readonly<Record<string, string>>): string | null {
  const hash = localImageHash(ref);
  if (hash === null) return ref;
  return images[hash] ?? null;
}

/** Bytes an embedded photo takes, from the length of its base64; null for a link. */
export function embeddedBytes(
  ref: string,
  images: Readonly<Record<string, string>>,
): number | null {
  const hash = localImageHash(ref);
  const data = hash === null ? undefined : images[hash];
  if (data === undefined) return null;
  const payload = data.slice(data.indexOf(',') + 1);
  return Math.floor((payload.length * 3) / 4);
}
