import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';

/** `404 { "error": "not_found" }`: an unknown route, a malformed id, or nothing stored under it. */
export const NotFound = Schema.Struct({ error: Schema.Literal('not_found') }).pipe(
  HttpApiSchema.status(404),
);
export const notFound = NotFound.make({ error: 'not_found' });
