import { Effect } from 'effect';
import { HttpApiBuilder, HttpApiSchema } from 'effect/unstable/httpapi';
import { Api } from '../../api';

export const HealthHandlers = HttpApiBuilder.group(Api, 'health', (handlers) =>
  handlers.handle('check', () =>
    Effect.succeed(
      HttpApiSchema.withHeaders({
        body: { status: 'ok' },
        headers: { 'cache-control': 'no-store' },
      }),
    ),
  ),
);
