/** The Workers runtime adds `caches.default`; the DOM library does not declare it. */
interface CacheStorage {
  readonly default: Cache;
}
