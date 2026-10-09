import type { FieldDiff } from '@disa/admin-contract';
import { localImageHash } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { formatValue } from '../helpers/format';

type Images = Readonly<Record<string, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPoint(value: unknown): value is { x: number; y: number; z: number } {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.z === 'number'
  );
}

const round = (value: number) => String(Math.round(value * 100) / 100);

function pointText(point: { x: number; y: number; z: number }): string {
  return `${round(point.x)}, ${round(point.y)}, ${round(point.z)}`;
}

function photoSource(url: string, images: Images): string | null {
  const hash = localImageHash(url);
  return hash === null ? url : (images[hash] ?? null);
}

function Photos({ urls, images }: { urls: readonly string[]; images: Images }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {[...new Set(urls)].map((url) => {
        const src = photoSource(url, images);
        return (
          <li
            key={url}
            className="size-12 overflow-hidden rounded-chip border border-line bg-surface-1"
          >
            {src === null ? null : (
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Items({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable list inside one diff cell
        <li key={`${index}:${item}`} className="numeric break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Value({ field, value, images }: { field: string; value: unknown; images: Images }) {
  const t = useT();
  if (value === undefined || value === null)
    return <span className="text-ink-faint">{t('admin.row.none')}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ink-faint">{t('admin.row.none')}</span>;
    if (field === 'imageUrls' && value.every((entry) => typeof entry === 'string')) {
      return <Photos urls={value} images={images} />;
    }
    return (
      <Items
        items={value.map((entry) =>
          isPoint(entry) ? pointText(entry) : (formatValue(entry) ?? t('admin.row.none')),
        )}
      />
    );
  }
  if (isPoint(value)) return <span className="numeric">{pointText(value)}</span>;
  return (
    <span className="numeric whitespace-pre-wrap break-words">
      {formatValue(value) ?? t('admin.row.none')}
    </span>
  );
}

/** Each field shows the stored and the incoming value side by side, stacked when there is no room. */
export function DiffList({ diff, images }: { diff: readonly FieldDiff[]; images: Images }) {
  return (
    <dl className="flex flex-col gap-2 text-12">
      {diff.map((entry) => (
        <div
          key={entry.field}
          className="flex flex-col gap-1 rounded-chip border border-line bg-surface-1 p-2"
        >
          <dt className="numeric font-medium text-ink">{entry.field}</dt>
          <dd className="m-0 grid gap-2 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-0.5 text-ink-dim">
              <span className="text-11 text-ink-faint">
                <Text path="admin.row.stored" />
              </span>
              <Value field={entry.field} value={entry.before} images={images} />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 text-ink">
              <span className="text-11 text-ink-faint">
                <Text path="admin.row.incoming" />
              </span>
              <Value field={entry.field} value={entry.after} images={images} />
            </div>
          </dd>
        </div>
      ))}
    </dl>
  );
}
