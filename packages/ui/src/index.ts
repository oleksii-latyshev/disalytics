/* The package's one entrance. Nothing outside this package imports a component by path — a screen
   that does is reaching past the boundary that makes these components ownable.

   Three groups, and the difference between them is who maintains them:

   1. **Ours**, in `components/*.tsx`. Written here, styled here, changed here.
   2. **The registry's**, under `components/animate-ui/`. Added by `shadcn add` from animate-ui's
      registry and left as it arrives — they read the token layer through `shadcn.css`'s bridge, so
      they take this product's palette without being edited. Re-adding one overwrites it, which is
      the point.
   3. **Motion**, re-exported so the package that owns the dependency stays the only one declaring
      it. Two declarations could resolve to two copies. */

// --- Ours -------------------------------------------------------------------------------------

export { Button, buttonVariants } from './components/button';
export { Dialog } from './components/dialog';
export { Input, inputVariants } from './components/input';
export { Sheet } from './components/sheet';
export { Switch } from './components/switch';
export { cn } from './lib/utils';

// --- The registry's ---------------------------------------------------------------------------

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/animate-ui/components/base/alert-dialog';
export { Checkbox } from './components/animate-ui/components/base/checkbox';
export {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPanel,
  MenuPortal,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from './components/animate-ui/components/base/menu';
export {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPanel,
  PopoverTitle,
  PopoverTrigger,
} from './components/animate-ui/components/base/popover';
export { Radio, RadioGroup } from './components/animate-ui/components/base/radio';
export {
  Tabs,
  TabsList,
  TabsPanel,
  TabsPanels,
  TabsTab,
} from './components/animate-ui/components/base/tabs';
export { Toggle, toggleVariants } from './components/animate-ui/components/base/toggle';
export {
  Tooltip,
  TooltipPanel,
  TooltipTrigger,
} from './components/animate-ui/components/base/tooltip';
/* The accordion comes from the primitive layer for the reason `Progress` and the toggle group do —
   what it gives is behaviour, and the styling is the caller's — and there is a second reason here
   that is a rule rather than a preference. The registry's styled trigger is `transition-all` at
   Tailwind's own `duration-200`, which is the loaded gun #134 took off the shared controls; and the
   primitive's panel animates `height` from 0 to `auto`, which hard rule 9 forbids at every moment
   rather than during playback. A caller overrides the second by passing its own `initial`/`animate`
   /`exit`, because the panel spreads the caller's props over its defaults — `SettingGroup` is where
   that is done and why. */
export {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from './components/animate-ui/primitives/base/accordion';
/* The progress parts come from the primitive layer for the reason the effects below do — what they
   give is behaviour, and the styling is the caller's. There is a second reason here and it is a
   rule: the registry's styled `ProgressTrack` renders its own indicator, and that indicator animates
   `width`. A bar in this product **scales, it does not resize** — `transform: scaleX()` — because
   `width` triggers layout at every moment of the animation, which hard rule 9 forbids. The
   indicator is the caller's element for that reason and no other. */
export {
  Progress,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from './components/animate-ui/primitives/base/progress';
/* The toggle group comes from the primitive layer for the reason `Progress` does — what it gives is
   behaviour, and the styling is the caller's. The styled group over it fixes three things a caller
   cannot reach: its highlight fill (`bg-accent`), its `w-fit` width and its own gap. The round strip
   is thirty equal-width pills with a wider break at every half, and its lit pill is the product's
   own `--color-selected`; none of those is a class name away from what the styled component draws.

   Upstream names the item inside a group `Toggle`, which is the same word as the standalone control
   above, and the highlight parts after the effect they drive. Both aliases are this barrel's rather
   than an edit to the file, so re-adding either component from the CLI still overwrites cleanly. */
export {
  Toggle as ToggleGroupItem,
  ToggleGroup,
  ToggleGroupHighlight,
  ToggleHighlight as ToggleGroupItemHighlight,
} from './components/animate-ui/primitives/base/toggle-group';

/* The registry's styled `Dialog`, `Switch` and `Button` are still not re-exported, and the reason is
   now different for each of the three.

   **`Dialog` changed hands in #277.** `Dialog` and `Sheet` above are built on the registry's dialog
   *primitive* — Base UI's dialog, one implementation for both surfaces — rather than on the native
   `<dialog>` they were until then. What is not re-exported is the styled component on top of it,
   which arrives with its own header, footer, close button and a `filter: blur()` on the way in.
   `Switch` above is a plain checkbox, which is what gives it `Space`, the label association and the
   checked state assistive technology reads for free. Both files are still on disk and still update
   from the CLI; a screen that wants one exports it here with the screen in front of it. */

// Effects and numbers, taken from the registry's primitive layer rather than its styled one: what
// these give is behaviour, and the styling is the caller's.
export { AutoHeight } from './components/animate-ui/primitives/effects/auto-height';
export {
  Highlight,
  HighlightItem,
  useHighlight,
} from './components/animate-ui/primitives/effects/highlight';
export { CountingNumber } from './components/animate-ui/primitives/texts/counting-number';
export { SlidingNumber } from './components/animate-ui/primitives/texts/sliding-number';

// --- Motion -----------------------------------------------------------------------------------

export {
  DURATION_BASE_SECONDS,
  DURATION_MICRO_SECONDS,
  DURATION_PANEL_SECONDS,
  EASE_OUT,
} from './motion/easing';
export { MotionProvider } from './motion/provider';
export type { TargetAndTransition, Transition } from './motion/re-export';
export { AnimatePresence, m, motion } from './motion/re-export';
