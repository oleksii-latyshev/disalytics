import { Text, type TranslationKey, useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { formatRoute, type Section } from '../helpers/route';

const LABELS: Readonly<Record<Section, TranslationKey>> = {
  overview: 'admin.tabs.overview',
  import: 'admin.tabs.import',
  onSite: 'admin.tabs.onSite',
  tactics: 'admin.tabs.tactics',
  people: 'admin.tabs.people',
  contributors: 'admin.tabs.contributors',
  history: 'admin.tabs.history',
};

/**
 * The places of the admin as links to their addresses: Back and reload keep the place, and a link
 * can be copied. Compact, because the overview is where the real choosing is done.
 */
export function SectionNav({
  sections,
  active,
}: {
  sections: readonly Section[];
  active: Section;
}) {
  const t = useT();
  return (
    <nav aria-label={t('admin.nav.label')} className="-mx-1 overflow-x-auto px-1">
      <ul className="m-0 flex list-none gap-1 p-0">
        {sections.map((section) => (
          <li key={section}>
            <a
              href={formatRoute({ section })}
              aria-current={section === active ? 'page' : undefined}
              className={cn(
                'block whitespace-nowrap rounded-card border px-3 py-1.5 font-medium text-13 transition-[color,background-color,border-color] duration-(--duration-micro)',
                section === active
                  ? 'border-line-strong bg-surface-2 text-ink'
                  : 'border-transparent text-ink-dim hover:bg-hover hover:text-ink',
              )}
            >
              <Text path={LABELS[section]} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
