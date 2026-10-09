import { Text } from '@disa/i18n';
import { mapOptions } from '../../helpers/format';
import { mapsOf } from '../../helpers/lineup-file';
import { CATEGORIES, CATEGORY_TONE, countCategories } from '../../helpers/summary';
import type { Review } from '../../hooks/use-review';
import { FileDrop } from '../FileDrop';
import { MapPicker } from '../MapPicker';
import { Notice } from '../Notice';
import { Muted } from '../Section';
import { Card, Dot } from './Parts';

export function StepFile({
  map,
  onMap,
  review,
}: {
  map: string;
  onMap: (map: string) => void;
  review: Review;
}) {
  const { loaded, data, preview } = review;
  const counts = countCategories(review.rows);
  return (
    <Card>
      <h2 className="font-semibold text-20 text-ink">
        <Text path="admin.file.title" />
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-14 text-ink-dim">
        <Text path="admin.file.hint" />
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <MapPicker
          map={map}
          options={mapOptions(loaded === null ? [] : mapsOf(loaded.file.lineups))}
          onChange={onMap}
        />
        <FileDrop file={loaded?.file ?? null} onFile={review.open} />
        {review.problem !== null && !review.problem.ok ? (
          <Notice failure={{ key: review.problem.key, detail: review.problem.detail }} />
        ) : null}
      </div>

      {loaded !== null && preview.status === 'error' ? (
        <div className="mt-4">
          <Notice failure={preview.failure} onRetry={review.reloadPreview} />
        </div>
      ) : null}
      {loaded !== null && (preview.status === 'loading' || preview.status === 'idle') ? (
        <div className="mt-4">
          <Muted>
            <Text path="admin.preview.loading" />
          </Muted>
        </div>
      ) : null}

      {data !== null ? (
        <>
          <h3 className="mt-6 font-semibold text-16 text-ink">
            <Text path="admin.file.found" values={{ count: review.rows.length, map: data.map }} />
          </h3>
          {data.ignored > 0 ? (
            <p className="mt-1 text-13 text-ink-faint">
              <Text path="admin.file.otherMaps" values={{ count: data.ignored }} />
            </p>
          ) : null}
          {review.rows.length === 0 ? (
            <p className="mt-3 text-14 text-ink-dim">
              <Text path="admin.preview.empty" values={{ map: data.map }} />
            </p>
          ) : (
            <ul className="mt-4 grid list-none grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5 p-0">
              {CATEGORIES.map((category) => (
                <li
                  key={category}
                  className="flex flex-col gap-1 rounded-chip border border-line bg-surface-2 p-3.5"
                >
                  <span className="inline-flex items-center gap-1.5 text-13 text-ink-dim">
                    <Dot tone={CATEGORY_TONE[category]} />
                    <Text path={`admin.summary.${category}`} />
                  </span>
                  <b className="numeric font-semibold text-28 text-ink">{counts[category]}</b>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </Card>
  );
}
