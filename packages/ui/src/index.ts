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
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from './components/animate-ui/components/base/accordion';
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
export {
  Progress,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from './components/animate-ui/components/base/progress';
export { Radio, RadioGroup } from './components/animate-ui/components/base/radio';
export {
  Tabs,
  TabsList,
  TabsPanel,
  TabsPanels,
  TabsTab,
} from './components/animate-ui/components/base/tabs';
export { Toggle, toggleVariants } from './components/animate-ui/components/base/toggle';
// Upstream names the item inside a group `Toggle` as well, which is the same word for the standalone
// control above. The alias is this barrel's, not an edit to the file: a caller writing
// `<ToggleGroup><ToggleGroupItem/></ToggleGroup>` reads correctly, and re-adding either component
// from the CLI still overwrites cleanly.
export {
  Toggle as ToggleGroupItem,
  ToggleGroup,
} from './components/animate-ui/components/base/toggle-group';
export {
  Tooltip,
  TooltipPanel,
  TooltipTrigger,
} from './components/animate-ui/components/base/tooltip';

/* The registry's `Dialog` and `Switch` are deliberately not re-exported, and neither is its own
   `Button`.

   `Dialog` and `Sheet` above are a native `<dialog>` opened with `showModal()`: the top layer, the
   focus trap and the `Esc` close request are the platform's, and the registry's version would ship a
   second focus manager to arrive at the same behaviour. `Switch` above is a plain checkbox, which is
   what gives it `Space`, the label association and the checked state assistive technology reads for
   free. Both files are still on disk and still update from the CLI; a screen that wants one exports
   it here with the screen in front of it. */

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

export { MotionProvider } from './motion/provider';
export type { TargetAndTransition, Transition } from './motion/re-export';
export { AnimatePresence, m, motion } from './motion/re-export';
