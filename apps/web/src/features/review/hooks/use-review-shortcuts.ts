import {
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
  roundIndexAtFrame,
  roundOpeningFrame,
} from '@disa/demo-core';
import { useCallback, useMemo } from 'react';
import type { Transport } from '@/core/playback';
import { useSetting } from '@/core/settings';
import {
  CT_ROW_KEYS,
  type ShortcutAction,
  type ShortcutPress,
  T_ROW_KEYS,
  useShortcuts,
} from '@/core/shortcuts';
import { createArrowPress } from '../helpers/arrow-press';

interface Options {
  demo: ParsedDemo;
  transport: Transport;
  /** The rosters as the *current* round holds them, since §9.1's row keys index into a side. */
  ct: readonly PlayerInfo[];
  t: readonly PlayerInfo[];
  /** True while a sheet covers the stage: `Esc` is the dialog's then, not the table's. */
  isSuspended: boolean;
  onToggleSelected: (slot: PlayerSlot) => void;
  onClearSelection: () => void;
  onFullscreenToggle: () => void;
  onMatchOverlay: () => void;
  /** §17 rule 9's binding for the view switch: the next view in the order the switch lists them. */
  onNextView: () => void;
  onHelp: () => void;
}

/**
 * DESIGN.md §9's accessibility floor: the match is operable without a pointer. Which key reaches
 * which action is `core/shortcuts`' table, so the help sheet lists exactly what is bound here.
 *
 * The two settings §10.5 gives the arrow row are read here rather than on the stage, because this is
 * where they are obeyed. The plate's own two keys are bound where the view they move lives.
 */
export function useReviewShortcuts({
  demo,
  transport,
  ct,
  t,
  isSuspended,
  onToggleSelected,
  onClearSelection,
  onFullscreenToggle,
  onMatchOverlay,
  onNextView,
  onHelp,
}: Options): void {
  const [seekStepSeconds] = useSetting('seekStepSeconds');
  const [heldArrowRate] = useSetting('heldArrowRate');

  const jumpRounds = useCallback(
    (rounds: number) => {
      const current = roundIndexAtFrame(demo, transport.clock.frame);
      const wanted = current === undefined ? 0 : current + rounds;
      const last = demo.events.rounds.length - 1;

      transport.seek(roundOpeningFrame(demo, Math.max(Math.min(wanted, last), 0)));
    },
    [demo, transport],
  );

  // DESIGN.md §9.1's arrow row, both halves of it. A tap seeks by the configured step; a hold is a
  // *rate* the transport owns rather than a stream of seeks — releasing it puts back the rate and
  // the play state it interrupted. Which one a press was is `createArrowPress`'s to decide.
  const arrows = useMemo(
    () =>
      createArrowPress({
        seek: (direction) =>
          transport.seek(transport.clock.frame + direction * seekStepSeconds * demo.track.sampleHz),
        hold: (direction) => transport.holdScrub(direction * heldArrowRate),
        release: transport.releaseScrub,
      }),
    [demo, transport, seekStepSeconds, heldArrowRate],
  );

  const releaseAction = useCallback(
    (action: ShortcutAction) => {
      if (action === 'seekBack') arrows.release(-1);
      if (action === 'seekForward') arrows.release(1);
    },
    [arrows],
  );

  const selectRow = useCallback(
    (players: readonly PlayerInfo[], keys: readonly string[], press: ShortcutPress) => {
      const player = players[keys.indexOf(press.key)];

      if (player !== undefined) onToggleSelected(player.slot);
    },
    [onToggleSelected],
  );

  useShortcuts(
    {
      playPause: transport.toggle,
      seekBack: (press) => arrows.press(-1, press.isRepeat),
      seekForward: (press) => arrows.press(1, press.isRepeat),
      stepBack: () => transport.step(-1),
      stepForward: () => transport.step(1),
      previousRound: () => jumpRounds(-1),
      nextRound: () => jumpRounds(1),
      selectTRow: (press) => selectRow(t, T_ROW_KEYS, press),
      selectCtRow: (press) => selectRow(ct, CT_ROW_KEYS, press),
      clearSelection: onClearSelection,
      fullscreen: onFullscreenToggle,
      matchOverlay: onMatchOverlay,
      nextView: onNextView,
      help: onHelp,
    },
    { isSuspended, onRelease: releaseAction },
  );
}
