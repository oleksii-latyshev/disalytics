export interface StackPoint {
  readonly id: string;
  /** Plate position, in radar pixels. */
  readonly x: number;
  readonly y: number;
}

export interface TargetStack {
  readonly x: number;
  readonly y: number;
  readonly ids: readonly string[];
}

/**
 * Two markers closer than this on the 1024px plate would sit on one another: a marker is up to
 * 32 CSS pixels across and the plate is rarely drawn larger than 800, so 36 radar pixels keeps
 * every marker's edge clear of its neighbour's.
 */
export const STACK_RADIUS_PLATE_PX = 36;

/**
 * Markers that would overlap, grouped so each group is drawn as one mark.
 *
 * Greedy in the order given, measured from the group's first member: a caller that passes the
 * most-used first gets stacks anchored on the target a reader most likely means.
 */
export function stackPoints(points: readonly StackPoint[]): readonly TargetStack[] {
  const stacks: { x: number; y: number; ids: string[] }[] = [];

  for (const point of points) {
    const stack = stacks.find(
      (candidate) =>
        Math.hypot(candidate.x - point.x, candidate.y - point.y) < STACK_RADIUS_PLATE_PX,
    );

    if (stack === undefined) stacks.push({ x: point.x, y: point.y, ids: [point.id] });
    else stack.ids.push(point.id);
  }

  return stacks;
}
