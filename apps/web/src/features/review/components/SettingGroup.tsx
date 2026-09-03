import { Text, type TranslationKey } from '@disa/i18n';
import {
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  DURATION_MICRO_SECONDS,
  EASE_OUT,
} from '@disa/ui';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  value: string;
  titlePath: TranslationKey;
  children: ReactNode;
}

/* The panel's own motion, and it is an override rather than a preference. The primitive animates
   `height` from 0 to `auto`, which hard rule 9 forbids at every moment rather than during playback,
   and the panel spreads the caller's props over its defaults — so naming these here is what replaces
   the height tween instead of adding to it.

   The exit carries its own duration because an exit is what blocks the unmount: fading a panel out
   and *then* collapsing it moves every row beneath it after the reader has stopped looking at the
   thing that moved. Closing is instant, opening fades, and the height change is a change rather than
   an animation in both directions. */
const PANEL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
  transition: { duration: DURATION_MICRO_SECONDS, ease: EASE_OUT },
} as const;

/**
 * One group of the settings table, as a section the reader can close.
 *
 * The sheet held thirteen rows of equal weight and three screens of scrolling, which is a list to be
 * searched rather than a page to be read. A group is the unit a reader actually arrives with — *the
 * plate is wrong*, *the keys are wrong* — so the group name is the thing that answers first and the
 * rows underneath it are what the answer opens onto.
 *
 * The heading keeps `--color-ink-dim`: it is the one piece of type here with a reading in it that is
 * not a setting, and §14's floor is what stops it going quieter than that.
 */
export function SettingGroup({ value, titlePath, children }: Props) {
  return (
    <AccordionItem value={value} className="border-b border-line last:border-b-0">
      <AccordionHeader>
        <AccordionTrigger className="flex h-control-lg w-full cursor-pointer items-center justify-between gap-4 rounded-chip text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:text-ink data-[panel-open]:text-ink data-[panel-open]:[&>svg]:rotate-180">
          <span className="label-dense">
            <Text path={titlePath} />
          </span>

          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-(--duration-micro) ease-out"
          />
        </AccordionTrigger>
      </AccordionHeader>

      <AccordionPanel {...PANEL_MOTION}>
        <div className="flex flex-col gap-5 pt-1 pb-6">{children}</div>
      </AccordionPanel>
    </AccordionItem>
  );
}
