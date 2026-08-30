/**
 * The weapons this product has a silhouette of its own for, named the way Counter-Strike names them
 * internally — which is also what `Kill.weapon` carries, so a kill's icon is a set membership test
 * rather than a third table.
 *
 * It lives in `demo-core` and the drawings do not: this is the vocabulary, and a renderer that
 * cannot answer one of these ids fails to compile.
 */
export const WEAPON_ICON_IDS = [
  'ak47',
  'aug',
  'awp',
  'bizon',
  'cz75a',
  'deagle',
  'elite',
  'famas',
  'fiveseven',
  'g3sg1',
  'galilar',
  'glock',
  'hkp2000',
  'knife',
  'm249',
  'm4a1',
  'm4a1_silencer',
  'mac10',
  'mag7',
  'mp5sd',
  'mp7',
  'mp9',
  'negev',
  'nova',
  'p250',
  'p90',
  'revolver',
  'sawedoff',
  'scar20',
  'sg556',
  'ssg08',
  'taser',
  'tec9',
  'ump45',
  'usp_silencer',
  'xm1014',
] as const;

export type WeaponIconId = (typeof WEAPON_ICON_IDS)[number];

const IDS: ReadonlySet<string> = new Set(WEAPON_ICON_IDS);

export function isWeaponIconId(value: string): value is WeaponIconId {
  return IDS.has(value);
}
