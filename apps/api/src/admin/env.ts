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
  /** Public base of the photo route, no trailing slash: where `/photos/<sha256>` is served. */
  readonly PHOTO_BASE_URL: string;
  /** The parent domain of the admin and the web app, for the `disa_admin` hint cookie; unset locally. */
  readonly ADMIN_HINT_DOMAIN?: string | undefined;
  /**
   * Local development only. Honoured when the request host is localhost, ignored everywhere else;
   * kept in `.dev.vars`, never in `wrangler.admin.jsonc`.
   */
  readonly ALLOW_DEV_IDENTITY?: string | undefined;
}
