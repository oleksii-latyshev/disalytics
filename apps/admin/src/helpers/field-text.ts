import type { Lineup, ThrowType, WorldPoint } from '@disa/demo-core';
import type { Translate, TranslationKey } from '@disa/i18n';
import type { FieldId } from './fields';
import { isEmptyField } from './fields';

const THROW_KEYS: Readonly<Record<ThrowType, TranslationKey>> = {
  stand: 'admin.throw.stand',
  run: 'admin.throw.run',
  jump: 'admin.throw.jump',
  crouch: 'admin.throw.crouch',
  unknown: 'admin.throw.unknown',
};

function point(value: WorldPoint): string {
  return `${Math.round(value.x)}, ${Math.round(value.y)}, ${Math.round(value.z)}`;
}

function movement(lineup: Lineup): string {
  return lineup.movementKeysSummary !== ''
    ? lineup.movementKeysSummary
    : lineup.movementKeys.join(' + ');
}

/** One field of a lineup as a short line of text; empty when there is nothing there. */
export function fieldText(id: FieldId, lineup: Lineup, t: Translate): string {
  if (isEmptyField(id, lineup)) return '';
  switch (id) {
    case 'title':
      return lineup.title;
    case 'callout':
      return lineup.targetCallout ?? '';
    case 'kind':
      return lineup.kind;
    case 'side':
      return lineup.side === 'BOTH' ? t('library.lineups.bothSides') : lineup.side;
    case 'throwType':
      return t(THROW_KEYS[lineup.throwType]);
    case 'movement':
      return movement(lineup);
    case 'movementInstructions':
      return lineup.movementInstructions ?? '';
    case 'mouseButtons':
      return (lineup.mouseButtons ?? [])
        .map((button) =>
          t(
            button === 'left'
              ? 'library.lineups.mouseShort.left'
              : 'library.lineups.mouseShort.right',
          ),
        )
        .join(', ');
    case 'notes':
      return lineup.notes ?? '';
    case 'tags':
      return (lineup.tags ?? [])
        .map((tag) => t(tag === 'meta' ? 'library.lineups.tags.meta' : 'library.lineups.tags.old'))
        .join(', ');
    case 'author':
      return lineup.author === undefined
        ? ''
        : [lineup.author.name, lineup.author.url].filter(Boolean).join(' · ');
    case 'origin':
      return point(lineup.origin);
    case 'landing':
      return point(lineup.landing);
    case 'waypoints':
      return (lineup.waypoints ?? []).map(point).join(' → ');
    case 'aim':
      return `${lineup.pitch.toFixed(2)} / ${lineup.yaw.toFixed(2)}`;
    case 'command':
      return lineup.command;
    case 'landingCommand':
      return lineup.landingCommand ?? '';
    case 'mediaUrl':
      return lineup.mediaUrl ?? '';
    case 'groups':
      return [lineup.groupId, lineup.originGroupId].filter(Boolean).join(' / ');
  }
}
