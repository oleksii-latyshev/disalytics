import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { SCHEMA_VERSION } from '@disa/demo-core';
import { decodeDemo } from '@disa/demo-store/codec';
import { SAMPLE_MATCHES } from '../../apps/web/src/core/samples/helpers/catalogue';

/**
 * Holds the committed sample containers to what the catalogue says about them.
 *
 * The failure this exists for is silent and expensive: a `SCHEMA_VERSION` bump makes every shipped
 * container unreadable, `decodeDemo` throws `CorruptCacheError`, and the library answers a press
 * with a failure card — on a build whose tests, types and bundle are all green, because nothing
 * else in the repository reads these bytes. Regenerating them needs the `.dem` files, which live on
 * the owner's machine and never in CI, so what CI can do is refuse to ship the stale ones.
 */
const ASSET_DIR = 'apps/web/assets/samples';

let failed = false;

for (const sample of SAMPLE_MATCHES) {
  const path = `${ASSET_DIR}/${sample.id}.disa.gz`;

  try {
    const bytes = new Uint8Array(gunzipSync(readFileSync(path)));
    const demo = decodeDemo(bytes);
    const mib = (bytes.byteLength / 1024 / 1024).toFixed(2);

    if (demo.header.map !== sample.map) {
      failed = true;
      console.error(
        `${sample.id}: the container is ${demo.header.map}, the catalogue ${sample.map}`,
      );
      continue;
    }

    console.log(
      `${sample.id}: schema ${SCHEMA_VERSION}, ${demo.header.map}, ${demo.events.rounds.length} rounds, ${mib} MiB`,
    );
  } catch (thrown) {
    failed = true;
    console.error(`${sample.id}: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    console.error('  rebuild it with DISALYTICS_SAMPLE_DIR=<dir> bun run samples:generate');
  }
}

if (failed) process.exit(1);
