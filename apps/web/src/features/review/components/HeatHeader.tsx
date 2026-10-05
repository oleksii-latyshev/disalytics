import { useT } from '@disa/i18n';
import type { ReactNode } from 'react';
import type { HeatCompareView } from '../helpers/heat-view';
import { type ChoiceOption, SettingChoice } from './SettingChoice';

interface Props {
  title: string;
  subtitle: string;
  /** The reading in its own unit, or how much the routes overlap. */
  figure: ReactNode;
  /** `null` when nobody is compared and there is nothing to switch. */
  view: HeatCompareView | null;
  onView: (view: HeatCompareView) => void;
}

/** What is on the plate, in a line, with the switch between two plates and their difference above it. */
export function HeatHeader({ title, subtitle, figure, view, onView }: Props) {
  const t = useT();
  const options: readonly ChoiceOption<HeatCompareView>[] = [
    { value: 'side', label: t('review.heat.views.side') },
    { value: 'difference', label: t('review.heat.views.difference') },
  ];

  return (
    <div className="flex min-h-9 items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-px">
        <h2 className="truncate font-semibold text-16 text-ink">{title}</h2>
        <p className="truncate text-12 text-ink-dim">{subtitle}</p>
      </div>

      {view !== null && (
        <div className="shrink-0 rounded-card border border-line-strong">
          <SettingChoice
            labelPath="review.heat.views.label"
            value={view}
            options={options}
            onChange={onView}
          />
        </div>
      )}

      <p className="numeric shrink-0 text-12 text-ink">{figure}</p>
    </div>
  );
}
