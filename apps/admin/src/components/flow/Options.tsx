import { Text, type TranslationKey } from '@disa/i18n';
import { AnimatePresence, cn, DURATION_MICRO_SECONDS, motion } from '@disa/ui';
import { useId } from 'react';

export interface Option<T extends string> {
  readonly value: T;
  readonly title: TranslationKey;
  readonly hint: TranslationKey;
  readonly disabled?: boolean;
}

/**
 * Big radio cards: what each choice does is written under it. They are real radio inputs, so the
 * arrow keys move between them and Space picks one.
 */
export function Options<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: TranslationKey;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="m-0 mt-4 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="sr-only">
        <Text path={label} />
      </legend>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'grid cursor-pointer grid-cols-[22px_minmax(0,1fr)] items-start gap-3 rounded-chip border bg-surface-2 p-3.5 transition-[border-color,background-color] duration-(--duration-micro) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-offset-2',
              checked ? 'border-ink bg-selected' : 'border-line hover:border-line-strong',
              option.disabled === true && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              disabled={option.disabled === true}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 grid size-[18px] place-items-center rounded-full border-2',
                checked ? 'border-ink' : 'border-ink-dim',
              )}
            >
              <AnimatePresence initial={false}>
                {checked ? (
                  <motion.span
                    className="size-2 rounded-full bg-ink"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: DURATION_MICRO_SECONDS }}
                  />
                ) : null}
              </AnimatePresence>
            </span>
            <span className="flex min-w-0 flex-col">
              <b className="font-semibold text-14 text-ink">
                <Text path={option.title} />
              </b>
              <span className="text-13 text-ink-dim">
                <Text path={option.hint} />
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
