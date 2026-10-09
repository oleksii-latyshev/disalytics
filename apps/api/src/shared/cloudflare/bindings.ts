/** The slice of D1 this Worker uses. The real `D1Database` satisfies it; tests supply a fake. */
export interface D1StatementLike {
  bind(...values: readonly unknown[]): D1StatementLike;
  all<T = Record<string, unknown>>(): Promise<{ readonly results: readonly T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1Like {
  prepare(sql: string): D1StatementLike;
  batch(statements: readonly D1StatementLike[]): Promise<readonly unknown[]>;
}

export interface PhotoMetadata {
  readonly contentType?: string;
}

/** The slice of Workers KV this Worker uses. */
export interface KvLike {
  getWithMetadata(
    key: string,
    type: 'arrayBuffer',
  ): Promise<{ readonly value: ArrayBuffer | null; readonly metadata: unknown }>;
  put(
    key: string,
    value: ArrayBuffer,
    options?: { readonly metadata?: PhotoMetadata },
  ): Promise<void>;
}

export interface CacheLike {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface Env {
  readonly LINEUPS_DB: D1Like;
  readonly LINEUP_PHOTOS: KvLike;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface RequestContext {
  readonly env: Env;
  readonly ctx: ExecutionContextLike;
  /** Cloudflare's per-data-center cache; `null` where the runtime has none (tests, Node). */
  readonly cache: CacheLike | null;
}
