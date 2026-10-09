/**
 * Where the radar images are served from: the web app, which carries them as static assets. They are
 * only drawn, never read back, so they need no CORS headers.
 */
export const RADAR_IMAGE_BASE = (() => {
  const configured: unknown = import.meta.env.VITE_DISALYTICS_WEB_URL;
  const base =
    typeof configured === 'string' && configured !== ''
      ? configured
      : 'https://disalytics.disa-67b.workers.dev';
  return base.endsWith('/') ? base : `${base}/`;
})();
