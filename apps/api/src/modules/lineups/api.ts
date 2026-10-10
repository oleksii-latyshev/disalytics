import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi';
import { NotFound } from '../../shared/errors';
import { PUBLIC_CACHE_CONTROL } from '../../shared/http/cache-control';

/** The ids `@disa/map-data` ships, without pulling that package's images and nav grids in. */
export const MapId = Schema.String.check(Schema.isPattern(/^de_[a-z0-9_]{1,40}$/));

const MapLineupsBody = Schema.Struct({
  map: Schema.String,
  revision: Schema.Int,
  // Each entry passed `isLineup` on its way out of D1.
  lineups: Schema.Array(Schema.Unknown),
  // Each entry passed `isLineupCollection` on its way out of D1; older clients ignore the field.
  collections: Schema.Array(Schema.Unknown),
});

const MapSummary = Schema.Struct({ map: Schema.String, revision: Schema.Int, count: Schema.Int });

const SummaryBody = Schema.Struct({ maps: Schema.Array(MapSummary) });

export const LINEUPS_CACHE_CONTROL = PUBLIC_CACHE_CONTROL;

export const LineupsGroup = HttpApiGroup.make('lineups').add(
  HttpApiEndpoint.get('summary', '/lineups', {
    success: HttpApiSchema.WithHeaders(SummaryBody, { 'cache-control': Schema.String }),
  }),
  HttpApiEndpoint.get('byMap', '/lineups/:map', {
    params: { map: MapId },
    success: HttpApiSchema.WithHeaders(MapLineupsBody, {
      etag: Schema.String,
      'cache-control': Schema.String,
    }),
    error: NotFound,
  }),
);
