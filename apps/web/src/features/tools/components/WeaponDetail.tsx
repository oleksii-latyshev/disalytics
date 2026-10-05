import type { ArmourState, WeaponReference } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { shotsToKill, ZONES, type Zone, zoneDamage } from '../helpers/weapon-damage';
import { BodyFigure } from './BodyFigure';
import { SideBadge } from './SideBadge';

const ZONE_PATHS = {
  head: 'library.tools.weapons.detail.zones.head',
  chest: 'library.tools.weapons.detail.zones.chest',
  stomach: 'library.tools.weapons.detail.zones.stomach',
  legs: 'library.tools.weapons.detail.zones.legs',
} as const satisfies Record<Zone, string>;

const ARMOUR_NOTES = {
  none: 'library.tools.weapons.detail.noteNone',
  vest: 'library.tools.weapons.detail.noteVest',
  vestHelmet: 'library.tools.weapons.detail.noteVestHelmet',
} as const satisfies Record<ArmourState, string>;

function SideLabel({ team }: { team: WeaponReference['team'] }) {
  if (team === 'both') return <Text path="library.tools.weapons.sides.all" />;
  return (
    <Text path="library.tools.weapons.sides.only" values={{ side: team === 'ct' ? 'CT' : 'T' }} />
  );
}

export function WeaponDetail({
  weapon,
  armour,
  moneyFormat,
}: {
  weapon: WeaponReference;
  armour: ArmourState;
  moneyFormat: Intl.NumberFormat;
}) {
  const damage = {
    head: zoneDamage(weapon, 'head', armour),
    chest: zoneDamage(weapon, 'chest', armour),
    stomach: zoneDamage(weapon, 'stomach', armour),
    legs: zoneDamage(weapon, 'legs', armour),
  };
  const pellets = weapon.pellets;

  return (
    <aside
      aria-live="polite"
      className="flex flex-col gap-4 rounded-card bg-surface-1 p-4 shadow-[0_0_0_1px_var(--color-line-strong)] lg:sticky lg:top-6 lg:p-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-20 font-medium leading-dense md:text-28">{weapon.name}</h4>
        <span className="flex items-center gap-2 text-12 text-ink-dim">
          <SideBadge team={weapon.team} />
          <SideLabel team={weapon.team} />
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Stat label="library.tools.weapons.detail.price">{moneyFormat.format(weapon.price)}</Stat>
        <Stat label="library.tools.weapons.detail.killReward">
          {moneyFormat.format(weapon.killReward)}
        </Stat>
        <Stat label="library.tools.weapons.detail.rpm">{weapon.fireRateRpm}</Stat>
      </dl>

      <div className="flex items-center gap-4">
        <BodyFigure
          {...damage}
          hasVest={armour !== 'none'}
          hasHelmet={armour === 'vestHelmet'}
          className="h-[8.75rem] w-[5.25rem] shrink-0 lg:h-[12.5rem] lg:w-[7.5rem]"
        />
        <ul className="flex flex-1 flex-col gap-2 lg:gap-3">
          {ZONES.map((zone) => {
            const value = damage[zone];
            const shots = shotsToKill(value);
            return (
              <li
                key={zone}
                className="flex items-baseline justify-between gap-2 pb-2 [border-block-end:1px_solid_var(--color-line-soft)] last:border-0 last:pb-0"
              >
                <span className="text-12 text-ink-dim lg:text-13">
                  <Text path={ZONE_PATHS[zone]} />
                </span>
                <span className="flex flex-col items-end">
                  <span className="numeric text-16 lg:text-20">{value}</span>
                  <span className="numeric text-10 text-ink-faint lg:text-11">
                    {pellets !== undefined ? (
                      <Text path="library.tools.weapons.detail.pellets" values={{ count: shots }} />
                    ) : (
                      <Text path="library.tools.weapons.detail.shots" values={{ count: shots }} />
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-13">
          <span className="text-ink-dim">
            <Text path="library.tools.weapons.detail.penetration" />
          </span>
          <span className="numeric">{weapon.armorPenetration}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="presentation">
          <div
            className="h-full origin-left rounded-full bg-ink"
            style={{ width: `${weapon.armorPenetration}%` }}
          />
        </div>
      </div>

      <p className="text-12 text-ink-dim leading-prose">
        <Text path={ARMOUR_NOTES[armour]} /> <Text path="library.tools.weapons.detail.noteBasis" />
        {pellets !== undefined && (
          <>
            {' '}
            <Text path="library.tools.weapons.detail.notePellets" />
          </>
        )}
      </p>
    </aside>
  );
}

function Stat({
  label,
  children,
}: {
  label:
    | 'library.tools.weapons.detail.price'
    | 'library.tools.weapons.detail.killReward'
    | 'library.tools.weapons.detail.rpm';
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-11 text-ink-dim lg:text-12">
        <Text path={label} />
      </dt>
      <dd className="numeric text-16 lg:text-20">{children}</dd>
    </div>
  );
}
