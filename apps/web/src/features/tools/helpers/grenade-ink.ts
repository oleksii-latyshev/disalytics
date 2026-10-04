import type { GrenadeReference } from '@disa/demo-core';

interface GrenadeInk {
  readonly bar: string;
  readonly ring: string;
  readonly border: string;
  readonly fill: string;
  readonly from: string;
}

const SMOKE: GrenadeInk = {
  bar: 'bg-nade-smoke',
  ring: 'ring-nade-smoke/35',
  border: 'border-nade-smoke',
  fill: 'bg-nade-smoke/20',
  from: 'from-nade-smoke',
};
const FIRE: GrenadeInk = {
  bar: 'bg-nade-molotov',
  ring: 'ring-nade-molotov/35',
  border: 'border-nade-molotov',
  fill: 'bg-nade-molotov/20',
  from: 'from-nade-molotov',
};
const FLASH: GrenadeInk = {
  bar: 'bg-nade-flash',
  ring: 'ring-nade-flash/35',
  border: 'border-nade-flash',
  fill: 'bg-nade-flash/20',
  from: 'from-nade-flash',
};
const HE: GrenadeInk = {
  bar: 'bg-nade-he',
  ring: 'ring-nade-he/35',
  border: 'border-nade-he',
  fill: 'bg-nade-he/20',
  from: 'from-nade-he',
};
const DECOY: GrenadeInk = {
  bar: 'bg-nade-decoy',
  ring: 'ring-nade-decoy/35',
  border: 'border-nade-decoy',
  fill: 'bg-nade-decoy/20',
  from: 'from-nade-decoy',
};

/** Each grenade's own data colour, spelled out so Tailwind sees every class. */
export const GRENADE_INK: Readonly<Record<GrenadeReference['id'], GrenadeInk>> = {
  smoke: SMOKE,
  fire: FIRE,
  incendiary: FIRE,
  flash: FLASH,
  he: HE,
  decoy: DECOY,
  kit: DECOY,
};
