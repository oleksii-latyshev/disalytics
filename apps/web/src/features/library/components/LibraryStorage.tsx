import { CACHE_BYTE_LIMIT, type SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { budgetShares, freeBytes } from '../helpers/library-grid';
import { cachedByteTotal, megabytesOf } from '../helpers/saved-list';
import { useStorageReport } from '../hooks/use-storage-report';

interface Props {
  demos: readonly SavedDemo[];
}

/**
 * **The demos' own total is ours** — the exact sum of what the catalog wrote, stated against
 * `CACHE_BYTE_LIMIT`, because that ceiling is what actually evicts. It is not the browser's
 * estimate of the origin, which is padded deliberately and is never the limit.
 *
 * One segment per demo, so the bar reads as the library itself. The persistence line is a fact
 * about the device rather than an error, and it is said once.
 */
export function LibraryStorage({ demos }: Props) {
  const t = useT();
  const { persistence } = useStorageReport();
  const used = cachedByteTotal(demos);
  const shares = budgetShares(
    demos.map((demo) => demo.byteLength),
    CACHE_BYTE_LIMIT,
  );
  const limitMegabytes = Math.round(megabytesOf(CACHE_BYTE_LIMIT));

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface-1 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-11 tracking-[0.14em] text-ink-dim uppercase">
          <Text path="library.storage.title" />
        </h3>
        <p className="numeric text-13">
          <Text path="library.storage.used" values={{ used: megabytesOf(used) }} />{' '}
          <span className="text-ink-dim">
            <Text path="library.storage.of" values={{ limit: limitMegabytes }} />
          </span>
        </p>
      </div>
      <meter
        className="sr-only"
        min={0}
        max={limitMegabytes}
        value={Math.min(limitMegabytes, Math.round(megabytesOf(used)))}
        aria-label={t('library.storage.meter', {
          used: Math.round(megabytesOf(used)),
          limit: limitMegabytes,
        })}
      />
      <div
        aria-hidden="true"
        className="flex h-2 gap-[2px] overflow-hidden rounded-chip bg-surface-2"
      >
        {demos.map((demo, index) => (
          <span
            key={demo.key}
            className="block h-full min-w-[2px] bg-ink"
            style={{ width: `${shares[index]}%`, opacity: Math.max(0.3, 1 - index * 0.14) }}
          />
        ))}
      </div>
      <p className="numeric text-12 text-ink-dim leading-prose">
        <Text
          path="library.storage.free"
          values={{ free: Math.round(megabytesOf(freeBytes(used, CACHE_BYTE_LIMIT))) }}
        />{' '}
        <Text path="library.storage.eviction" />
      </p>
      {persistence === 'best-effort' && (
        <p className="text-12 text-ink-dim leading-prose">
          <Text path="library.grid.persistence" />
        </p>
      )}
    </div>
  );
}
