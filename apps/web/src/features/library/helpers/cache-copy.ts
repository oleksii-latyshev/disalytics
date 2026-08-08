import type { TranslationKey } from '@disa/i18n';
import type { CacheState } from '@/core/parsing';

/**
 * A browser that declines persistence is the ordinary case rather than the broken one, so the two
 * answers get their own sentence each instead of one that hedges.
 */
export function cacheKey(cache: CacheState): TranslationKey {
  switch (cache.status) {
    case 'restored':
      return 'library.cache.restored';
    case 'storing':
      return 'library.cache.storing';
    case 'stored':
      return cache.persistence === 'persisted'
        ? 'library.cache.stored'
        : 'library.cache.storedBestEffort';
    case 'unavailable':
      return 'library.cache.unavailable';
  }
}
