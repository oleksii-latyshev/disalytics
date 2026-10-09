import type { ActorShape, AdminRole, InviteInfo, Person } from '@disa/admin-contract';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { Context, type Effect } from 'effect';
import { type D1Binding, makeDb } from '../../db/client';
import { adminInvites, adminSessions, admins } from '../../db/schema';
import { attempt, type StorageError } from '../../shared/storage-error';
import {
  hashToken,
  INVITE_TTL_MS,
  newId,
  newToken,
  SESSION_TOUCH_MS,
  SESSION_TTL_MS,
} from './tokens';

export type Redeemed =
  | { readonly ok: true; readonly actor: ActorShape; readonly token: string }
  | { readonly ok: false; readonly reason: 'invalid_invite' | 'name_required' };

export interface Resolved {
  readonly actor: ActorShape;
  /** The expiry moved out on this request, so the cookie should be sent again. */
  readonly touched: boolean;
}

export type Disabled = 'ok' | 'not_found' | 'last_owner';

type AdminRow = typeof admins.$inferSelect;

/**
 * Who may use the admin: people, their device sessions and the one-time invites that create them.
 * Tokens never reach the database; every lookup goes by their SHA-256.
 */
export class AdminAuth extends Context.Service<
  AdminAuth,
  {
    readonly inviteInfo: (
      token: string,
      now: number,
    ) => Effect.Effect<InviteInfo | null, StorageError>;
    readonly redeem: (input: {
      readonly token: string;
      readonly name: string | undefined;
      readonly label: string;
      readonly now: number;
    }) => Effect.Effect<Redeemed, StorageError>;
    readonly resolve: (token: string, now: number) => Effect.Effect<Resolved | null, StorageError>;
    readonly signOut: (token: string, now: number) => Effect.Effect<void, StorageError>;
    readonly createInvite: (input: {
      readonly role: AdminRole;
      readonly personId: string | undefined;
      readonly createdBy: string;
      readonly now: number;
    }) => Effect.Effect<
      { readonly token: string; readonly expiresAt: number } | null,
      StorageError
    >;
    readonly people: (
      currentSessionId: string | null,
      now: number,
    ) => Effect.Effect<readonly Person[], StorageError>;
    readonly revokeDevice: (id: string, now: number) => Effect.Effect<boolean, StorageError>;
    readonly disable: (id: string, now: number) => Effect.Effect<Disabled, StorageError>;
  }
>()('disalytics/admin/AdminAuth') {}

