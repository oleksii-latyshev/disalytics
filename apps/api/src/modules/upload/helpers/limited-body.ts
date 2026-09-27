import { MAX_BODY_BYTES } from '../constants';

export async function readLimitedBody(request: Request): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let sizeBytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    sizeBytes += part.value.byteLength;
    if (sizeBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(new ArrayBuffer(sizeBytes));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
