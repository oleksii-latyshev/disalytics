import type { UtilityKind } from '@disa/demo-core';
import type { RadarColors } from '@/features/radar';

export function grenadeColorOfKind(kind: UtilityKind, colors: RadarColors): string {
  switch (kind) {
    case 'he':
      return colors.nadeHe;
    case 'flash':
      return colors.blind;
    case 'smoke':
      return colors.nadeSmoke;
    case 'fire':
      return colors.nadeMolotov;
    case 'decoy':
      return colors.nadeDecoy;
    default:
      return colors.selectionRing;
  }
}
