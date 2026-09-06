import type { ParsedDemo } from '@disa/demo-core';
import { decodeDemo } from '@disa/demo-store/codec';
import { SAMPLE_ASSETS } from '../generated/assets';
import type { SampleMatch } from './catalogue';

export interface SampleLoad {
  signal: AbortSignal;
  /** Whole per cent of the download, or `null` while the server has not said how long it is. */
  onProgress: (percent: number | null) => void;
}

/**
 * Reads the body, reporting progress as it goes, and returns it whole.
 *
 * `total` of zero is a server that did not say how long the body is, and then there is no
 * percentage to report — a figure invented from nothing is worse than none. The one that *is*
 * reported is clamped, because `content-length` is what the server is sending: a proxy that
 * re-encodes the response states its own length while the browser hands the page the decoded body.
 */
async function collect(
  response: Response,
  total: number,
  { signal, onProgress }: SampleLoad,
): Promise<Blob> {
  const reader = response.body?.getReader();
  if (reader === undefined) throw new Error('the sample answered with no body');

  const parts: BlobPart[] = [];
  let read = 0;
  let last = -1;

  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      signal.throwIfAborted();

      parts.push(chunk.value);
      read += chunk.value.byteLength;

      const percent = total === 0 ? null : Math.min(100, Math.round((read / total) * 100));
      if (percent !== null && percent !== last) {
        last = percent;
        onProgress(percent);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return new Blob(parts);
}

/**
 * Fetches one sample and decodes it into the demo the rest of the app already knows how to open.
 *
 * **The container is decompressed here rather than by the server.** Naming the encoding in a header
 * would leave the browser to do it, and a proxy that re-compresses the response — which Cloudflare
 * may — would then hand the page bytes that have been through gzip twice and out of it once.
 * Inflating what this repository wrote is true either way.
 *
 * Nothing here is the reader's data and nothing leaves the device: this is a parse **we** shipped,
 * pulled from the same origin as the app, which is what keeps hard rule 1 a rule about `.dem` files
 * rather than a rule about the network.
 */
export async function loadSample(sample: SampleMatch, load: SampleLoad): Promise<ParsedDemo> {
  const response = await fetch(SAMPLE_ASSETS[sample.id].url, { signal: load.signal });
  if (!response.ok) throw new Error(`the sample ${sample.id} answered ${response.status}`);

  const declared = Number(response.headers.get('content-length'));
  const total = Number.isFinite(declared) && declared > 0 ? declared : 0;
  load.onProgress(total === 0 ? null : 0);

  const compressed = await collect(response, total, load);
  const inflated = compressed.stream().pipeThrough(new DecompressionStream('gzip'));

  return decodeDemo(new Uint8Array(await new Response(inflated).arrayBuffer()));
}
