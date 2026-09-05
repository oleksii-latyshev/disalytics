import type { GrenadeType } from '@disa/demo-core';
import { readCssToken } from '@/shared/lib';
import { LABEL_HALO_PX, LABEL_SIZE_PX } from './labels';

/**
 * How many parts a body is made of. One number for both readings, because what tells a cloud from a
 * fire is how the parts are arranged and whether they are joined — not how many there are.
 */
export const BODY_PART_COUNT = 8;

/** Each part is an offset from the centre and a radius, all as fractions of the body's own. */
const VALUES_PER_PART = 3;

/**
 * How far a part's centre may sit from the body's, and how big a part is, per reading.
 *
 * The smoke's numbers were tuned by looking: parts close to the centre with a large radius union
 * into something a reader calls a circle, however jittered the arithmetic is. Pushing them out and
 * shrinking them is what puts lobes on the edge — which is the whole of #170's third complaint.
 */
const SMOKE_SCATTER = 0.46;
const SMOKE_PART_RADIUS = 0.54;
const FIRE_SCATTER = 0.62;
const FIRE_PART_RADIUS = 0.3;

/** How much a part's radius may vary from its reading's own, as a fraction. */
const PART_RADIUS_SPREAD = 0.8;

/**
 * A deterministic value in [0, 1) from two integers. Not a good hash and does not need to be: what
 * it owes is the same answer for the same grenade on every frame, every replay and every machine,
 * which is `AGENTS.md` §8's determinism arriving in a draw.
 */
function scatter(seed: number, step: number): number {
  const mixed = Math.sin(seed * 127.1 + step * 311.7) * 43_758.545;
  return mixed - Math.floor(mixed);
}

/**
 * The parts of every grenade's body, laid out once per demo — `docs/PARSER.md` §23 measured the
 * recording carrying no shape at all, so this is where the shape comes from.
 *
 * One flat buffer rather than an array of objects, and built ahead of the first frame rather than
 * per grenade per frame: a body has to be the same shape every time it is drawn, and a draw may not
 * allocate (`AGENTS.md` §9). Every grenade gets a layout whether or not its type has a body — the
 * index arithmetic is what makes the lookup free, and 519 grenades is 50 kB.
 */
export function bodyParts(grenades: readonly { readonly type: GrenadeType }[]): Float32Array {
  const parts = new Float32Array(grenades.length * BODY_PART_COUNT * VALUES_PER_PART);

  for (let index = 0; index < grenades.length; index++) {
    const isFire = grenades[index]?.type !== 'smokegrenade';
    const spread = isFire ? FIRE_SCATTER : SMOKE_SCATTER;
    const size = isFire ? FIRE_PART_RADIUS : SMOKE_PART_RADIUS;

    for (let part = 0; part < BODY_PART_COUNT; part++) {
      // Around the body rather than at random angles: eight parts scattered freely leave a gap on
      // one side often enough to read as a defect, and the jitter is what stops it being a flower.
      const angle = ((part + scatter(index, part)) / BODY_PART_COUNT) * Math.PI * 2;
      const distance = spread * (0.45 + 0.55 * scatter(index, part + BODY_PART_COUNT));
      const at = (index * BODY_PART_COUNT + part) * VALUES_PER_PART;

      parts[at] = Math.cos(angle) * distance;
      parts[at + 1] = Math.sin(angle) * distance;
      parts[at + 2] =
        size *
        (1 -
          PART_RADIUS_SPREAD / 2 +
          PART_RADIUS_SPREAD * scatter(index, part + BODY_PART_COUNT * 2));
    }
  }

  return parts;
}

/**
 * A smoke: one irregular body, not a disc — #170.
 *
 * Every part is traced into **one** path and filled once, so the overlaps disappear into a single
 * soft shape at a single opacity rather than stacking into a blotch, and the whole cloud costs one
 * fill however many parts it is made of. `moveTo` before each arc is what keeps them separate
 * subpaths; without it the canvas joins them with a line.
 */
export function drawSmokeBody(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  alpha: number,
  color: string,
  parts: Float32Array,
  index: number,
): void {
  if (radiusPx <= 0 || alpha <= 0) return;

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();

  for (let part = 0; part < BODY_PART_COUNT; part++) {
    const at = (index * BODY_PART_COUNT + part) * VALUES_PER_PART;
    const px = x + (parts[at] ?? 0) * radiusPx;
    const py = y + (parts[at + 1] ?? 0) * radiusPx;
    const pr = (parts[at + 2] ?? 0) * radiusPx;

    context.moveTo(px + pr, py);
    context.arc(px, py, pr, 0, Math.PI * 2);
  }

  context.fill();
  context.restore();
}

