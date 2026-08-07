const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface PngSize {
  width: number;
  height: number;
}

/**
 * Width and height off the IHDR chunk, which the format fixes at bytes 16..24 of every PNG. Reading
 * the header is all the generator needs to verify an asset; decoding pixels is `recolor.ts`.
 */
export function readPngSize(bytes: Uint8Array): PngSize {
  const signatureMatches = SIGNATURE.every((byte, index) => bytes[index] === byte);
  if (!signatureMatches) throw new Error('not a PNG');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
