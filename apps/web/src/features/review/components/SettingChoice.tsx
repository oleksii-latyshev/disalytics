import { type TranslationKey, useT } from '@disa/i18n';
import {
  ToggleGroup,
  ToggleGroupHighlight,
  ToggleGroupItem,
  ToggleGroupItemHighlight,
} from '@disa/ui';
import type { ReactNode } from 'react';

export interface ChoiceOption<T> {
  readonly value: T;
  readonly label: ReactNode;
}

const HIGHLIGHT_TRANSITION = { type: 'spring', stiffness: 420, damping: 38 } as const;

/**
 * A setting with named answers rather than two states — half the table is written that way, and a
 * switch would not say which answer it left.
 *
 * It is the round strip's control at another size: one toggle group, one tab stop, the arrow keys
 * walking the answers, and the chosen one lit by a highlight that slides between them on
 * `transform`. It was a row of buttons each carrying its own `aria-pressed` until #280, which is the
 * same reading with the roving focus re-implemented per row.
 *
 * **An option is addressed by its index rather than by its own value.** The table holds numbers as
 * well as strings — a seek step is `5`, a rate is `2` — and a group speaks in strings, so passing
 * the value through would need parsing back into whichever type this row happens to hold.
 */
export function SettingChoice<T extends string | number>({
  labelPath,
  value,
  options,
  onChange,
}: {
  labelPath: TranslationKey;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (value: T) => void;
}) {
  const t = useT();
  const chosen = options.findIndex((option) => option.value === value);

  function handleValueChange(values: readonly string[]): void {
    // A single-choice group unpresses what was pressed, so choosing the answer already chosen
    // arrives here as an empty selection. A setting always holds an answer, so that press keeps the
    // one it has rather than clearing it.
    const pressed = values.at(0);
    if (pressed === undefined) return;

    const option = options[Number(pressed)];
    if (option !== undefined) onChange(option.value);
  }

  return (
    <ToggleGroup
      aria-label={t(labelPath)}
      value={chosen === -1 ? [] : [String(chosen)]}
      onValueChange={handleValueChange}
      className="flex shrink-0 items-stretch gap-0.5 rounded-chip bg-surface-2 p-0.5"
    >
      <ToggleGroupHighlight className="rounded-chip bg-selected" transition={HIGHLIGHT_TRANSITION}>
        {options.map((option, index) => (
          // The seat is `relative` so the button's own text paints above the highlight, which is an
          // absolutely positioned sibling at `z-index: 0`.
          <span key={option.value} className="relative">
            <ToggleGroupItemHighlight
              value={String(index)}
              // The effect writes `aria-selected` onto the seat as well as onto what it wraps, and a
              // generic element may not carry it. The reading is the button's own `aria-pressed`.
              aria-selected={undefined}
              className="size-full"
            >
              <ToggleGroupItem
                value={String(index)}
                className="flex h-control cursor-pointer items-center justify-center rounded-chip px-2.5 text-13 text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:text-ink aria-pressed:text-ink"
              >
                {option.label}
              </ToggleGroupItem>
            </ToggleGroupItemHighlight>
          </span>
        ))}
      </ToggleGroupHighlight>
    </ToggleGroup>
  );
}
