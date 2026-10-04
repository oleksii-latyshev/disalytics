import { GRENADE_REFERENCES } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { GrenadeCard } from './GrenadeCard';
import { GrenadeDurationChart } from './GrenadeDurationChart';

export function GrenadeReference() {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <h3 className="text-20 font-medium leading-dense">
          <Text path="library.tools.grenades.title" />
        </h3>
        <p className="mt-1 text-13 text-ink-dim leading-prose">
          <Text path="library.tools.grenades.note" />
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(22rem,1fr))] sm:gap-4">
        {GRENADE_REFERENCES.map((grenade) => (
          <li key={grenade.id} className="flex">
            <GrenadeCard grenade={grenade} />
          </li>
        ))}
      </ul>
      <GrenadeDurationChart />
    </section>
  );
}
