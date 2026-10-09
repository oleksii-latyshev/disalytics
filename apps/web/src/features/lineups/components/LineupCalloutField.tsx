import { Text, useT } from '@disa/i18n';
import { getMapCallouts } from '@disa/map-data';
import { Input } from '@disa/ui';
import { useMemo } from 'react';
import { LineupOptionalMark } from './LineupOptionalMark';

interface LineupCalloutFieldProps {
  readonly map: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function LineupCalloutField({ map, value, onChange }: LineupCalloutFieldProps) {
  const t = useT();
  const callouts = useMemo(() => getMapCallouts(map), [map]);
  const quickSuggestions = useMemo(() => callouts.slice(0, 8), [callouts]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor="lineup-callout" className="label-dense text-ink-dim">
          <Text path="library.lineups.form.callout" />
          <LineupOptionalMark />
        </label>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-11 text-ink-dim hover:text-ink"
          >
            <Text path="library.lineups.form.clearCallout" />
          </button>
        )}
      </div>
      <Input
        id="lineup-callout"
        type="text"
        list="lineup-callout-suggestions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('library.lineups.form.calloutPlaceholder')}
        className="h-8 bg-surface-1"
      />
      <datalist id="lineup-callout-suggestions">
        {callouts.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>
      {quickSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-10 text-ink-dim">
            <Text path="library.lineups.form.suggestedCallouts" />:
          </span>
          {quickSuggestions.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onChange(c.name)}
              className={`rounded-chip border px-2 py-0.5 text-11 transition-colors ${
                value === c.name
                  ? 'border-line bg-surface-3 font-medium text-ink'
                  : 'border-transparent bg-surface-1 text-ink-dim hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
