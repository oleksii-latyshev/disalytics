export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type PhotoType = 'image/webp' | 'image/png' | 'image/jpeg';

/** The image type the leading bytes declare, or null when they are none of the three we keep. */
export function sniffImageType(bytes: Uint8Array): PhotoType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const DATA_URL = /^data:image\/(?:webp|png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;

export type DecodedPhoto =
  | { readonly ok: true; readonly bytes: Uint8Array<ArrayBuffer>; readonly type: PhotoType }
  | { readonly ok: false; readonly reason: string };

/** Decodes an embedded photo; the bytes must be a real webp, png or jpeg of at most 5 MB. */
export function decodeDataUrl(dataUrl: string): DecodedPhoto {
  const payload = DATA_URL.exec(dataUrl)?.[1];
  if (payload === undefined) return { ok: false, reason: 'not_a_data_url' };
  if ((payload.length * 3) / 4 > MAX_PHOTO_BYTES + 3) return { ok: false, reason: 'too_large' };

  let binary: string;
  try {
    binary = atob(payload);
  } catch {
    return { ok: false, reason: 'bad_base64' };
  }
  if (binary.length > MAX_PHOTO_BYTES) return { ok: false, reason: 'too_large' };

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const type = sniffImageType(bytes);
  return type === null ? { ok: false, reason: 'not_an_image' } : { ok: true, bytes, type };
}
