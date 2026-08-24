import { type TranslationKey, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import type { ReactNode } from 'react';

export interface ChoiceOption<T> {
  readonly value: T;
  readonly label: ReactNode;
}

interface Props<T> {
  labelPath: TranslationKey;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
}

/**
 * A setting with named answers rather than two states — §10.5 writes half its table that way, and
 * a switch would not say which answer it left. The active option carries `aria-pressed` rather
 * than a radio group: these are buttons that act immediately, not a form the reader submits.
 */
export function SettingChoice<T extends string | number>({
  labelPath,
  value,
  options,
  onChange,
}: Props<T>) {
  const t = useT();

  return (
    <fieldset aria-label={t(labelPath)} className="flex shrink-0 gap-1">
      {options.map((option) => {
        const isChosen = option.value === value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={isChosen ? 'secondary' : 'ghost'}
            aria-pressed={isChosen}
            onClick={isChosen ? undefined : () => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </fieldset>
  );
}