/**
 * A fire: separate patches of flame that do **not** join into an area — which is the whole of the
 * difference from the cloud above, and the answer to #170's "a second disc with a rougher outline".
 * A molotov burns in patches with floor showing between them, and a reader crossing one wants to
 * know that.
 *
 * Each patch is its own fill, so the plate pays one per part rather than one per body. That is the
 * cost this reading is worth: `docs/PARSER.md` §23 counts at most eight areas standing at once.
 */
export function drawFireBody(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  alpha: number,
  color: string,
  parts: Float32Array,
  index: number,
): void {
  if (radiusPx <= 0 || alpha <= 0) return;

  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;

  for (let part = 0; part < BODY_PART_COUNT; part++) {
    const at = (index * BODY_PART_COUNT + part) * VALUES_PER_PART;
    const pr = (parts[at + 2] ?? 0) * radiusPx;
    if (pr <= 0) continue;

    context.beginPath();
    context.arc(
      x + (parts[at] ?? 0) * radiusPx,
      y + (parts[at + 1] ?? 0) * radiusPx,
      pr,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.restore();
}

/**
 * Below this radius in device pixels a body has no room for the number in its middle, and states
 * nothing rather than covering itself with a digit.
 *
 * Measured at 1024×800, where the plate is 473 and a smoke's 144 world units come to **15.1px** of
 * radius — so at the smallest viewport the product supports, a full-size cloud is just over the
 * line and a cloud still filling is under it. That is the intent: the number arrives with the cloud.
 *
 * It is not raised for the unit the string gained, though the widest reading — two digits and a
 * letter, about 23px of the mono face at this size — leaves only a couple of pixels either side of
 * a body at exactly this radius. Raising it is what would take the countdown off a full-size cloud
 * at 1024×800 altogether, and a tight reading beats an absent one.
 */
export const COUNTDOWN_MIN_RADIUS_PX = 14;

/**
 * The countdown is set at the size a player's name is, and haloed the same way — the owner's
 * reading of 5 September 2026, that at 11px it was there and could not be read. The two are the
 * only text this canvas draws, so one size is what keeps them one voice.
 *
 * The face is the mono one rather than the label's: this is a number, and `CLAUDE.md`'s standing
 * rule is that every number in this product is set in tabular figures.
 */
export function resolveCountdownFont(): string {
  return `${LABEL_SIZE_PX}px ${readCssToken('--font-mono')}`;
}

/**
 * How many seconds of countdown the table below holds. A smoke is the longest body in the product at
 * about 18 s and a fire burns for 7, so this is generous rather than tight — and a body somehow
 * longer-lived than the table simply says nothing, which is the same answer it gives a body too
 * small to hold the reading.
 */
const COUNTDOWN_MAX_SECONDS = 60;

/**
 * Every reading a countdown can show, composed once — `0s`, `1s`, … — because the alternative is a
 * template literal per body per frame, and `AGENTS.md` §9 keeps allocation out of a draw. Eight
 * bodies at 60 fps is 480 strings a second that this table does not make.
 */
export function countdownLabels(unit: string): readonly string[] {
  const labels: string[] = [];
  for (let seconds = 0; seconds <= COUNTDOWN_MAX_SECONDS; seconds++) {
    labels.push(`${seconds}${unit}`);
  }

  return labels;
}

/**
 * What is left of a body, in whole seconds, in its own centre — the owner's decision of 5 September
 * 2026 and the one mark on this plate that is text against §6.1's case for none.
 *
 * The readings arrive already composed and already translated, because a canvas cannot reach the
 * message catalogue and a draw may not build a string. It was built without a unit at all — the digits alone are the same reading in both locales — and the owner's
 * reading of it on 5 September 2026 is that a bare number over a cloud does not say what it counts.
 * The halo is the plate's own, so it survives a bright ground the way a player's name does.
 */
export function drawRemainingSeconds(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusPx: number,
  seconds: number,
  labels: readonly string[],
  color: string,
  halo: string,
  font: string,
): void {
  if (radiusPx < COUNTDOWN_MIN_RADIUS_PX || seconds <= 0) return;

  const text = labels[seconds];
  if (text === undefined) return;

  context.save();
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = LABEL_HALO_PX;
  context.lineJoin = 'round';
  context.strokeStyle = halo;
  context.fillStyle = color;

  context.strokeText(text, x, y);
  context.fillText(text, x, y);
  context.restore();
}
