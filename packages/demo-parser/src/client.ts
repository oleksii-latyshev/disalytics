import type { ParsedDemo } from '@disa/demo-core';
import type { DemoSource } from './protocol';
import { type ParseOptions, runParse } from './session';

/**
 * Parses a demo off the main thread.
 *
 * One worker per call, terminated on every path out — including `options.signal` aborting, which is
 * what actually frees the demo rather than merely stopping the reporting.
 */
export function parseDemo(source: DemoSource, options: ParseOptions = {}): Promise<ParsedDemo> {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

  return runParse(worker, source, options);
}
