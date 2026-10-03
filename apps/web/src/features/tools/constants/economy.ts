export const COUNTS = [0, 1, 2, 3, 4, 5] as const;

export const REASON_PATHS = {
  elimination: 'library.tools.economy.elimination',
  'bomb-defused': 'library.tools.economy.bombDefused',
  'bomb-exploded': 'library.tools.economy.bombExploded',
  'time-expired': 'library.tools.economy.timeExpired',
} as const;

export const WEAPON_LABELS = {
  ak47: { name: 'AK-47' },
  m4: { name: 'M4' },
  smg: { path: 'library.tools.economy.weaponSmg' },
  awp: { name: 'AWP' },
  shotgun: { path: 'library.tools.economy.weaponShotgun' },
  pistol: { path: 'library.tools.economy.weaponPistol' },
  other: { path: 'library.tools.economy.otherWeapon' },
} as const;

export const ASSUMPTION_PATHS = {
  unknownWeapons: 'library.tools.economy.assumptions.unknownWeapons',
  survivorCarry: 'library.tools.economy.assumptions.survivorCarry',
  unpricedEquipment: 'library.tools.economy.assumptions.unpricedEquipment',
  unknownKills: 'library.tools.economy.assumptions.unknownKills',
  genericKillReward: 'library.tools.economy.assumptions.genericKillReward',
  unknownPlant: 'library.tools.economy.assumptions.unknownPlant',
  otherUnpriced: 'library.tools.economy.assumptions.otherUnpriced',
  unknownSurvivors: 'library.tools.economy.assumptions.unknownSurvivors',
} as const;
