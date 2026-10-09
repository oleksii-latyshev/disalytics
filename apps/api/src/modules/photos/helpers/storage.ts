import type { KvLike } from '../../../shared/cloudflare/bindings';

const SHA256_HEX = /^[0-9a-f]{64}$/;
const IMAGE_TYPE = /^image\/[a-z0-9.+-]{1,40}$/;

export function isPhotoHash(value: string): boolean {
  return SHA256_HEX.test(value);
}

export interface StoredPhoto {
  readonly bytes: ArrayBuffer;
  readonly contentType: string;
}

function contentTypeOf(metadata: unknown): string {
  if (typeof metadata === 'object' && metadata !== null && 'contentType' in metadata) {
    const { contentType } = metadata;
    if (typeof contentType === 'string' && IMAGE_TYPE.test(contentType)) return contentType;
  }
  return 'application/octet-stream';
}

export async function readPhoto(kv: KvLike, hash: string): Promise<StoredPhoto | null> {
  if (!isPhotoHash(hash)) return null;
  const { value, metadata } = await kv.getWithMetadata(hash, 'arrayBuffer');
  return value === null ? null : { bytes: value, contentType: contentTypeOf(metadata) };
}

/** Stores a photo under the SHA-256 of its bytes and returns that hash. */
export async function savePhoto(
  kv: KvLike,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await kv.put(hash, bytes, { metadata: { contentType } });
  return hash;
}
