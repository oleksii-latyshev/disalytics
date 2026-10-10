/** The cookie the admin sets on the shared parent domain once someone has signed in to it. */
export const ADMIN_HINT_COOKIE = 'disa_admin';

const DEFAULT_ADMIN_URL = 'https://disalytics-admin.disa-67b.workers.dev';

/** Where the admin is: `VITE_DISALYTICS_ADMIN_URL`, else production. */
export function adminUrl(): string {
  const configured: unknown = import.meta.env.VITE_DISALYTICS_ADMIN_URL;
  return typeof configured === 'string' && configured !== '' ? configured : DEFAULT_ADMIN_URL;
}

/**
 * Whether a `document.cookie` string carries the admin's hint. The hint only decides whether to
 * show a link: the admin signs people in by itself, so a forged cookie opens nothing.
 */
export function hasAdminHint(cookie: string): boolean {
  return cookie.split(';').some((part) => part.trim() === `${ADMIN_HINT_COOKIE}=1`);
}

/** The hint in this browser, read once; a browser without cookies reads as no hint. */
export function readAdminHint(): boolean {
  try {
    return hasAdminHint(document.cookie);
  } catch {
    return false;
  }
}
