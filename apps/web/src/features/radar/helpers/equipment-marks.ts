import {
  isUtilityKind,
  type UtilityKind,
  type WeaponClass,
  type WeaponIconId,
} from '@disa/demo-core';
import {
  EQUIPMENT_ICONS,
  type EquipmentIconId,
  SILHOUETTE_HEIGHT,
  SILHOUETTE_PATHS,
  SILHOUETTE_WIDTH,
  type SilhouetteClass,
  UTILITY_ICON,
  WEAPON_ICONS,
} from '@/core/glyphs';

/**
 * The box a weapon mark is drawn in, whose **left edge** and vertical middle the caller gives.
 *
 * #164 measured a model outline in a 14×7 box as a smudge and drew class silhouettes there for that
 * reason. The finding held for the box rather than for the art, so #286 moved the box to 24×10 —
 * and 10 was the type size beside it. **The mark is exactly as tall as the name it leads**, which
 * is the invariant to keep: the two are one label, so they are one size, and raising the name to
 * §3's 13 raises this with it. The width follows at the same 2.4:1, which is where an AWP fits by
 * its width and a rifle nearly fills the height.
 *
 * The number is stated here and again as `LABEL_SIZE_PX` in `labels.ts` because that module reaches
 * for this one, and importing back would close the loop — the same reason `labelPlacer` takes its
 * box height as an argument.
 *
 * The icon is **fitted** inside the box and **right-aligned** against the name. Valve draws these to
 * one height and many widths — an AWP is three times its own height where a P2000 is square — so a
 * box wide enough for the longest gun leaves a pistol slack, and the slack goes on the outer edge
 * where the map is rather than between the mark and the word it leads. That also keeps the halo one
 * shape: a gap of `WEAPON_GAP_PX` closes under a 2px stroke, and a gap of fourteen does not.
 */
export const WEAPON_MARK_HEIGHT_PX = 13;
export const WEAPON_MARK_PX = Math.round(WEAPON_MARK_HEIGHT_PX * 2.4);

/**
 * The grenade drawn at the head of a projectile still in the air — §6.2. Square, because every
 * grenade is taller than it is wide and the box is what its height is read against; 12px is the size
 * §5.3's row draws the same object at, and it sits beside a token of 12 to 20.
 */
export const FLIGHT_MARK_PX = 12;

/** Solid enough to be an object rather than the path it is riding on, which is white at α0.35. */
const FLIGHT_MARK_ALPHA = 0.9;

interface MarkBox {
  readonly width: number;
  readonly height: number;
}

/** One compiled outline: where it draws, how big it came out, and how its own holes are filled. */
interface Mark {
  readonly path: Path2D;
  readonly width: number;
  readonly height: number;
  readonly rule: CanvasFillRule;
}

/**
 * The shapes the interface draws elsewhere, compiled to plate scale once and kept for the session.
 *
 * The scale is baked into the path rather than applied to the context, so the halo the caller has
 * already set keeps the width it has beside the name — `context.scale` would shrink the stroke with
 * the shape and leave a mark haloed more faintly than the label it belongs to. That is also why a
 * set belongs to one box: a second size is a second compilation, not a transform at draw time.
 *
 * Three tables rather than one map keyed by name, because the names collide — `knife` is a model in
 * Valve's vocabulary and a class in this product's, and they are two different drawings.
 */
