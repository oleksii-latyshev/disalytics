/// <reference lib="webworker" />
import { cleanupOutdatedCaches, type PrecacheEntry, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (PrecacheEntry | string)[];
};

// No skipWaiting and no clientsClaim: an updated worker stays waiting until AGENTS.md §12's update
// prompt exists to ask for the reload. Taking over silently is the stale-shell bug §12 warns about.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
