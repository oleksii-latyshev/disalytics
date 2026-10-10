import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';

export const BAD_REQUEST_CODES = [
  'invalid_request',
  'invalid_json',
  'invalid_map',
  'invalid_file',
  'invalid_decisions',
  'invalid_photo',
  'too_many_photos',
  'invalid_lineup',
  'invalid_collection',
  'collection_name_taken',
  'invalid_invite',
  'name_required',
  'last_owner',
] as const;

export type BadRequestCode = (typeof BAD_REQUEST_CODES)[number];

/** `400`: the caller sent something the admin cannot act on; `detail` says what, in English. */
export const BadRequest = Schema.Struct({
  error: Schema.Literals(BAD_REQUEST_CODES),
  detail: Schema.String,
}).pipe(HttpApiSchema.status(400));
export type BadRequest = typeof BadRequest.Type;

/** `401`: no valid session cookie on the request: the person has to open an invite link. */
export const Unauthorized = Schema.Struct({ error: Schema.Literal('unauthorized') }).pipe(
  HttpApiSchema.status(401),
);
export const unauthorized = Unauthorized.make({ error: 'unauthorized' });

/** `403`: the person may not do this (an editor managing people), or the request came from another site. */
export const Forbidden = Schema.Struct({ error: Schema.Literal('forbidden') }).pipe(
  HttpApiSchema.status(403),
);
export const forbidden = Forbidden.make({ error: 'forbidden' });

export const NotFound = Schema.Struct({ error: Schema.Literal('not_found') }).pipe(
  HttpApiSchema.status(404),
);
export const notFound = NotFound.make({ error: 'not_found' });

export const PayloadTooLarge = Schema.Struct({ error: Schema.Literal('body_too_large') }).pipe(
  HttpApiSchema.status(413),
);
export const payloadTooLarge = PayloadTooLarge.make({ error: 'body_too_large' });

export function badRequest(error: BadRequestCode, detail: string): BadRequest {
  return BadRequest.make({ error, detail });
}