function markSet(box: MarkBox) {
  const models = new Map<WeaponIconId, Mark>();
  const equipment = new Map<EquipmentIconId, Mark>();
  const classes = new Map<SilhouetteClass, Mark>();

  function compile(
    data: readonly string[],
    width: number,
    height: number,
    rule: CanvasFillRule,
  ): Mark {
    // Fitted rather than stretched: the icon meets the box on whichever axis runs out first, so a
    // long gun spans the width and a grenade spans the height.
    const scale = Math.min(box.width / width, box.height / height);
    const path = new Path2D();

    for (const d of data) path.addPath(new Path2D(d), { a: scale, d: scale });

    return { path, width: width * scale, height: height * scale, rule };
  }

  return {
    /** Valve's own outline for one weapon — an AK-47 rather than a rifle. */
    model(id: WeaponIconId): Mark {
      const held = models.get(id);
      if (held !== undefined) return held;

      const icon = WEAPON_ICONS[id];
      // Even-odd, which is what the generator flattens Valve's curves to: a trigger guard is a hole
      // in the outline, and the non-zero rule would fill it in.
      const mark = compile([icon.d], icon.width, icon.height, 'evenodd');
      models.set(id, mark);

      return mark;
    },

    /** Valve's own outline for a piece of equipment — a smoke rather than a grenade. */
    equipment(id: EquipmentIconId): Mark {
      const held = equipment.get(id);
      if (held !== undefined) return held;

      const icon = EQUIPMENT_ICONS[id];
      const mark = compile([icon.d], icon.width, icon.height, 'evenodd');
      equipment.set(id, mark);

      return mark;
    },

    /** This product's own shape for a class, which is what a weapon with no outline falls back to. */
    silhouette(weapon: SilhouetteClass): Mark {
      const held = classes.get(weapon);
      if (held !== undefined) return held;

      // Non-zero: these are drawn as overlapping parts of one object rather than as an outline with
      // holes, and even-odd would punch the overlap out of the knife.
      const mark = compile(
        SILHOUETTE_PATHS[weapon],
        SILHOUETTE_WIDTH,
        SILHOUETTE_HEIGHT,
        'nonzero',
      );
      classes.set(weapon, mark);

      return mark;
    },
  };
}

const LABEL_MARKS = markSet({ width: WEAPON_MARK_PX, height: WEAPON_MARK_HEIGHT_PX });
const FLIGHT_MARKS = markSet({ width: FLIGHT_MARK_PX, height: FLIGHT_MARK_PX });

/**
 * What draws for what a player is holding, in the order the answers are trusted: the model where
 * the match's own weapon table names one, the object where it is a piece of utility, and the class
 * where neither — `weaponClass` answers `unknown` for a weapon nobody here has drawn, and an
 * unknown weapon is still a weapon.
 *
 * **The bomb draws nothing** — §6.4. The prop reports `C4 Explosive` only while the bomb is *held*
 * and says nothing while it is stowed, so a mark here would be right for a moment and quietly wrong
 * for the rest of the round.
 */
function labelMark(weapon: WeaponClass, icon: WeaponIconId | undefined): Mark | null {
  if (icon !== undefined) return LABEL_MARKS.model(icon);
  if (weapon === 'bomb') return null;
  if (isUtilityKind(weapon)) return LABEL_MARKS.equipment(UTILITY_ICON[weapon]);

  return LABEL_MARKS.silhouette(weapon);
}

/**
 * What a player is holding, beside the name that says who they are — DESIGN.md §6.1. The **halo is
 * the caller's**, already on the context: the mark is part of the label rather than a mark of its
 * own, so it shares the label's stroke instead of configuring a second one that could drift from it
 * (`haloStroke` is where both callers get it).
 *
 * `x` is the box's left edge and `y` its middle, and the mark is right-aligned inside it: the box is
 * reserved whether or not anything goes in it, so a name never twitches sideways when its player
 * switches weapon.
 */
export function drawWeaponMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  weapon: WeaponClass,
  icon: WeaponIconId | undefined,
  ink: string,
): void {
  const mark = labelMark(weapon, icon);
  if (mark === null) return;

  context.save();
  context.translate(x + WEAPON_MARK_PX - mark.width, y - mark.height / 2);

  context.stroke(mark.path);
  context.fillStyle = ink;
  context.fill(mark.path, mark.rule);
  context.restore();
}

/**
 * The grenade itself, at the head of the path it is flying along — §6.2. Centred on the point the
 * caller gives, in the utility's own colour, and unhaloed: everything else §6.2 draws stands on the
 * map without one, and a mark this small under a 4px stroke is a blob rather than an object.
 */
export function drawGrenadeMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: UtilityKind,
  ink: string,
): void {
  const mark = FLIGHT_MARKS.equipment(UTILITY_ICON[kind]);

  context.save();
  context.globalAlpha = FLIGHT_MARK_ALPHA;
  context.translate(x - mark.width / 2, y - mark.height / 2);

  context.fillStyle = ink;
  context.fill(mark.path, mark.rule);
  context.restore();
}
