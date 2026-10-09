import { Context, Effect, Option } from 'effect';
import { attempt, type StorageError } from '../../shared/storage-error';

/** The slice of a Workers KV namespace this Worker uses. */
export interface KvBinding {
  getWithMetadata(
    key: string,
    type: 'arrayBuffer',
  ): Promise<{ readonly value: ArrayBuffer | null; readonly metadata: unknown }>;
  put(
    key: string,
    value: ArrayBuffer,
    options?: { readonly metadata?: { readonly contentType: string } },
  ): Promise<void>;
}

export interface StoredPhoto {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly contentType: string;
}

/** Photos are content-addressed: the key is the SHA-256 of the bytes, so a stored photo never changes. */
export class PhotoStorage extends Context.Service<
  PhotoStorage,
  {
    readonly read: (hash: string) => Effect.Effect<Option.Option<StoredPhoto>, StorageError>;
    /** Stores the bytes under their hash and returns it. */
    readonly save: (
      bytes: Uint8Array<ArrayBuffer>,
      contentType: string,
    ) => Effect.Effect<string, StorageError>;
  }
>()('disalytics/PhotoStorage') {}

const IMAGE_TYPE = /^image\/[a-z0-9.+-]{1,40}$/;

/** The lowercase hex SHA-256 of the bytes. */
export function photoHash(bytes: Uint8Array<ArrayBuffer>): Effect.Effect<string, StorageError> {
  return attempt(async () => {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  });
}

function contentTypeOf(metadata: unknown): string {
  if (typeof metadata === 'object' && metadata !== null && 'contentType' in metadata) {
    const { contentType } = metadata;
    if (typeof contentType === 'string' && IMAGE_TYPE.test(contentType)) return contentType;
  }
  return 'application/octet-stream';
}

export function makePhotoStorage(kv: KvBinding): Context.Service.Shape<typeof PhotoStorage> {
  return {
    read: (hash) =>
      attempt(async () => {
        const { value, metadata } = await kv.getWithMetadata(hash, 'arrayBuffer');
        return value === null
          ? Option.none()
          : Option.some({ bytes: new Uint8Array(value), contentType: contentTypeOf(metadata) });
      }),

    save: (bytes, contentType) =>
      Effect.gen(function* () {
        const hash = yield* photoHash(bytes);
        yield* attempt(() => kv.put(hash, bytes.slice().buffer, { metadata: { contentType } }));
        return hash;
      }),
  };
}
