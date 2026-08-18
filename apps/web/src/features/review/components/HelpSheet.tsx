import { Text, useT } from '@disa/i18n';
import { Button, Sheet } from '@disa/ui';
import { X } from 'lucide-react';
import { type KeyLabel, SHORTCUT_BINDINGS } from '@/core/shortcuts';

interface Props {
  isOpen: boolean;
  onDismiss: () => void;
}

function KeyCap({ label }: { label: KeyLabel }) {
  return (
    <kbd className="numeric inline-flex h-6 min-w-6 items-center justify-center rounded-control border border-line bg-surface-1 px-1.5 text-13 text-ink">
      {'literal' in label ? label.literal : <Text path={label.path} />}
    </kbd>
  );
}

/**
 * DESIGN.md §10.6's sheet. Two of its three parts: what the product does, and the keyboard table
 * **generated from `core/shortcuts`' own bindings** rather than written out here — §10.6 asks for one
 * source precisely because a hand-kept table drifts from the keyboard within two issues, and this is
 * the same argument §7.3 made for `RoundOutcomes` being the round list rather than a copy of it.
 *
 * The third part, the legend of every mark on the plate, is not here. It has to read the tokens the
 * renderer reads to be worth anything, which is its own issue rather than a paragraph of this one.
 */
export function HelpSheet({ isOpen, onDismiss }: Props) {
  const t = useT();

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

          <p className="text-15 text-ink-dim leading-prose">
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

                <dd className="text-15">
                  <Text path={binding.descriptionPath} />
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-13 text-ink-faint leading-prose">
            <Text path="help.keyboard.note" />
          </p>
        </section>
      </div>
    </Sheet>
  );
}
