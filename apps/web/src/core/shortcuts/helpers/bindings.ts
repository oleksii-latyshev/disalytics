import type { TranslationKey } from '@disa/i18n';

/**
 * What a key does, named by the action rather than by the key. The screen supplies the actions and
 * this table decides which key reaches them, which is what lets `docs/DESIGN.md` §10.6's help table
 * be *generated from the bindings* instead of written beside them and left to drift.
 */
export type ShortcutAction =
  | 'playPause'
  | 'seekBack'
  | 'seekForward'
  | 'stepBack'
  | 'stepForward'
  | 'previousRound'
  | 'nextRound'
  | 'selectTRow'
  | 'selectCtRow'
  | 'clearSelection'
  | 'fullscreen'
  | 'matchOverlay'
  | 'zoomIn'
  | 'zoomOut'
  | 'help';

/**
 * The row keys in the order the team cards list their players, so the key a reader pressed and the
 * seat it selects are read from one place. `0` is the fifth CT seat and nothing else: the range is
 * contiguous and cannot give up its last member, which is how DESIGN.md §9.1 settles the collision
 * with the zoom reset.
 */
export const T_ROW_KEYS: readonly string[] = ['1', '2', '3', '4', '5'];
export const CT_ROW_KEYS: readonly string[] = ['6', '7', '8', '9', '0'];

/**
 * A key as the reader sees it. `literal` is a character on the keycap and the same in every locale;
 * `path` is a key with a name, and a name is chrome — `Space` is `Пробел` in Russian.
 */
export type KeyLabel = { readonly literal: string } | { readonly path: TranslationKey };

export interface ShortcutBinding {
  readonly action: ShortcutAction;
  /** The `event.key` values that fire it. */
  readonly triggers: readonly string[];
  /** How the help sheet prints the keys, in the order it prints them. */
  readonly labels: readonly KeyLabel[];
  readonly descriptionPath: TranslationKey;
}

/** DESIGN.md §9.1, in the document's own order. Rows without an action here are not bound yet. */
export const SHORTCUT_BINDINGS: readonly ShortcutBinding[] = [
  {
    action: 'playPause',
    triggers: [' '],
    labels: [{ path: 'help.keys.space' }],
    descriptionPath: 'help.shortcut.playPause',
  },
  {
    action: 'seekBack',
    triggers: ['ArrowLeft'],
    labels: [{ literal: '←' }],
    descriptionPath: 'help.shortcut.seekBack',
  },
  {
    action: 'seekForward',
    triggers: ['ArrowRight'],
    labels: [{ literal: '→' }],
    descriptionPath: 'help.shortcut.seekForward',
  },
  {
    action: 'stepBack',
    triggers: [','],
    labels: [{ literal: ',' }],
    descriptionPath: 'help.shortcut.stepBack',
  },
  {
    action: 'stepForward',
    triggers: ['.'],
    labels: [{ literal: '.' }],
    descriptionPath: 'help.shortcut.stepForward',
  },
  {
    action: 'previousRound',
    triggers: ['['],
    labels: [{ literal: '[' }],
    descriptionPath: 'help.shortcut.previousRound',
  },
  {
    action: 'nextRound',
    triggers: [']'],
    labels: [{ literal: ']' }],
    descriptionPath: 'help.shortcut.nextRound',
  },
  {
    action: 'selectTRow',
    triggers: T_ROW_KEYS,
    labels: [{ literal: '1–5' }],
    descriptionPath: 'help.shortcut.selectTRow',
  },
  {
    action: 'selectCtRow',
    triggers: CT_ROW_KEYS,
    labels: [{ literal: '6–0' }],
    descriptionPath: 'help.shortcut.selectCtRow',
  },
  {
    action: 'clearSelection',
    triggers: ['Escape'],
    labels: [{ path: 'help.keys.escape' }],
    descriptionPath: 'help.shortcut.clearSelection',
  },
  {
    action: 'fullscreen',
    triggers: ['f', 'F'],
    labels: [{ literal: 'F' }],
    descriptionPath: 'help.shortcut.fullscreen',
  },
  {
    action: 'matchOverlay',
    // Both cases, because a keycap prints one letter and `event.key` reports what was typed: `M`
    // arrives lower case unshifted and upper case with `Shift`, and §9.1 binds the key, not the
    // shift state.
    triggers: ['m', 'M'],
    labels: [{ literal: 'M' }],
    descriptionPath: 'help.shortcut.matchOverlay',
  },
  {
    // `=` is the same keycap unshifted, and a reader who has just pressed `-` for the other half of
    // the pair has no reason to reach for `Shift` for this one.
    action: 'zoomIn',
    triggers: ['+', '='],
    labels: [{ literal: '+' }],
    descriptionPath: 'help.shortcut.zoomIn',
  },
  {
    action: 'zoomOut',
    triggers: ['-', '_'],
    labels: [{ literal: '−' }],
    descriptionPath: 'help.shortcut.zoomOut',
  },
  {
    action: 'help',
    triggers: ['?'],
    labels: [{ literal: '?' }],
    descriptionPath: 'help.shortcut.help',
  },
];

/** The action a key press asks for, or `undefined` when the key is not bound. */
export function actionForKey(key: string): ShortcutAction | undefined {
  for (const binding of SHORTCUT_BINDINGS) {
    if (binding.triggers.includes(key)) return binding.action;
  }

  return undefined;
}
