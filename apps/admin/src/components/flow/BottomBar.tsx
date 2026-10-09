import { type RichTranslationValues, Text, type TranslationKey } from '@disa/i18n';
import { Button } from '@disa/ui';
import type { ReactNode } from 'react';
import type { Totals } from '../../helpers/summary';

function Count({ value, children }: { value: number; children: ReactNode }) {
  return (
    <span>
      <b className="numeric font-semibold text-ink">{value}</b> {children}
    </span>
  );
}

/** The counts stay in view all the way through; the button on the right is the one next step. */
export function BottomBar({ totals, children }: { totals: Totals | null; children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 [border-block-start:1px_solid_var(--color-line-strong)] bg-surface-1 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-5 gap-y-2">
        {totals === null ? null : (
          <p className="m-0 flex flex-wrap gap-x-3.5 gap-y-1 text-13 text-ink-dim">
            <Count value={totals.add}>
              <Text path="admin.bar.add" values={{ count: totals.add }} />
            </Count>
            <Count value={totals.update}>
              <Text path="admin.bar.update" values={{ count: totals.update }} />
            </Count>
            {totals.remove > 0 ? (
              <Count value={totals.remove}>
                <Text path="admin.bar.remove" values={{ count: totals.remove }} />
              </Count>
            ) : null}
            <Count value={totals.same}>
              <Text path="admin.bar.same" values={{ count: totals.same }} />
            </Count>
          </p>
        )}
        <div className="ms-auto flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  );
}

export function BarButton({
  label,
  onClick,
  disabled,
  primary,
  values,
}: {
  label: TranslationKey;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  values?: RichTranslationValues | undefined;
}) {
  return (
    <Button
      variant={primary === true ? 'primary' : 'outline'}
      size="lg"
      disabled={disabled === true}
      onClick={onClick}
    >
      <Text path={label} {...(values === undefined ? {} : { values })} />
    </Button>
  );
}
