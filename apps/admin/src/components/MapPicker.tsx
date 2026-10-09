import { Text } from '@disa/i18n';

export const SELECT_CLASS =
  'h-control rounded-chip border border-line bg-surface-2 px-2 text-13 text-ink hover:border-line-strong disabled:opacity-50';

export function MapPicker({
  map,
  options,
  onChange,
}: {
  map: string;
  options: readonly string[];
  onChange: (map: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-12 text-ink-dim">
        <Text path="admin.map.label" />
      </span>
      <select
        className={`${SELECT_CLASS} numeric w-48`}
        value={map}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-12 text-ink-faint">
        <Text path="admin.map.note" />
      </span>
    </label>
  );
}