export function makeAdminAuth(binding: D1Binding): Context.Service.Shape<typeof AdminAuth> {
  const db = makeDb(binding);

  const liveInvite = (tokenHash: string, now: number) =>
    and(
      eq(adminInvites.tokenHash, tokenHash),
      isNull(adminInvites.usedAt),
      gt(adminInvites.expiresAt, now),
    );

  const activePerson = async (id: string) => {
    const [person] = await db
      .select()
      .from(admins)
      .where(and(eq(admins.id, id), isNull(admins.disabledAt)));
    return person;
  };

  type Checked =
    | { readonly ok: true; readonly person: AdminRow; readonly isNew: boolean }
    | { readonly ok: false; readonly reason: 'invalid_invite' | 'name_required' };

  /** Whether the invite can be spent, and on whom, before anything is written. */
  const checkInvite = async (
    tokenHash: string,
    name: string | undefined,
    now: number,
  ): Promise<Checked> => {
    const [invite] = await db.select().from(adminInvites).where(liveInvite(tokenHash, now));
    if (invite === undefined) return { ok: false, reason: 'invalid_invite' };
    if (invite.adminId !== null) {
      const existing = await activePerson(invite.adminId);
      return existing === undefined
        ? { ok: false, reason: 'invalid_invite' }
        : { ok: true, person: existing, isNew: false };
    }
    const trimmed = name?.trim() ?? '';
    if (trimmed === '') return { ok: false, reason: 'name_required' };
    return {
      ok: true,
      isNew: true,
      person: { id: newId(), name: trimmed, role: invite.role, createdAt: now, disabledAt: null },
    };
  };

  /** A new device session for `person`, writing the person too when the invite made them. */
  const openSession = async (
    person: AdminRow,
    isNew: boolean,
    label: string,
    now: number,
  ): Promise<Redeemed> => {
    const sessionToken = newToken();
    const session = {
      id: newId(),
      tokenHash: await hashToken(sessionToken),
      adminId: person.id,
      label,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };
    if (isNew) {
      await db.batch([db.insert(admins).values(person), db.insert(adminSessions).values(session)]);
    } else {
      await db.insert(adminSessions).values(session);
    }
    return {
      ok: true,
      token: sessionToken,
      actor: { id: person.id, name: person.name, role: person.role, sessionId: session.id },
    };
  };

  return {
    inviteInfo: (token, now) =>
      attempt(async () => {
        const [invite] = await db
          .select()
          .from(adminInvites)
          .where(liveInvite(await hashToken(token), now));
        if (invite === undefined) return null;
        const invitedBy = invite.createdBy !== 'cli' ? { invitedBy: invite.createdBy } : {};
        if (invite.adminId === null) {
          return { role: invite.role, ...invitedBy, expiresAt: invite.expiresAt };
        }
        const person = await activePerson(invite.adminId);
        return person === undefined
          ? null
          : { role: person.role, name: person.name, ...invitedBy, expiresAt: invite.expiresAt };
      }),

    redeem: ({ token, name, label, now }) =>
      attempt(async (): Promise<Redeemed> => {
        const tokenHash = await hashToken(token);
        const checked = await checkInvite(tokenHash, name, now);
        if (!checked.ok) return checked;

        // Spent here, atomically: of two tabs opening one link, only one gets a row back.
        const spent = await db
          .update(adminInvites)
          .set({ usedAt: now })
          .where(liveInvite(tokenHash, now))
          .returning({ tokenHash: adminInvites.tokenHash });
        if (spent.length === 0) return { ok: false, reason: 'invalid_invite' };

        return openSession(checked.person, checked.isNew, label, now);
      }),

    resolve: (token, now) =>
      attempt(async () => {
        const [row] = await db
          .select({
            sessionId: adminSessions.id,
            lastSeenAt: adminSessions.lastSeenAt,
            id: admins.id,
            name: admins.name,
            role: admins.role,
          })
          .from(adminSessions)
          .innerJoin(admins, eq(admins.id, adminSessions.adminId))
          .where(
            and(
              eq(adminSessions.tokenHash, await hashToken(token)),
              isNull(adminSessions.revokedAt),
              gt(adminSessions.expiresAt, now),
              isNull(admins.disabledAt),
            ),
          );
        if (row === undefined) return null;

        const touched = now - row.lastSeenAt >= SESSION_TOUCH_MS;
        if (touched) {
          await db
            .update(adminSessions)
            .set({ lastSeenAt: now, expiresAt: now + SESSION_TTL_MS })
            .where(eq(adminSessions.id, row.sessionId));
        }
        return {
          actor: { id: row.id, name: row.name, role: row.role, sessionId: row.sessionId },
          touched,
        };
      }),

    signOut: (token, now) =>
      attempt(async () => {
        await db
          .update(adminSessions)
          .set({ revokedAt: now })
          .where(
            and(
              eq(adminSessions.tokenHash, await hashToken(token)),
              isNull(adminSessions.revokedAt),
            ),
          );
      }),

    createInvite: ({ role, personId, createdBy, now }) =>
      attempt(async () => {
        const person = personId === undefined ? undefined : await activePerson(personId);
        if (personId !== undefined && person === undefined) return null;
        const token = newToken();
        const expiresAt = now + INVITE_TTL_MS;
        await db.insert(adminInvites).values({
          tokenHash: await hashToken(token),
          role: person?.role ?? role,
          adminId: person?.id ?? null,
          createdBy,
          createdAt: now,
          expiresAt,
        });
        return { token, expiresAt };
      }),

    people: (currentSessionId, now) =>
      attempt(async () => {
        const everyone = await db.select().from(admins).orderBy(admins.createdAt);
        const sessions = await db
          .select()
          .from(adminSessions)
          .where(and(isNull(adminSessions.revokedAt), gt(adminSessions.expiresAt, now)))
          .orderBy(adminSessions.createdAt);
        return everyone.map((person) => ({
          id: person.id,
          name: person.name,
          role: person.role,
          createdAt: person.createdAt,
          disabled: person.disabledAt !== null,
          devices: sessions
            .filter((session) => session.adminId === person.id)
            .map((session) => ({
              id: session.id,
              label: session.label,
              createdAt: session.createdAt,
              lastSeenAt: session.lastSeenAt,
              current: session.id === currentSessionId,
            })),
        }));
      }),

    revokeDevice: (id, now) =>
      attempt(async () => {
        const revoked = await db
          .update(adminSessions)
          .set({ revokedAt: now })
          .where(and(eq(adminSessions.id, id), isNull(adminSessions.revokedAt)))
          .returning({ id: adminSessions.id });
        return revoked.length > 0;
      }),

    disable: (id, now) =>
      attempt(async (): Promise<Disabled> => {
        const person = await activePerson(id);
        if (person === undefined) return 'not_found';
        if (person.role === 'owner') {
          const owners = await db
            .select({ id: admins.id })
            .from(admins)
            .where(and(eq(admins.role, 'owner'), isNull(admins.disabledAt)));
          if (owners.length <= 1) return 'last_owner';
        }
        await db.batch([
          db.update(admins).set({ disabledAt: now }).where(eq(admins.id, id)),
          db
            .update(adminSessions)
            .set({ revokedAt: now })
            .where(and(eq(adminSessions.adminId, id), isNull(adminSessions.revokedAt))),
        ]);
        return 'ok';
      }),
  };
}
