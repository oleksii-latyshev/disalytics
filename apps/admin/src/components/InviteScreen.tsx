import { type InviteInfo, MAX_NAME_LENGTH, type WhoAmI } from '@disa/admin-contract';
import { Text, useLocale, useT } from '@disa/i18n';
import { Button, Input } from '@disa/ui';
import { type FormEvent, useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import { useResource } from '../hooks/use-resource';
import { Notice } from './Notice';
import { Muted, Section } from './Section';

function failureOf(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

/** Opened from `#invite=…`: says what the link does, asks a new person's name, signs the device in. */
export function InviteScreen({
  token,
  onSignedIn,
}: {
  token: string;
  onSignedIn: (me: WhoAmI) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [info, reload] = useResource<InviteInfo>(token, () =>
    call((client) => client.auth.invite({ payload: { token } })),
  );
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      const trimmed = name.trim();
      const me = await call((client) =>
        client.auth.redeem({ payload: trimmed === '' ? { token } : { token, name: trimmed } }),
      );
      onSignedIn(me);
    } catch (error) {
      setFailure(failureOf(error));
      setBusy(false);
    }
  };

  const expires = (at: number) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(at);

  return (
    <Section title={<Text path="admin.invite.title" />}>
      {info.status === 'idle' || info.status === 'loading' ? (
        <Muted>
          <Text path="admin.invite.checking" />
        </Muted>
      ) : null}
      {info.status === 'error' ? <Notice failure={info.failure} onRetry={reload} /> : null}
      {info.status === 'ready' ? (
        <form className="flex max-w-md flex-col gap-3" onSubmit={(event) => void submit(event)}>
          <Muted>
            {info.data.name === undefined ? (
              <Text
                path="admin.invite.newPerson"
                values={{ role: info.data.role, expires: expires(info.data.expiresAt) }}
              />
            ) : (
              <Text
                path="admin.invite.device"
                values={{ name: info.data.name, expires: expires(info.data.expiresAt) }}
              />
            )}
          </Muted>
          {info.data.name === undefined ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="invite-name" className="text-12 text-ink-dim">
                <Text path="admin.invite.name" />
              </label>
              <Input
                id="invite-name"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                required
                autoFocus
                autoComplete="name"
                placeholder={t('admin.invite.namePlaceholder')}
                onChange={(event) => setName(event.currentTarget.value)}
              />
            </div>
          ) : null}
          {failure === null ? null : <Notice failure={failure} />}
          <Button
            type="submit"
            className="self-start"
            disabled={busy || (info.data.name === undefined && name.trim() === '')}
          >
            <Text path={busy ? 'admin.invite.signingIn' : 'admin.invite.submit'} />
          </Button>
        </form>
      ) : null}
    </Section>
  );
}
