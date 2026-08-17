import type { TranslationKey } from '@disa/i18n';

/**
 * What a key does, named by the action rather than by the key. The screen supplies the actions and
 * this table decides which key reaches them, which is what lets `docs/DESIGN.md` §10.6's help table
 * be *generated from the bindings* instead of written beside them and left to drift.
 */
export type ShortcutAction =
  | 'playPause'
  | 'stepBack'
  | 'stepForward'
  | 'previousRound'
  | 'nextRound'
  | 'clearSelection'
  | 'help';

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
    action: 'clearSelection',
    triggers: ['Escape'],
    labels: [{ path: 'help.keys.escape' }],
    descriptionPath: 'help.shortcut.clearSelection',
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
