import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's default scales. A utility named after one of our tokens is
 * guessed at, and `text-12` is guessed to be a colour, so `cn('text-primary-foreground', 'text-12')`
 * used to drop the colour and leave the size. Each list below is a scale `tokens.css` defines under
 * `@theme`, and has to grow with it.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['10', '11', '12', '13', '14', '16', '20', '28', '44'],
      radius: ['chip', 'card', 'float', 'sheet'],
      leading: ['dense', 'prose'],
      tracking: ['label'],
      font: ['ui', 'mono'],
      shadow: ['float'],
      ease: ['spring'],
    },
    classGroups: {
      h: [{ h: ['control', 'control-lg'] }],
      'min-h': [{ 'min-h': ['control', 'control-lg'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
