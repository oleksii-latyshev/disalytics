import { AdminApi, MalformedAsBadRequestLive } from '@disa/admin-contract';
import { Context, Layer } from 'effect';
import { HttpRouter, HttpServer, HttpServerResponse } from 'effect/unstable/http';
import { HttpApiBuilder } from 'effect/unstable/httpapi';
import { LineupStorage, makeLineupStorage } from '../modules/lineups';
import { makePhotoStorage, PhotoStorage } from '../modules/photos';
import { AdminAuth, makeAdminAuth } from './auth/store';
import { ChangeLog, makeChangeLog } from './change-log';
import { AdminConfig, type AdminConfigShape } from './config';
import type { AdminEnv } from './env';
import {
  AuthHandlers,
  ChangesHandlers,
  CommitHandlers,
  LineupsHandlers,
  MeHandlers,
  PeopleHandlers,
  PreviewHandlers,
} from './handlers';
import { SessionAuthLive, WriteGuardLive } from './middleware';
import { makePhotoLinks, PhotoLinks } from './photo-links';

const Middleware = Layer.mergeAll(MalformedAsBadRequestLive, SessionAuthLive, WriteGuardLive);

const AdminApiLive = HttpApiBuilder.layer(AdminApi).pipe(
  Layer.provide(
    Layer.mergeAll(
      AuthHandlers,
      MeHandlers,
      PeopleHandlers,
      PreviewHandlers,
      CommitHandlers,
      LineupsHandlers,
      ChangesHandlers,
    ).pipe(Layer.provide(Middleware)),
  ),
  Layer.provide(HttpServer.layerServices),
);

/** Anything under /api/ that no endpoint claims, including a known path with the wrong method. */
const notFoundBody = HttpServerResponse.jsonUnsafe({ error: 'not_found' }, { status: 404 });
const NotFoundRoutes = Layer.mergeAll(
  HttpRouter.add('*', '/', notFoundBody),
  HttpRouter.add('*', '/*', notFoundBody),
);

const { handler } = HttpRouter.toWebHandler(Layer.mergeAll(AdminApiLive, NotFoundRoutes), {
  disableLogger: true,
});

export function configOf(env: AdminEnv, now: () => number = Date.now): AdminConfigShape {
  return {
    photoBaseUrl: env.PHOTO_BASE_URL.replace(/\/+$/, ''),
    devIdentity: env.ALLOW_DEV_IDENTITY,
    fetchPhoto: null,
    now,
  };
}

/** One `/api/*` request: the bindings of this request go in as services. */
export function handleApi(
  request: Request,
  env: AdminEnv,
  config: AdminConfigShape = configOf(env),
): Promise<Response> {
  const services = Context.empty().pipe(
    Context.add(LineupStorage, makeLineupStorage(env.LINEUPS_DB)),
    Context.add(PhotoStorage, makePhotoStorage(env.LINEUP_PHOTOS)),
    Context.add(ChangeLog, makeChangeLog(env.LINEUPS_DB)),
    Context.add(PhotoLinks, makePhotoLinks(env.LINEUPS_DB)),
    Context.add(AdminAuth, makeAdminAuth(env.LINEUPS_DB)),
    Context.add(AdminConfig, config),
  );
  return handler(request, services);
}
