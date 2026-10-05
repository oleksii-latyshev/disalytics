import { useT } from '@disa/i18n';

/** What the marks on a lineups plate stand for, in the plate's own corner. */
export function TargetLegend() {
  const t = useT();

  return (
    <ul className="surface-card absolute bottom-2 left-2 flex list-none gap-3 rounded-card px-2.5 py-1.5 text-11 text-ink-dim">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full border-[1.5px] border-ink" />
        {t('radar.targetLegend.landed')}
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="numeric grid size-3.5 place-items-center rounded-full bg-ink font-semibold text-10 text-surface-0"
        >
          1
        </span>
        {t('radar.targetLegend.origin')}
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="w-4.5 [border-block-start:1.5px_dashed_var(--color-ink)]"
        />
        {t('radar.targetLegend.path')}
      </li>
    </ul>
  );
}
