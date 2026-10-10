import { Context, Layer } from 'effect';
import { HttpRouter, HttpServer, HttpServerResponse } from 'effect/unstable/http';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { Api, MalformedAsNotFoundLive } from './api';
import type { D1Binding } from './db/client';
import { HealthHandlers } from './modules/health';
import { LineupStorage, LineupsHandlers, makeLineupStorage } from './modules/lineups';
import type { KvBinding } from './modules/photos';
import { makePhotoStorage, PhotoStorage, PhotosHandlers } from './modules/photos';
import { makeTacticStorage, TacticStorage, TacticsHandlers } from './modules/tactics';
import { type CacheBinding, EdgeCache, edge } from './shared/http/middleware';

const ApiLive = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(
    Layer.mergeAll(HealthHandlers, LineupsHandlers, PhotosHandlers, TacticsHandlers).pipe(
      Layer.provide(MalformedAsNotFoundLive),
    ),
  ),
  Layer.provide(HttpServer.layerServices),
);

/** Anything no endpoint claims, including a known path with the wrong method. */
const notFoundBody = HttpServerResponse.jsonUnsafe({ error: 'not_found' }, { status: 404 });
const NotFoundRoutes = Layer.mergeAll(
  HttpRouter.add('*', '/', notFoundBody),
  HttpRouter.add('*', '/*', notFoundBody),
);

const EdgeLive = HttpRouter.middleware(edge, { global: true });

const { handler } = HttpRouter.toWebHandler(Layer.mergeAll(ApiLive, NotFoundRoutes, EdgeLive), {
  disableLogger: true,
});

export interface Env {
  readonly LINEUPS_DB: D1Binding;
  readonly LINEUP_PHOTOS: KvBinding;
}

/** The Worker's request handler: the bindings of this request go in as services. */
export function handle(request: Request, env: Env, cache: CacheBinding | null): Promise<Response> {
  const services = Context.empty().pipe(
    Context.add(LineupStorage, makeLineupStorage(env.LINEUPS_DB)),
    Context.add(PhotoStorage, makePhotoStorage(env.LINEUP_PHOTOS)),
    Context.add(TacticStorage, makeTacticStorage(env.LINEUPS_DB)),
    cache === null ? (context) => context : Context.add(EdgeCache, cache),
  );
  return handler(request, services);
}
