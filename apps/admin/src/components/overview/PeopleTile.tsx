import { ADMIN_ROLES, type AdminRole, type InviteCreated } from '@disa/admin-contract';
import { Text, useLocale, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { call, type Failure, isFailure } from '../../api/client';
import { inviteUrl } from '../../helpers/invite-link';
import { useResource } from '../../hooks/use-resource';
import { SELECT_CLASS } from '../MapPicker';
import { Notice } from '../Notice';
import { LinkBox } from '../PeopleSection';
import { TILE_BODY, TILE_LINK, TileHead } from './BentoTile';

interface Link extends InviteCreated {
  readonly role: AdminRole;
}

/** The owner's: how many people and devices there are, and a one-time link for the next person. */
export function PeopleTile() {
  const t = useT();
  const locale = useLocale();
  const [people, reload] = useResource('overview-people', async () => {
    const { people: list } = await call((client) => client.people.list());
    return list;
  });
  const [role, setRole] = useState<AdminRole>('editor');
  const [link, setLink] = useState<Link | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const invite = async () => {
    setFailure(null);
    try {
      const created = await call((client) => client.people.invite({ payload: { role } }));
      setLink({ ...created, role });
      reload();
    } catch (error) {
      setFailure(isFailure(error) ? error : { key: 'admin.error.network', detail: undefined });
    }
  };

  const active = people.status === 'ready' ? people.data.filter((person) => !person.disabled) : [];
  const devices = active.reduce((total, person) => total + person.devices.length, 0);

  return (
    <div className={TILE_BODY}>
      <TileHead
        title={<Text path="admin.overview.people.title" />}
        aside={
          <a href="#/people" className={TILE_LINK}>
            <Text path="admin.overview.people.manage" />
          </a>
        }
      />
      {people.status === 'error' ? <Notice failure={people.failure} onRetry={reload} /> : null}
      {people.status === 'ready' ? (
        <p className="numeric text-13 text-ink-dim">
          <span className="text-ink">
            <Text path="admin.overview.people.count" values={{ count: active.length }} />
          </span>
          {' · '}
          <Text path="admin.overview.people.devices" values={{ count: devices }} />
        </p>
      ) : null}
      <div className="relative z-3 mt-auto flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="sr-only">
            <Text path="admin.overview.people.role" />
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
        <Button onClick={() => void invite()}>
          <Text path="admin.people.inviteNew" />
        </Button>
      </div>
      {link === null ? null : (
        <LinkBox
          key={link.token}
          url={inviteUrl(globalThis.location.origin, link.token)}
          who={t('admin.people.newPerson', { role: link.role })}
          expires={new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(link.expiresAt)}
        />
      )}
      {failure === null ? null : <Notice failure={failure} />}
    </div>
  );
}
