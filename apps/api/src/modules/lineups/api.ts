import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi';
import { NotFound } from '../../shared/errors';

/** The ids `@disa/map-data` ships, without pulling that package's images and nav grids in. */
export const MapId = Schema.String.check(Schema.isPattern(/^de_[a-z0-9_]{1,40}$/));

const MapLineupsBody = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  // Each entry passed `isLineup` on its way out of D1.
  lineups: Schema.Array(Schema.Unknown),
});

export const LINEUPS_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=600';

export const LineupsGroup = HttpApiGroup.make('lineups').add(
  HttpApiEndpoint.get('byMap', '/lineups/:map', {
    params: { map: MapId },
    success: HttpApiSchema.WithHeaders(MapLineupsBody, {
      etag: Schema.String,
      'cache-control': Schema.String,
    }),
    error: NotFound,
  }),
);
