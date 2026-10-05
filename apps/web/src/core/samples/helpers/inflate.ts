/** The two bytes every gzip member starts with (RFC 1952). */
const GZIP_MAGIC = [0x1f, 0x8b] as const;

export function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1];
}

/**
 * The container inside a downloaded sample, whichever way it arrived.
 *
 * A server that answers the `.gz` with `Content-Encoding: gzip` — `vite preview` does (#581) — has
 * the browser inflate it before the page sees it, so the body is already the container. Only bytes
 * that still start with the gzip magic are inflated; anything else goes to `decodeDemo` as it is,
 * which refuses what is not a container.
 */
export async function inflateSample(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!isGzip(bytes)) return bytes;

  const inflated = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(inflated).arrayBuffer());
}
