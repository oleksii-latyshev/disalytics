/**
 * Turning an icon upright.
 *
 * This exists for exactly one asset and says so: Valve draws the flashbang's own outline
 * (`flashbang_assist`) lying on a diagonal, while the grenade, the smoke canister and the molotov
 * bottle beside it all stand up. The alternative art — `flashbang.svg` — is the *flash*, a burst
 * with a hole through the middle that collapses into a smudge at the 12px a team row gives it.
 *
 * So the set is made consistent by turning one outline rather than by drawing one, and this is the
 * only place in the repository where Valve's art is altered at all. It is a rigid rotation about the
 * shape's own centre: no point moves relative to any other, and the outline is re-boxed afterwards
 * so the icon still fills its own width and height the way every other one does.
 */
export interface RotatedIcon {
  readonly d: string;
  readonly width: number;
  readonly height: number;
}

/** One `M x yL x y…Z` polygon set, which is the only shape `simplifyIconPath` ever emits. */
function points(d: string): number[][][] {
  return d
    .split('M')
    .filter((ring) => ring.trim() !== '')
    .map((ring) =>
      ring
        .replace(/Z$/, '')
        .split('L')
        .map((pair) => pair.trim().split(/\s+/).map(Number))
        .filter((pair): pair is number[] => pair.length === 2 && pair.every(Number.isFinite)),
    );
}

function render(rings: readonly (readonly number[][])[], decimals: number): string {
  const round = (value: number): string => String(Number(value.toFixed(decimals)));

  return rings
    .map(
      (ring) =>
        `M${ring.map((point) => `${round(point[0] ?? 0)} ${round(point[1] ?? 0)}`).join('L')}Z`,
    )
    .join('');
}

/**
 * Rotates every polygon by `degrees` about the centre of the box it was drawn in, then re-boxes the
 * result so its own bounding box starts at the origin. The returned width and height are that box,
 * so a caller that scales by height keeps working without knowing anything happened.
 */
export function rotateIconPath(
  d: string,
  degrees: number,
  width: number,
  height: number,
  decimals: number,
): RotatedIcon {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const centreX = width / 2;
  const centreY = height / 2;

  const turned = points(d).map((ring) =>
    ring.map(([x = 0, y = 0]) => {
      const dx = x - centreX;
      const dy = y - centreY;

      return [centreX + dx * cos - dy * sin, centreY + dx * sin + dy * cos];
    }),
  );

  const flat = turned.flat();
  if (flat.length === 0) return { d, width, height };

  const xs = flat.map((point) => point[0] ?? 0);
  const ys = flat.map((point) => point[1] ?? 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);

  const moved = turned.map((ring) => ring.map(([x = 0, y = 0]) => [x - minX, y - minY]));

  return {
    d: render(moved, decimals),
    width: Number((Math.max(...xs) - minX).toFixed(decimals)),
    height: Number((Math.max(...ys) - minY).toFixed(decimals)),
  };
}
