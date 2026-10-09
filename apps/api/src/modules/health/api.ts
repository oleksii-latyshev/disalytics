import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi';

export const HealthGroup = HttpApiGroup.make('health').add(
  HttpApiEndpoint.get('check', '/health', {
    success: HttpApiSchema.WithHeaders(Schema.Struct({ status: Schema.Literal('ok') }), {
      'cache-control': Schema.String,
    }),
  }),
);
