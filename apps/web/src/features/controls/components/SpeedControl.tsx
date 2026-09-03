import { Text, useT } from '@disa/i18n';
import { buttonVariants, ToggleGroup, ToggleGroupItem } from '@disa/ui';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { type Transport, usePlaybackScrub, usePlaybackSpeed } from '@/core/playback';
import { PLAYBACK_SPEEDS } from '../constants/speeds';

interface Props {
  transport: Transport;
}

/**
 * The four speeds, as the one-of-four choice they are: a toggle group since #279, which is what
 * gives the row its pressed state, its single tab stop and its arrow keys without any of the three
 * being written here.
 *
 * **It is still a `fieldset`**, rendered rather than replaced, because that is what the measurement
 * recipe uses to tell this row from a player row when it walks the page.
 *
 * The entries take the shared control's own variants rather than a set of classes of their own:
 * there is one vocabulary for a 32px control in this product, and a group that restated it would be
 * free to drift from the step buttons standing beside it.
 */
export function SpeedControl({ transport }: Props) {
  const t = useT();
  const speed = usePlaybackSpeed(transport);
  const scrub = usePlaybackScrub(transport);

  function handleValueChange(values: readonly string[]): void {
    const pressed = values.at(0);

    // Pressing the speed already playing unpresses it in a single-choice group, and there is no such
    // thing as no speed: the row is left where it was.
    if (pressed !== undefined) transport.setSpeed(Number(pressed));
  }

  // The pressed entry stays on the speed the reader *chose* — a held arrow is a rate the transport
  // owns for as long as the key is down, and a temporary rate that lit a button here would read as a
  // setting nobody changed. The mark keeps its box while nothing is held, or the row would move
  // under the pointer at the moment the reader starts scrubbing.
  return (
    <div className="flex items-center gap-2">
      <ToggleGroup
        render={<fieldset />}
        aria-label={t('controls.speed')}
        value={[String(speed)]}
        onValueChange={handleValueChange}
        className="flex gap-1"
      >
        {PLAYBACK_SPEEDS.map((option) => (
          <ToggleGroupItem
            key={option}
            value={String(option)}
            className={buttonVariants({ variant: option === speed ? 'secondary' : 'outline' })}
          >
            <Text path="controls.speedValue" values={{ speed: option }} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center text-ink"
      >
        {scrub !== null &&
          (scrub < 0 ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />)}
      </span>
    </div>
  );
}
