import { Text, useT } from '@disa/i18n';
import { useState } from 'react';
import { EconomyCalculator } from './EconomyCalculator';
import { GrenadeReferenceTable } from './GrenadeReferenceTable';
import { WeaponReferenceTable } from './WeaponReferenceTable';

type ToolTab = 'economy' | 'weapons' | 'grenades';

const TAB_PATHS = {
  economy: 'library.tools.tabs.economy',
  weapons: 'library.tools.tabs.weapons',
  grenades: 'library.tools.tabs.grenades',
} as const;

export function ToolsView() {
  const [activeTab, setActiveTab] = useState<ToolTab>('economy');
  const t = useT();

  return (
    <div className="mx-auto flex w-full max-w-[72rem] flex-col pb-10">
      <header className="border-b border-line pb-6">
        <p className="mb-4 text-11 tracking-[0.16em] text-ink-dim uppercase">
          <Text path="library.tools.eyebrow" />
        </p>
        <h2 className="max-w-[18ch] font-ui text-[clamp(40px,5vw,64px)] font-medium leading-[1.05] tracking-[-0.055em]">
          <Text path="library.tools.hero" />
          <br />
          <span className="text-ink-dim">
            <Text path="library.tools.heroDetail" />
          </span>
        </h2>
        <p className="mt-5 max-w-[55ch] text-14 text-ink-dim leading-prose">
          <Text path="library.tools.note" />
        </p>
      </header>

      <nav
        aria-label={t('library.tools.title')}
        className="flex gap-5 overflow-x-auto border-b border-line pt-6 sm:gap-8"
      >
        {(['economy', 'weapons', 'grenades'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? 'page' : undefined}
            className={
              'shrink-0 border-b pb-3 text-13 transition-colors ' +
              (activeTab === tab
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-dim hover:text-ink')
            }
          >
            <Text path={TAB_PATHS[tab]} />
          </button>
        ))}
      </nav>

      <div className="pt-6">
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
        {activeTab === 'grenades' && (
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-20 font-medium leading-dense">
                <Text path="library.tools.grenades.title" />
              </h3>
              <p className="mt-1 text-13 text-ink-dim leading-prose">
                <Text path="library.tools.grenades.note" />
              </p>
            </div>
            <GrenadeReferenceTable />
          </section>
        )}
      </div>
    </div>
  );
}
