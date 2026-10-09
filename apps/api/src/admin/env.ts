import type { D1Binding } from '../db/client';
import type { KvBinding } from '../modules/photos';

/** The static-assets binding: the admin page. */
export interface AssetsBinding {
  fetch(request: Request): Promise<Response>;
}

export interface AdminEnv {
  readonly LINEUPS_DB: D1Binding;
  readonly LINEUP_PHOTOS: KvBinding;
  readonly ASSETS: AssetsBinding;
  /** `https://<team>.cloudflareaccess.com`. Empty until the owner enables Access. */
  readonly TEAM_DOMAIN: string;
  /** The Access application's AUD tag. Empty until the owner enables Access. */
  readonly POLICY_AUD: string;
  /** Public base of the photo route, no trailing slash: where `/photos/<sha256>` is served. */
  readonly PHOTO_BASE_URL: string;
  /**
   * Local development only. Honoured when the request host is localhost, ignored everywhere else;
   * kept in `.dev.vars`, never in `wrangler.admin.jsonc`.
   */
  readonly ALLOW_DEV_IDENTITY?: string | undefined;
}
