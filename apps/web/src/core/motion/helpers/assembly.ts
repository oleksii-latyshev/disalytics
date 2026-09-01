import {
  DURATION_MICRO_SECONDS,
  DURATION_PANEL_SECONDS,
  EASE_OUT,
  type TargetAndTransition,
  type Transition,
} from '@disa/ui';

/* The durations are the token layer's, read through `@disa/ui` rather than restated as numbers —
   `--duration-panel` is what a surface arriving takes and `--duration-micro` is what a mark
   lighting takes, and the assembly is made of exactly those two things. The delays and the travel
   are this sequence's own and belong to nothing else. */
const STAGE_FADE_SECONDS = DURATION_PANEL_SECONDS;
const CARD_DELAY_SECONDS = 0.06;
const CARD_ARRIVAL_SECONDS = DURATION_PANEL_SECONDS;
const CARD_TRAVEL_PX = 16;
const STRIP_DELAY_SECONDS = 0.2;
const STRIP_FILL_SECONDS = 0.24;
const PILL_FADE_SECONDS = DURATION_MICRO_SECONDS;

/**
 * What a piece of the review screen does when the match arrives — DESIGN.md §8. `stage` is the plate
 * and the type on it, which fade where they already are; the four cards each travel from the edge
 * they live against.
 */
export type AssemblyPart = 'stage' | 'cardLeft' | 'cardRight' | 'cardTop' | 'cardBottom';

type CardPart = Exclude<AssemblyPart, 'stage'>;

export interface Arrival {
  readonly initial: TargetAndTransition;
  readonly animate: TargetAndTransition;
  readonly transition: Transition;
}

const CARD_ARRIVAL: Readonly<
  Record<CardPart, { from: TargetAndTransition; to: TargetAndTransition }>
> = {
  cardLeft: { from: { opacity: 0, x: -CARD_TRAVEL_PX }, to: { opacity: 1, x: 0 } },
  cardRight: { from: { opacity: 0, x: CARD_TRAVEL_PX }, to: { opacity: 1, x: 0 } },
  cardTop: { from: { opacity: 0, y: -CARD_TRAVEL_PX }, to: { opacity: 1, y: 0 } },
  cardBottom: { from: { opacity: 0, y: CARD_TRAVEL_PX }, to: { opacity: 1, y: 0 } },
};

/**
 * DESIGN.md §8's one orchestrated moment, as timings rather than as prose: the plate fades up, the
 * four cards arrive from their own corners, and the round strip fills left to right behind them.
 *
 * It lives in `core` because two slices read it — the stage arranges the cards, the strip fills
 * itself — and a duration with two owners drifts. It is a mount transition and nothing else: the
 * sequence runs because the screen appeared, so a re-render, a resize or a locale change cannot
 * replay it, and there is no state anywhere saying whether it has run.
 *
 * `opacity` and `transform` only, which is hard rule 9, and the reduced-motion answer is already
 * built: `MotionProvider` drops the travel and keeps the fade, so this stays one implementation
 * rather than growing a second one behind a media query.
 */
export function assembly(part: AssemblyPart): Arrival {
  if (part === 'stage') {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: STAGE_FADE_SECONDS, ease: EASE_OUT },
    };
  }

  const card = CARD_ARRIVAL[part];

  return {
    initial: card.from,
    animate: card.to,
    transition: { delay: CARD_DELAY_SECONDS, duration: CARD_ARRIVAL_SECONDS, ease: EASE_OUT },
  };
}

/**
 * One pill of §7.3's strip, lighting in its own place in the row.
 *
 * The fill is a **fixed span shared out across the rounds** rather than a step per pill: a match
 * with three overtimes has half again as many rounds as a regulation one, and a per-pill step would
 * make the same sequence run half again as long on it. The strip finishes when it finishes.
 */
export function pillArrival(index: number, count: number): Arrival {
  const progress = count < 2 ? 0 : index / (count - 1);

  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: {
      delay: STRIP_DELAY_SECONDS + STRIP_FILL_SECONDS * progress,
      duration: PILL_FADE_SECONDS,
      ease: EASE_OUT,
    },
  };
}
