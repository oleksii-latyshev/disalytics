import { Context } from 'effect';
import type { KeyCache } from './auth/verify';
import type { LinkPhoto } from './helpers/link-photos';

export interface AdminConfigShape {
  readonly teamDomain: string;
  readonly audience: string;
  /** No trailing slash. */
  readonly photoBaseUrl: string;
  readonly devIdentity: string | undefined;
  /** Replaces the per-isolate JWKS cache; tests supply their own keys. */
  readonly keys: KeyCache | null;
  /** Replaces the network fetch of a link photo; tests supply canned answers. */
  readonly fetchPhoto: ((url: string) => Promise<LinkPhoto>) | null;
  readonly now: () => number;
}

/** What this request's deployment is configured with. Absent means unconfigured: refuse. */
export class AdminConfig extends Context.Service<AdminConfig, AdminConfigShape>()(
  'disalytics/admin/AdminConfig',
) {}
