/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  type PrecacheEntry,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
// Past the barrel on purpose: the barrel is the page's hook, and this bundle must not carry React.
import { SKIP_WAITING_MESSAGE } from './core/pwa/constants/messages';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (PrecacheEntry | string)[];
};

// No clientsClaim, and skipWaiting only on the reader's word: taking over silently is the
// stale-shell bug AGENTS.md §12 warns about.
self.addEventListener('message', (event) => {
  if (event.data === SKIP_WAITING_MESSAGE) void self.skipWaiting();
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Every navigation is the shell. The app has no routes of its own, and the paths that do arrive —
// the manifest's `/open` file handler, or anything typed — are served by Cloudflare's SPA fallback,
// which is not there offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
