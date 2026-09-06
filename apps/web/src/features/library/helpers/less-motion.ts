import type { MotionPreference } from '@/core/settings';

/**
 * Whether the reader has asked for less movement, for the two things on the way in that animate in
 * JavaScript rather than in CSS: the pixel field and the watcher on the card.
 *
 * `packages/ui/src/styles/motion.css` covers transitions and cannot reach either of them — a shader
 * loop and a canvas draw are not properties a stylesheet can take to zero — so this is the same
 * three answers read a second way, and `system` is the only one that asks the device.
 */
export function prefersLessMotion(setting: MotionPreference): boolean {
  if (setting === 'reduced') return true;
  if (setting === 'full') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
