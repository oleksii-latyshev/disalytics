import { Text, useT } from '@disa/i18n';
import { useState } from 'react';
import { EconomyCalculator } from './EconomyCalculator';
import { GrenadeReference } from './GrenadeReference';
import { WeaponReferenceTable } from './WeaponReferenceTable';

type ToolTab = 'economy' | 'weapons' | 'grenades';

const TAB_PATHS = {
  economy: 'library.tools.tabs.economy',
  weapons: 'library.tools.tabs.weapons',
  grenades: 'library.tools.tabs.grenades',
} as const;

const TABS = ['economy', 'weapons', 'grenades'] as const;

export function ToolsView() {
  const [activeTab, setActiveTab] = useState<ToolTab>('economy');
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-[85rem] flex-col pb-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6">
        <div className="min-w-0">
          <h2 className="font-ui text-[clamp(28px,4vw,40px)] font-bold leading-[1.05] tracking-[-0.03em]">
            <Text path="library.tools.hero" />
          </h2>
          <p className="mt-2 max-w-[55ch] text-14 text-ink-dim leading-prose">
            <Text path="library.tools.note" />
          </p>
        </div>

        <div
          role="tablist"
          aria-label={t('library.tools.title')}
          className="flex w-full gap-1 rounded-card border border-line bg-surface-1 p-1 sm:w-auto"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              id={`tools-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={
                'min-h-11 flex-1 rounded-chip px-3 text-13 transition-colors sm:flex-none sm:px-4 sm:text-14 ' +
                (activeTab === tab
                  ? 'bg-ink font-semibold text-surface-0'
                  : 'font-medium text-ink-dim hover:text-ink')
              }
            >
              <Text path={TAB_PATHS[tab]} />
            </button>
          ))}
        </div>
      </header>

      <div role="tabpanel" aria-labelledby={`tools-tab-${activeTab}`}>
        {activeTab === 'economy' && <EconomyCalculator />}
        {activeTab === 'weapons' && (
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-20 font-medium leading-dense">
                <Text path="library.tools.weapons.title" />
              </h3>
              <p className="mt-1 text-13 text-ink-dim leading-prose">
                <Text path="library.tools.weapons.note" />
              </p>
            </div>
            <WeaponReferenceTable />
          </section>
        )}
        {activeTab === 'grenades' && <GrenadeReference />}
      </div>
    </div>
  );
}
