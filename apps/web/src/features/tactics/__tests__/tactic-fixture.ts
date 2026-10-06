import type { Tactic } from '@disa/demo-core';
import { type EditorTactic, fromEditorTactic } from '../helpers/editor-tactic';

/** A current tactic whose main plan is the given flat steps, written the way the board writes them. */
export function tacticFromEditor(
  editor: Omit<EditorTactic, 'spawns'> & Partial<EditorTactic>,
): Tactic {
  const { steps: _steps, ...rest } = editor;
  const blank: Tactic = {
    ...rest,
    spawns: editor.spawns ?? [],
    plans: [{ id: 'main', condition: '', parentId: null, forkAfter: 0, deaths: {}, steps: [] }],
  };
  return fromEditorTactic(blank, { ...blank, ...editor, spawns: blank.spawns });
}
