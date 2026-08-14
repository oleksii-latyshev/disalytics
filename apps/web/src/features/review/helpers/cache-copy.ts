import type { TranslationKey } from '@disa/i18n';
import type { CacheState } from '@/core/parsing';

/**
 * What the review screen says about storage, which is only the two answers a reader can act on:
 * it is being written, or it is not being kept. A demo that stored successfully says nothing —
 * that is the expected outcome, and #142's saved list is where it shows up next visit.
 *
 * Not saying "not saved" would be the real cost. A directory handle taken before the cache was
 * cleared fails every write silently, and the only thing that ever revealed it was this line.
 */
export function cacheNoticeKey(cache: CacheState): TranslationKey | undefined {
  switch (cache.status) {
    case 'storing':
      return 'library.cache.storing';
    case 'unavailable':
      return 'library.cache.unavailable';
    case 'restored':
    case 'stored':
      return undefined;
  }
}
