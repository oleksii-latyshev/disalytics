import {
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
  roundIndexAtFrame,
  roundOpeningFrame,
} from '@disa/demo-core';
import { useCallback } from 'react';
import type { Transport } from '@/core/playback';
import { useSetting } from '@/core/settings';
import {
  CT_ROW_KEYS,
  type ShortcutAction,
  type ShortcutPress,
  T_ROW_KEYS,
  useShortcuts,
} from '@/core/shortcuts';

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

  // DESIGN.md §9.1's arrow row, both halves of it. A tap seeks by the configured step; the
  // keyboard's own repeat is what turns the same key into a hold, and a hold is a *rate* the
  // transport owns rather than a stream of seeks — releasing it puts back the rate and the play
  // state it interrupted.
  const seekBy = useCallback(
    (direction: 1 | -1, press: ShortcutPress) => {
      if (press.isRepeat) {
        transport.holdScrub(direction * heldArrowRate);
        return;
      }

      transport.seek(transport.clock.frame + direction * seekStepSeconds * demo.track.sampleHz);
    },
    [demo, transport, seekStepSeconds, heldArrowRate],
  );

  const releaseAction = useCallback(
    (action: ShortcutAction) => {
      if (action === 'seekBack' || action === 'seekForward') transport.releaseScrub();
    },
    [transport],
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
      seekBack: (press) => seekBy(-1, press),
      seekForward: (press) => seekBy(1, press),
      stepBack: () => transport.step(-1),
      stepForward: () => transport.step(1),
      previousRound: () => jumpRounds(-1),
      nextRound: () => jumpRounds(1),
      selectTRow: (press) => selectRow(t, T_ROW_KEYS, press),
      selectCtRow: (press) => selectRow(ct, CT_ROW_KEYS, press),
      clearSelection: onClearSelection,
      fullscreen: onFullscreenToggle,
      matchOverlay: onMatchOverlay,
      help: onHelp,
    },
    { isSuspended, onRelease: releaseAction },
  );
}
