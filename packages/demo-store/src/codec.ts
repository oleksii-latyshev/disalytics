/**
 * The container, on its own entry point.
 *
 * A `DemoStore` is the ordinary way in and needs a browser — OPFS or IndexedDB underneath it, and
 * Web Crypto to key an entry with. The codec needs none of that: since #330 a container is written
 * by `bun run samples:generate` in Bun and read straight into memory by the sample loader, neither
 * of which opens a store. Keeping it reachable without the barrel is what lets a Node-side script
 * typecheck against this package at all.
 */
export { CorruptCacheError } from './container';
export { decodeDemo } from './decode';
export { byteLengthOf, encodeDemo } from './encode';
