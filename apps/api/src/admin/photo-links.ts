import { inArray, sql } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, makeDb } from '../db/client';
import { photoLinks } from '../db/schema';
import { attempt, type StorageError } from '../shared/storage-error';

export interface CopiedLink {
  readonly url: string;
  readonly sha256: string;
}

/** D1 allows 100 bound parameters a statement; a row binds 3, a lookup binds one a url. */
const LOOKUP_CHUNK = 50;
const INSERT_CHUNK = 20;

/** Which stored photo each copied link became, so a re-imported file's links are recognised. */
export class PhotoLinks extends Context.Service<
  PhotoLinks,
  {
    readonly lookup: (
      urls: readonly string[],
    ) => Effect.Effect<ReadonlyMap<string, string>, StorageError>;
    readonly remember: (
      links: readonly CopiedLink[],
      now: number,
    ) => Effect.Effect<void, StorageError>;
  }
>()('disalytics/admin/PhotoLinks') {}

function chunked<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let at = 0; at < items.length; at += size) out.push(items.slice(at, at + size));
  return out;
}

export function makePhotoLinks(binding: D1Binding): Context.Service.Shape<typeof PhotoLinks> {
  const db = makeDb(binding);
  return {
    lookup: (urls) =>
      attempt(async () => {
        const found = new Map<string, string>();
        for (const chunk of chunked([...new Set(urls)], LOOKUP_CHUNK)) {
          const rows = await db
            .select({ url: photoLinks.url, sha256: photoLinks.sha256 })
            .from(photoLinks)
            .where(inArray(photoLinks.url, chunk));
          for (const row of rows) found.set(row.url, row.sha256);
        }
        return found;
      }),

    remember: (links, now) =>
      attempt(async () => {
        for (const chunk of chunked(links, INSERT_CHUNK)) {
          await db
            .insert(photoLinks)
            .values(chunk.map((link) => ({ url: link.url, sha256: link.sha256, createdAt: now })))
            .onConflictDoUpdate({
              target: photoLinks.url,
              set: { sha256: sql`excluded.sha256` },
            });
        }
      }),
  };
}
