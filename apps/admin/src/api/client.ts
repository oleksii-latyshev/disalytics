import { AdminApi } from '@disa/admin-contract';
import type { TranslationKey } from '@disa/i18n';
import { Effect, Result } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { HttpApiClient } from 'effect/unstable/httpapi';

type Client = Effect.Success<ReturnType<typeof makeClient>>;

function makeClient() {
  return HttpApiClient.make(AdminApi, { baseUrl: globalThis.location.origin });
}

export interface Failure {
  readonly key: TranslationKey;
  readonly detail: string | undefined;
}

export function isFailure(value: unknown): value is Failure {
  return typeof value === 'object' && value !== null && 'key' in value && 'detail' in value;
}

const KEYS: Readonly<Record<string, TranslationKey>> = {
  unauthorized: 'admin.error.unauthorized',
  forbidden: 'admin.error.forbidden',
  not_found: 'admin.error.notFound',
  body_too_large: 'admin.error.bodyTooLarge',
  invalid_request: 'admin.error.invalidRequest',
  invalid_json: 'admin.error.invalidJson',
  invalid_map: 'admin.error.invalidMap',
  invalid_file: 'admin.error.invalidFile',
  invalid_resolutions: 'admin.error.invalidResolutions',
  missing_resolution: 'admin.error.missingResolution',
  invalid_photo: 'admin.error.invalidPhoto',
  too_many_photos: 'admin.error.tooManyPhotos',
  invalid_lineup: 'admin.error.invalidLineup',
};

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null && name in value
    ? Object.getOwnPropertyDescriptor(value, name)?.value
    : undefined;
}

/** What the person is told. Anything that is not one of our coded errors reads as "unreachable". */
export function describeFailure(cause: unknown): Failure {
  const code = field(cause, 'error');
  const detail = field(cause, 'detail');
  const key = typeof code === 'string' ? KEYS[code] : undefined;
  return {
    key: key ?? 'admin.error.network',
    detail: typeof detail === 'string' ? detail : undefined,
  };
}

/**
 * Runs one call against the admin API of the origin this page came from. A failure of any kind
 * (a coded error, a refused request, a network error) rejects with a {@link Failure}.
 */
export async function call<A, E>(use: (client: Client) => Effect.Effect<A, E>): Promise<A> {
  const outcome = await Effect.runPromise(
    makeClient().pipe(
      Effect.flatMap(use),
      Effect.mapError(describeFailure),
      Effect.catchDefect((defect) => Effect.fail(describeFailure(defect))),
      Effect.result,
      Effect.provide(FetchHttpClient.layer),
    ),
  );
  if (Result.isFailure(outcome)) throw outcome.failure;
  return outcome.success;
}
