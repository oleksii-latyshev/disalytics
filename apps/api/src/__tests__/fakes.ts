import type {
  CacheLike,
  D1Like,
  D1StatementLike,
  Env,
  ExecutionContextLike,
  KvLike,
} from '../shared/cloudflare/bindings';

export interface FakeRow {
  readonly id: string;
  readonly map: string;
  readonly body: string;
  readonly deleted: boolean;
}

export interface FakeD1 extends D1Like {
  readonly batches: { readonly sql: string; readonly values: readonly unknown[] }[][];
  reads: number;
}

/** Answers the two reads the Worker makes from fixed rows and records every batched write. */
export function fakeD1(rows: readonly FakeRow[], revisions: Record<string, number>): FakeD1 {
  const batches: FakeD1['batches'] = [];
  const db: FakeD1 = {
    batches,
    reads: 0,
    prepare(sql) {
      let values: readonly unknown[] = [];
      const statement: D1StatementLike & { sql: string; values: readonly unknown[] } = {
        sql,
        get values() {
          return values;
        },
        bind(...bound) {
          values = bound;
          return statement;
        },
        async all<T>() {
          db.reads += 1;
          const live = rows.filter((row) => row.map === values[0] && !row.deleted);
          return { results: live.map((row) => ({ body: row.body })) as unknown as T[] };
        },
        async first<T>() {
          db.reads += 1;
          if (sql.includes('lineup_revisions')) {
            const revision = revisions[String(values[0])];
            return (revision === undefined ? null : { revision }) as T | null;
          }
          const row = rows.find((candidate) => candidate.id === values[0] && !candidate.deleted);
          return (row === undefined ? null : { map: row.map }) as T | null;
        },
        async run() {
          return undefined;
        },
      };
      return statement;
    },
    async batch(statements) {
      batches.push(
        statements.map((statement) => {
          const recorded = statement as unknown as { sql: string; values: readonly unknown[] };
          return { sql: recorded.sql, values: recorded.values };
        }),
      );
      return [];
    },
  };
  return db;
}

export function fakeKv(entries: Record<string, { bytes: number[]; contentType?: string }>): KvLike {
  return {
    async getWithMetadata(key) {
      const entry = entries[key];
      if (entry === undefined) return { value: null, metadata: null };
      return {
        value: new Uint8Array(entry.bytes).buffer,
        metadata: entry.contentType === undefined ? null : { contentType: entry.contentType },
      };
    },
    async put(key, value, options) {
      entries[key] = {
        bytes: [...new Uint8Array(value)],
        ...(options?.metadata?.contentType === undefined
          ? {}
          : { contentType: options.metadata.contentType }),
      };
    },
  };
}

export function fakeCache(): CacheLike & { readonly entries: Map<string, Response> } {
  const entries = new Map<string, Response>();
  return {
    entries,
    async match(request) {
      return entries.get(request.url)?.clone();
    },
    async put(request, response) {
      entries.set(request.url, response);
    },
  };
}

export const noWait: ExecutionContextLike = { waitUntil() {} };

export function env(db: D1Like, photos: KvLike): Env {
  return { LINEUPS_DB: db, LINEUP_PHOTOS: photos };
}
