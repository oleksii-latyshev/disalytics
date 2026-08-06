/**
 * The generated `wasm-pack` glue, declared by hand.
 *
 * `crates/demo-parser-wasm/pkg` is gitignored, so a fresh clone has to typecheck before any binary
 * exists — the same constraint `tools/scripts/wasm-smoke.ts` works under. What keeps this file
 * honest is that smoke test: it loads the real glue and calls every export named here, and
 * `wasm.yml` runs it before the size gate. A rename on the Rust side fails there, not in a browser.
 *
 * The bundler resolves `demo-parser-wasm` to the generated module — `wasm-pack` writes that name
 * into `pkg/package.json`, and the consuming app aliases it there.
 */
declare module 'demo-parser-wasm' {
  import type { MatchEvents, MatchHeader, TickTrack } from '@disa/demo-core';

  /** Fetches and instantiates the binary beside the glue. */
  export default function init(options?: {
    module_or_path: BufferSource | WebAssembly.Module | URL | string;
  }): Promise<unknown>;

  export function parserVersion(): string;

  /** How many passes over the demo one parse makes — the denominator of a progress percentage. */
  export function passCount(): number;

  export function eventNames(demoBytes: Uint8Array): string[];

  /** The demo's bytes in linear memory, filled a chunk at a time so the file is never held twice. */
  export class DemoBuffer {
    constructor(sizeBytes: number);
    push(chunk: Uint8Array): void;
    readonly byteLength: number;
    free(): void;
  }

  /**
   * Consumes `demo` and returns the columnar half of the schema. Every buffer in it is a
   * JavaScript-owned typed array, so the caller can transfer them and terminate the worker.
   *
   * The header is not in the return value: it is complete while the last pass is still running and
   * reaches `onHeader` there.
   */
  export function parseDemo(
    demo: DemoBuffer,
    onPass: (completedPasses: number) => void,
    onHeader: (header: MatchHeader) => void,
  ): { track: TickTrack; events: MatchEvents };
}
