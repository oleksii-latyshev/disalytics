import { Effect } from 'effect';
import { HttpApi, HttpApiMiddleware } from 'effect/unstable/httpapi';
import { HealthGroup } from './modules/health/api';
import { LineupsGroup } from './modules/lineups/api';
import { PhotosGroup } from './modules/photos/api';
import { TacticsGroup } from './modules/tactics/api';
import { NotFound, notFound } from './shared/errors';

/** A malformed path parameter (`/lineups/Mirage`, `/photos/xyz`) is a 404, not a 400. */
export class MalformedAsNotFound extends HttpApiMiddleware.Service<MalformedAsNotFound>()(
  'disalytics/MalformedAsNotFound',
  { error: NotFound },
) {}

export const MalformedAsNotFoundLive = HttpApiMiddleware.layerSchemaErrorTransform(
  MalformedAsNotFound,
  () => Effect.fail(notFound),
);

export const Api = HttpApi.make('disalytics')
  .add(HealthGroup)
  .add(LineupsGroup)
  .add(PhotosGroup)
  .add(TacticsGroup)
  .middleware(MalformedAsNotFound);
