import { Text, useT } from '@disa/i18n';
import { Button, Sheet } from '@disa/ui';
import { X } from 'lucide-react';
import { useSetting } from '@/core/settings';
import { type KeyLabel, SHORTCUT_BINDINGS } from '@/core/shortcuts';
import { PLATE_MARKS, PlateMarkSwatch, radarColors } from '@/features/radar';

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
}

function KeyCap({ label }: { label: KeyLabel }) {
  return (
    <kbd className="numeric inline-flex h-6 min-w-6 items-center justify-center rounded-chip border border-line bg-surface-1 px-1.5 text-13 text-ink">
      {'literal' in label ? label.literal : <Text path={label.path} />}
    </kbd>
  );
}

/**
 * DESIGN.md §10.6's sheet, and all three of its parts: what the product does, the keyboard table
 * **generated from `core/shortcuts`' own bindings**, and the legend of every mark on the plate
 * **drawn by the plate's own functions**. Both of those are one argument — a table kept by hand
 * drifts from the thing it describes within two issues — and it is the argument §7.3 made for
 * `RoundOutcomes` being the round list rather than a copy of it.
 *
 * What this file owns of the legend is the copy and the order. What a mark *looks* like is
 * `features/radar`, because that is the slice that draws it.
 */
export function HelpSheet({ isOpen, onDismiss }: Props) {
  const t = useT();

  // One read for fourteen swatches rather than one per swatch, and re-read only when §10.5's
  // palette row moves — the legend has to show the marks as the plate is drawing them now.
  const [palette] = useSetting('palette');
  const colors = radarColors(palette);

  return (
    <Sheet isOpen={isOpen} onDismiss={onDismiss} aria-label={t('help.title')}>
      <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-8 p-8">
        <header className="flex items-start justify-between gap-6">
          <h2 className="font-ui text-28 leading-dense">
            <Text path="help.title" />
          </h2>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('help.dismiss')}
            onClick={onDismiss}
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <section className="flex flex-col gap-3">
          <h3 className="label-dense text-ink-dim">
            <Text path="help.about.title" />
          </h3>

          <p className="text-14 text-ink-dim leading-prose">
            <Text path="help.about.body" />
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="label-dense text-ink-dim">
            <Text path="help.keyboard.title" />
          </h3>

          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3">
            {SHORTCUT_BINDINGS.map((binding) => (
              <div
                key={binding.action}
                className="col-span-2 grid grid-cols-subgrid items-baseline"
              >
                <dt className="flex gap-1">
                  {binding.labels.map((label) => (
                    <KeyCap key={'literal' in label ? label.literal : label.path} label={label} />
                  ))}
                </dt>

                <dd className="text-14">
                  <Text path={binding.descriptionPath} />
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-13 text-ink-dim leading-prose">
            <Text path="help.keyboard.note" />
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="label-dense text-ink-dim">
            <Text path="help.legend.title" />
          </h3>

          {/* A list rather than the keyboard table's `dl`: the mark is a picture and the sentence
              beside it is the whole reading, so there is no term here to define. It is the shape
              §7.3's own legend already uses. */}
          <ul className="flex flex-col gap-3">
            {PLATE_MARKS.map((mark) => (
              <li key={mark.id} className="flex items-center gap-6 text-14 leading-prose">
                <PlateMarkSwatch mark={mark} colors={colors} />

                <span>
                  {/* A grenade's name is game vocabulary and reaches the reader untranslated —
                      AGENTS.md §11 — so it is a value beside the sentence rather than inside it. */}
                  {mark.vocabulary !== undefined && (
                    <span className="text-ink">{mark.vocabulary} — </span>
                  )}
                  <span className="text-ink-dim">
                    <Text path={`help.legend.${mark.id}`} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Sheet>
  );
}
