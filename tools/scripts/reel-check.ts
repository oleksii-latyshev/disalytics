import { readFileSync } from 'node:fs';
import { buildReel } from './reel/build';
import { OUTPUT_PATH } from './reel/emit';

/**
 * Holds the committed reel to the container it was cut from.
 *
 * The failure this exists for is the one `samples:check` exists for, one link further down the
 * chain: a `SCHEMA_VERSION` bump means the containers are rebuilt, and a reel cut from the old ones
 * is then a background playing a round nobody can check against anything. Because the source is in
 * the tree, this can do better than assert a shape — **it regenerates and compares**, so the check
 * and the byte-stability claim are the same run.
 */
const { source, facts } = buildReel();
const committed = (() => {
  try {
    return readFileSync(OUTPUT_PATH, 'utf8');
  } catch {
    return null;
  }
})();

if (committed === null) {
  console.error(`${OUTPUT_PATH} is missing — write it with bun run reel:generate`);
  process.exit(1);
}

if (committed !== source) {
  console.error(`${OUTPUT_PATH} is not what the container produces — rerun bun run reel:generate`);
  process.exit(1);
}

console.log(
  `reel: round ${facts.round}, ${facts.frameCount} frames, ${facts.grenadeCount} grenades ` +
    `peaking at ${facts.peakUtility}, matches the container`,
);
