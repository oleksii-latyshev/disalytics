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
 * One answer, as the toggle it is.
 *
 * **It takes its props by name**, which is the whole of what it is for: the highlight around it
 * clones its child to inject `aria-selected` and a `data-*` set, and a component that spreads
 * nothing drops all of it on the way in — `aria-selected` is not an attribute a `button` role
 * allows, and the reading is the group's own `aria-pressed` regardless. `RoundPill` on the round
 * strip is the same answer to the same effect.
 *
 * What the clone also carried was `position: relative`, so this stands on its own layer instead:
 * the highlight is an absolutely positioned sibling at `z-index: 0`, and a static button's own text
 * paints below one however late it comes in the DOM.
 */
function ChoiceButton({ index, label }: { index: number; label: ReactNode }) {
  return (
    <ToggleGroupItem
      value={String(index)}
      className="relative flex h-control cursor-pointer items-center justify-center rounded-chip px-2.5 text-13 text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:text-ink aria-pressed:text-ink"
    >
      {label}
    </ToggleGroupItem>
  );
}

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
          <span key={option.value}>
            <ToggleGroupItemHighlight
              value={String(index)}
              // The effect writes `aria-selected` onto the seat as well as onto what it wraps, and a
              // generic element may not carry it. The reading is the button's own `aria-pressed`.
              aria-selected={undefined}
              className="size-full"
            >
              <ChoiceButton index={index} label={option.label} />
            </ToggleGroupItemHighlight>
          </span>
        ))}
      </ToggleGroupHighlight>
    </ToggleGroup>
  );
}
