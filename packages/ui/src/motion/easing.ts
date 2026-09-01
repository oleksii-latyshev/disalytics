/**
 * `--ease-out` from the token layer, as the four numbers `motion` needs.
 *
 * The token layer states this curve in CSS and nothing can read a custom property out of it from
 * JavaScript without a layout pass, so the value exists twice by necessity. It exists twice and not
 * three times: this is the copy, it lives in the package that owns `motion`, and every animation in
 * the product — the sheets and the dialog here, the review screen's assembly in `apps/web` — reads
 * it from here.
 */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** `--duration-base`, `--duration-micro` and `--duration-panel` in the seconds `motion` counts in. */
export const DURATION_BASE_SECONDS = 0.22;
export const DURATION_MICRO_SECONDS = 0.14;
export const DURATION_PANEL_SECONDS = 0.34;
