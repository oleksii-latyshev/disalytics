import { Text } from '@disa/i18n';
import { useState } from 'react';
import { EconomyCalculator } from './EconomyCalculator';
import { GrenadeReferenceTable } from './GrenadeReferenceTable';
import { WeaponReferenceTable } from './WeaponReferenceTable';

type ToolTab = 'economy' | 'weapons' | 'grenades';

export function ToolsView() {
  const [activeTab, setActiveTab] = useState<ToolTab>('economy');

  return (
    <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-ui font-medium text-28 text-ink leading-dense">
            <Text path="library.tools.title" />
          </h2>
          <p className="text-14 text-ink-dim leading-prose">
            <Text path="library.tools.note" />
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 rounded-card bg-surface-2 p-1">
          {(['economy', 'weapons', 'grenades'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-8 rounded-card px-3 font-ui text-13 font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-surface-0 text-ink shadow-xs'
                  : 'text-ink-dim hover:text-ink'
              }`}
            >
              {tab === 'economy' && <Text path="library.tools.tabs.economy" />}
              {tab === 'weapons' && <Text path="library.tools.tabs.weapons" />}
              {tab === 'grenades' && <Text path="library.tools.tabs.grenades" />}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'economy' && (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-0.5">
            <h3 className="font-ui font-medium text-20 text-ink leading-dense">
              <Text path="library.tools.economy.title" />
            </h3>
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.tools.economy.note" />
            </p>
          </header>
          <EconomyCalculator />
        </section>
      )}

      {activeTab === 'weapons' && (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-0.5">
            <h3 className="font-ui font-medium text-20 text-ink leading-dense">
              <Text path="library.tools.weapons.title" />
            </h3>
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.tools.weapons.note" />
            </p>
          </header>
          <WeaponReferenceTable />
        </section>
      )}

      {activeTab === 'grenades' && (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-0.5">
            <h3 className="font-ui font-medium text-20 text-ink leading-dense">
              <Text path="library.tools.grenades.title" />
            </h3>
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.tools.grenades.note" />
            </p>
          </header>
          <GrenadeReferenceTable />
        </section>
      )}
    </div>
  );
}
