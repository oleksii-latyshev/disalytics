import type { TacticTool } from './tactic-editor-state';

export interface BoardHintInput {
  readonly tool: TacticTool;
  readonly selectedSlot: number | null;
  readonly isDead: boolean;
  readonly isShown: boolean;
  /** Whether the route under the pointer has no walkable way, or null when none is shown. */
  readonly isPreviewUnreachable: boolean | null;
  readonly lineupCount: number;
  readonly hasPickedEnemy?: boolean | undefined;
}

export interface BoardHint {
  readonly key:
    | 'playing'
    | 'pickPlayer'
    | 'dead'
    | 'select'
    | 'route'
    | 'routeBroken'
    | 'pen'
    | 'grenade'
    | 'grenadeNone'
    | 'enemy'
    | 'enemyPicked';
  readonly slot: number;
}

/** What the line under the map tells the reader to do next. */
export function boardHint(input: BoardHintInput): BoardHint {
  const slot = (input.selectedSlot ?? 0) + 1;
  if (input.isShown) return { key: 'playing', slot };
  if (input.tool === 'enemy') {
    return { key: input.hasPickedEnemy === true ? 'enemyPicked' : 'enemy', slot };
  }
  if (input.tool === 'select') return { key: 'select', slot };
  if (input.selectedSlot === null) return { key: 'pickPlayer', slot };
  if (input.isDead) return { key: 'dead', slot };
  if (input.tool === 'route') {
    return { key: input.isPreviewUnreachable === true ? 'routeBroken' : 'route', slot };
  }
  if (input.tool === 'pen') return { key: 'pen', slot };
  return { key: input.lineupCount === 0 ? 'grenadeNone' : 'grenade', slot };
}
