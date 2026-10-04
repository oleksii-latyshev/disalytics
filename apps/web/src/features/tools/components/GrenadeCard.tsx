import type { GrenadeReference } from '@disa/demo-core';
import { Text, useLocale } from '@disa/i18n';
import { useMemo } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { ringFraction } from '../helpers/grenade-axis';
import { GRENADE_INK } from '../helpers/grenade-ink';

const SIDE_PATH = {
  both: 'library.tools.grenades.sideBoth',
  ct: 'library.tools.grenades.sideCt',
  t: 'library.tools.grenades.sideT',
} as const;

const SIDE_INK = { both: 'text-ink-faint', ct: 'text-ct', t: 'text-t' } as const;

const RING_BOX_PX = 80;

function Duration({ grenade }: { grenade: GrenadeReference }) {
  return grenade.durationSeconds === null ? (
    <Text path="library.tools.grenades.instant" />
  ) : (
    <Text path="library.tools.grenades.seconds" values={{ seconds: grenade.durationSeconds }} />
  );
}

function Reach({ grenade }: { grenade: GrenadeReference }) {
  if (grenade.radiusUnits !== null) {
    return <Text path="library.tools.grenades.units" values={{ units: grenade.radiusUnits }} />;
  }
  return grenade.kind === 'flash' ? <Text path="library.tools.grenades.los" /> : <>—</>;
}

function Damage({ grenade }: { grenade: GrenadeReference }) {
  switch (grenade.damageType) {
    case 'fire':
      return <Text path="library.tools.grenades.damageFire" />;
    case 'explosive':
      return (
        <Text
          path="library.tools.grenades.damageExplosive"
          values={{ damage: grenade.maxDamage }}
        />
      );
    case 'decoy':
      return (
        <Text path="library.tools.grenades.damageDecoy" values={{ damage: grenade.maxDamage }} />
      );
    case 'none':
      return grenade.kind === 'flash' ? (
        <Text path="library.tools.grenades.damageBlind" />
      ) : (
        <Text path="library.tools.grenades.damageNone" />
      );
  }
}

function Ring({ grenade }: { grenade: GrenadeReference }) {
  const ink = GRENADE_INK[grenade.id];
  const units = grenade.radiusUnits;
  const size = units === null ? 0 : Math.round(ringFraction(units) * RING_BOX_PX);
  return (
    <div
      aria-hidden="true"
      className="relative grid size-24 flex-none place-items-center rounded-card bg-surface-2"
    >
      {units === null ? (
        <span className={`h-0.5 w-[60px] bg-linear-to-r ${ink.from} to-transparent`} />
      ) : (
        <span
          style={{ width: size, height: size }}
          className={`rounded-full border-2 ${ink.border} ${ink.fill}`}
        />
      )}
      <span className="absolute bottom-1 text-10 text-ink-faint numeric">
        {units !== null ? (
          <Text path="library.tools.grenades.unitsShort" values={{ units }} />
        ) : grenade.kind === 'flash' ? (
          <Text path="library.tools.grenades.sightShort" />
        ) : null}
      </span>
    </div>
  );
}

function Fact({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-chip bg-surface-2 p-2 sm:flex-row sm:justify-between sm:gap-3 sm:bg-transparent sm:p-0">
      <dt className="text-12 text-ink-faint sm:text-13 sm:text-ink-dim">{label}</dt>
      <dd className="numeric text-13 sm:text-right">{children}</dd>
    </div>
  );
}

export function GrenadeCard({ grenade }: { grenade: GrenadeReference }) {
  const locale = useLocale();
  const price = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(grenade.price),
    [locale, grenade.price],
  );

  return (
    <article className="surface-card flex w-full flex-col gap-3.5 rounded-card p-3.5 sm:p-5">
      <header className="flex items-center gap-3">
        <span
          className={`grid size-11 flex-none place-items-center rounded-card bg-surface-2 ring-1 ring-inset ${GRENADE_INK[grenade.id].ring}`}
        >
          <UtilityGlyph kind={grenade.kind} size="axis" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h4 className="text-14 font-semibold sm:text-16">{grenade.name}</h4>
          <span className={`numeric text-12 ${SIDE_INK[grenade.team]}`}>
            <Text path={SIDE_PATH[grenade.team]} />
          </span>
        </div>
        <span className="numeric text-16 font-medium sm:text-20">{price}</span>
      </header>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block">
          <Ring grenade={grenade} />
        </div>
        <dl className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-1 sm:gap-2">
          <Fact label={<Text path="library.tools.grenades.lasts" />}>
            <Duration grenade={grenade} />
          </Fact>
          <Fact label={<Text path="library.tools.grenades.reach" />}>
            <Reach grenade={grenade} />
          </Fact>
          <Fact label={<Text path="library.tools.grenades.damage" />}>
            <Damage grenade={grenade} />
          </Fact>
        </dl>
      </div>
      <p className="numeric text-11 text-ink-faint leading-normal">{grenade.citation}</p>
    </article>
  );
}
