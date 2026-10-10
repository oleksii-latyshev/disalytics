import { Context } from 'effect';
import type { LinkPhoto } from './helpers/link-photos';

export interface AdminConfigShape {
  /** No trailing slash. */
  readonly photoBaseUrl: string;
  /** The parent domain the web app's "you are an admin" hint cookie is shared on; unset locally. */
  readonly hintDomain: string | undefined;
  readonly devIdentity: string | undefined;
  /** Replaces the network fetch of a link photo; tests supply canned answers. */
  readonly fetchPhoto: ((url: string) => Promise<LinkPhoto>) | null;
  readonly now: () => number;
}

/** What this request's deployment is configured with. Absent means unconfigured: refuse. */
export class AdminConfig extends Context.Service<AdminConfig, AdminConfigShape>()(
  'disalytics/admin/AdminConfig',
) {}
