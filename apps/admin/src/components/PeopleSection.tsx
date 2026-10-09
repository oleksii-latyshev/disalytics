import {
  ADMIN_ROLES,
  type AdminRole,
  type Device,
  type InviteCreated,
  type Person,
  type WhoAmI,
} from '@disa/admin-contract';
import { Text, useLocale, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import { inviteUrl } from '../helpers/invite-link';
import { useResource } from '../hooks/use-resource';
import { SELECT_CLASS } from './MapPicker';
import { Notice } from './Notice';
import { Muted, Section } from './Section';

interface Link extends InviteCreated {
  /** The person a device link is for; absent for a new person. */
  readonly name: string | undefined;
  readonly role: AdminRole;
}

function failureOf(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

/** The owner's: invite people, see each one's devices, sign a device out, disable a person. */
export function PeopleSection({ me }: { me: WhoAmI }) {
  const t = useT();
  const locale = useLocale();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const [people, reload] = useResource('people', async () => {
    const { people: list } = await call((client) => client.people.list());
    return list;
  });
  const [role, setRole] = useState<AdminRole>('editor');
  const [link, setLink] = useState<Link | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const act = async (run: () => Promise<unknown>) => {
    setFailure(null);
    try {
      await run();
      reload();
    } catch (error) {
      setFailure(failureOf(error));
    }
  };

  const createLink = (person?: Person) =>
    act(async () => {
      const created = await call((client) =>
        client.people.invite({
          payload: person === undefined ? { role } : { role: person.role, personId: person.id },
        }),
      );
      setLink({ ...created, name: person?.name, role: person?.role ?? role });
    });

  return (
    <Section title={<Text path="admin.people.title" />}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-12 text-ink-dim">
            <Text path="admin.people.inviteRole" />
          </span>
          <select
            className={SELECT_CLASS}
            value={role}
            onChange={(event) => {
              const next = ADMIN_ROLES.find((item) => item === event.currentTarget.value);
              if (next !== undefined) setRole(next);
            }}
          >
            {ADMIN_ROLES.map((item) => (
              <option key={item} value={item}>
                {t(item === 'owner' ? 'admin.role.owner' : 'admin.role.editor')}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={() => void createLink()}>
          <Text path="admin.people.inviteNew" />
        </Button>
      </div>

      {link === null ? null : (
        <LinkBox
          key={link.token}
          url={inviteUrl(globalThis.location.origin, link.token)}
          who={link.name ?? t('admin.people.newPerson', { role: link.role })}
          expires={format.format(link.expiresAt)}
        />
      )}
      {failure === null ? null : <Notice failure={failure} />}

      {people.status === 'idle' || people.status === 'loading' ? (
        <Muted>
          <Text path="admin.people.loading" />
        </Muted>
      ) : null}
      {people.status === 'error' ? <Notice failure={people.failure} onRetry={reload} /> : null}
      {people.status === 'ready' ? (
        <ul className="flex flex-col gap-2">
          {people.data.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              isMe={person.id === me.id}
              asking={asking === person.id}
              format={format}
              onAsk={(ask) => setAsking(ask ? person.id : null)}
              onLink={() => void createLink(person)}
              onDisable={() =>
                void act(async () => {
                  await call((client) => client.people.disable({ params: { id: person.id } }));
                  setAsking(null);
                })
              }
              onRevoke={(id) =>
                void act(() => call((client) => client.people.revokeDevice({ params: { id } })))
              }
            />
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

function PersonRow({
  person,
  isMe,
  asking,
  format,
  onAsk,
  onLink,
  onDisable,
  onRevoke,
}: {
  person: Person;
  isMe: boolean;
  asking: boolean;
  format: Intl.DateTimeFormat;
  onAsk: (ask: boolean) => void;
  onLink: () => void;
  onDisable: () => void;
  onRevoke: (deviceId: string) => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-chip border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-13 text-ink">
          {person.name}{' '}
          <span className="text-12 text-ink-dim">
            · <Text path={person.role === 'owner' ? 'admin.role.owner' : 'admin.role.editor'} />
            {person.disabled ? (
              <>
                {' · '}
                <Text path="admin.people.disabled" />
              </>
            ) : null}
          </span>
        </span>
        {person.disabled ? null : (
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onLink}>
              <Text path="admin.people.addDevice" />
            </Button>
            {isMe ? null : (
              <Button variant="ghost" onClick={() => onAsk(true)}>
                <Text path="admin.people.disable" />
              </Button>
            )}
          </span>
        )}
      </div>
      {asking ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-12 text-ink">
            <Text path="admin.people.disableConfirm" values={{ name: person.name }} />
          </span>
          <Button variant="destructive" onClick={onDisable}>
            <Text path="admin.people.confirm" />
          </Button>
          <Button variant="outline" onClick={() => onAsk(false)}>
            <Text path="admin.people.cancel" />
          </Button>
        </div>
      ) : null}
      <p className="text-12 text-ink-dim">
        <Text path="admin.people.devices" values={{ count: person.devices.length }} />
      </p>
      {person.devices.length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {person.devices.map((device) => (
            <DeviceRow
              key={device.id}
              device={device}
              format={format}
              onRevoke={() => onRevoke(device.id)}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function DeviceRow({
  device,
  format,
  onRevoke,
}: {
  device: Device;
  format: Intl.DateTimeFormat;
  onRevoke: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-12">
      <span className="text-ink">
        {device.label === '' ? <Text path="admin.people.unknownDevice" /> : device.label}
        <span className="text-ink-dim">
          {' · '}
          {device.current ? (
            <Text path="admin.people.thisDevice" />
          ) : (
            <Text
              path="admin.people.lastSeen"
              values={{ when: format.format(device.lastSeenAt) }}
            />
          )}
        </span>
      </span>
      {device.current ? null : (
        <Button variant="ghost" onClick={onRevoke}>
          <Text path="admin.people.revoke" />
        </Button>
      )}
    </li>
  );
}

function LinkBox({ url, who, expires }: { url: string; who: string; expires: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-chip border border-line-strong bg-surface-2 p-3">
      <p className="text-12 text-ink">
        <Text path="admin.people.linkFor" values={{ who }} />
      </p>
      <input
        readOnly
        value={url}
        aria-label={who}
        className="numeric h-control w-full rounded-chip border border-line bg-surface-1 px-2 text-12 text-ink"
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() => void navigator.clipboard.writeText(url).then(() => setCopied(true))}
        >
          <Text path={copied ? 'admin.people.copied' : 'admin.people.copy'} />
        </Button>
        <span className="text-12 text-ink-faint">
          <Text path="admin.people.linkNote" values={{ expires }} />
        </span>
      </div>
    </div>
  );
}
