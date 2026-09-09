import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buildReel, OUTPUT_PATH, SOURCE_CONTAINER } from './reel/build';

/**
 * Rebuilds the way in's reel from the committed sample container.
 *
 * Unlike `samples:generate` this needs nothing that is not in the tree — the container is the
 * source, so a regeneration is `bun run reel:generate` and no `.dem` anywhere. What it must be run
 * *after* is a `samples:generate`, since a container rebuilt on a new `SCHEMA_VERSION` is a new
 * source for this; `bun run reel:check` is what fails the build until it has been.
 */
const { source, facts } = buildReel();

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, source);

console.log(
  `reel: round ${facts.round} of ${SOURCE_CONTAINER}, ${facts.frameCount} frames, ` +
    `${facts.grenadeCount} grenades peaking at ${facts.peakUtility}, ` +
    `still at ${facts.stillFrame}, ` +
    `${(facts.byteLength / 1024).toFixed(1)} kB of module`,
);
