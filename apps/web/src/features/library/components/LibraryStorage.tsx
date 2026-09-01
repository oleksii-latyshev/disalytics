import { CACHE_BYTE_LIMIT, type SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { cachedByteTotal, megabytesOf } from '../helpers/saved-list';
import { useStorageReport } from '../hooks/use-storage-report';
import { MetaDot } from './MetaDot';

interface Props {
  demos: readonly SavedDemo[];
}

/**
 * Two storage figures from two places, and the failure to avoid is conflating them. **The demos' own
 * total is ours** — the exact sum of what the catalog wrote, stated against `CACHE_BYTE_LIMIT`,
 * because that ceiling is what actually evicts. **The device's is the browser's** — every byte this
 * origin holds, padded deliberately by browsers, so it is quoted as an estimate and never as the
 * limit.
 *
 * The persistence line is a fact about the device rather than an error, and it is said once.
 */
export function LibraryStorage({ demos }: Props) {
  const { persistence, estimate } = useStorageReport();

  return (
    <div className="flex flex-col gap-1 text-12 text-ink-dim leading-prose">
      {/* The two figures share a line. They are two views of one thing and reading them as one
          sentence is what stops the reader taking them for two separate quotas — and three stacked
          lines of tabular type under a heading reads as a log rather than as a note. */}
      <p className="numeric flex flex-wrap items-baseline gap-x-2">
        <Text
          path="library.grid.cacheTotal"
          values={{
            used: Math.round(megabytesOf(cachedByteTotal(demos))),
            limit: Math.round(megabytesOf(CACHE_BYTE_LIMIT)),
          }}
        />

        {estimate !== null && (
          <>
            <MetaDot />
            <Text
              path="library.grid.estimate"
              values={{
                used: Math.round(megabytesOf(estimate.usage)),
                quota: Math.round(megabytesOf(estimate.quota)),
              }}
            />
          </>
        )}
      </p>

      {persistence === 'best-effort' && (
        <p>
          <Text path="library.grid.persistence" />
        </p>
      )}
    </div>
  );
}
