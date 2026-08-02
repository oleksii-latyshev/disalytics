/**
 * How anything this package generates for a human reaches the screen. `demo-core` produces no
 * display text: it emits a key and the values to interpolate, and the client renders them against
 * the active locale.
 *
 * `key` is a plain string rather than the generated translation-key union because `demo-core`
 * imports from no other package.
 */
export interface LocalizedMessage {
  key: string;
  params: Readonly<Record<string, string | number>>;
}
