import { Text, type TranslationKey } from '@disa/i18n';
import { cn, DURATION_BASE_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { type KeyboardEvent, useId } from 'react';

export type TabId = 'import' | 'onSite' | 'people' | 'contributors' | 'history';

const LABELS: Readonly<Record<TabId, TranslationKey>> = {
  import: 'admin.tabs.import',
  onSite: 'admin.tabs.onSite',
  people: 'admin.tabs.people',
  contributors: 'admin.tabs.contributors',
  history: 'admin.tabs.history',
};

export function tabPanelId(prefix: string, tab: TabId): string {
  return `${prefix}-panel-${tab}`;
}

/** The sections of the page. Left and Right move between them; the panel under each is the page's. */
export function SectionTabs({
  tabs,
  active,
  onChange,
  idPrefix,
}: {
  tabs: readonly TabId[];
  active: TabId;
  onChange: (tab: TabId) => void;
  idPrefix: string;
}) {
  const underline = useId();
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (next === undefined) return;
    onChange(next);
    document.getElementById(`${idPrefix}-tab-${next}`)?.focus();
  };

  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-line border-b">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          id={`${idPrefix}-tab-${tab}`}
          type="button"
          role="tab"
          aria-selected={tab === active}
          aria-controls={tabPanelId(idPrefix, tab)}
          tabIndex={tab === active ? 0 : -1}
          onClick={() => onChange(tab)}
          onKeyDown={(event) => move(event, index)}
          className={cn(
            'relative whitespace-nowrap px-3.5 py-2.5 font-medium text-14 transition-[color] duration-(--duration-micro)',
            tab === active ? 'text-ink' : 'text-ink-dim hover:text-ink',
          )}
        >
          <Text path={LABELS[tab]} />
          {tab === active ? (
            <motion.span
              layoutId={underline}
              aria-hidden="true"
              className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink"
              transition={{ duration: DURATION_BASE_SECONDS, ease: EASE_OUT }}
            />
          ) : null}
        </button>
      ))}
    </div>
  );
}
