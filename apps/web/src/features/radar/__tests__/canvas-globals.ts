/**
 * `Path2D` is a browser global and the suite runs in node, so a helper that compiles a path — the
 * weapon mark in `weapon-marks.ts` — has nothing to compile against. This is the smallest stub the
 * two tests that reach it need: they record the *colours* a mark paints and the geometry it traces,
 * and neither reads a path back.
 */
let constructed = 0;

class StubPath2D {
  readonly parts: string[] = [];

  constructor(d?: string) {
    constructed += 1;
    if (d !== undefined) this.parts.push(d);
  }

  addPath(path: StubPath2D): void {
    this.parts.push(...path.parts);
  }
}

/** Installs the stub for the module under test. Call it at the top of a test file, once. */
export function stubPath2D(): void {
  constructed = 0;
  Reflect.set(globalThis, 'Path2D', StubPath2D);
}

/**
 * How many paths have been compiled since the stub went in. A mark set keeps what it compiles for
 * the session, so this is how a test asks whether a second draw compiled anything at all — which is
 * the property the plate depends on, not one the shapes reveal.
 */
export function path2DCount(): number {
  return constructed;
}
