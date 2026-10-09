import { type InviteInfo, MAX_NAME_LENGTH, type WhoAmI } from '@disa/admin-contract';
import { Text, useLocale, useT } from '@disa/i18n';
import { Button, DURATION_PANEL_SECONDS, EASE_OUT, Input, motion } from '@disa/ui';
import { type FormEvent, useId, useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import { useResource } from '../hooks/use-resource';
import { Card, Pill } from './flow/Parts';
import { Notice } from './Notice';
import { Muted } from './Section';

function failureOf(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

const EXAMPLES = ['admin.invite.exampleA', 'admin.invite.exampleB'] as const;

function Can({ role }: { role: InviteInfo['role'] }) {
  const items = [
    'admin.invite.canAdd',
    'admin.invite.canFix',
    'admin.invite.canShare',
    ...(role === 'owner' ? (['admin.invite.canInvite'] as const) : []),
  ] as const;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((key) => (
        <li key={key} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-14 text-ink-dim">
          <span aria-hidden="true">✓</span>
          <span>
            <Text path={key} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Opened from `#invite=…`: who asked, which role, what that lets you do, and the one question a new
 * person has to answer — how to sign their changes.
 */
export function InviteScreen({
  token,
  onSignedIn,
}: {
  token: string;
  onSignedIn: (me: WhoAmI) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const nameId = useId();
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
    <div className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="flex w-full max-w-[520px] flex-col gap-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-card bg-ink font-bold text-20 text-surface-0"
          >
            d
          </span>
          <div>
            <b className="block text-14 text-ink">disalytics</b>
            <span className="text-13 text-ink-faint">
              <Text path="admin.invite.brand" />
            </span>
          </div>
        </div>
        {info.status === 'idle' || info.status === 'loading' ? (
          <Muted>
            <Text path="admin.invite.checking" />
          </Muted>
        ) : null}
        {info.status === 'error' ? <Notice failure={info.failure} onRetry={reload} /> : null}
        {info.status === 'ready' ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION_PANEL_SECONDS, ease: EASE_OUT }}
          >
            <Card className="p-6">
              <form className="flex flex-col gap-5" onSubmit={(event) => void submit(event)}>
                {info.data.name === undefined ? (
                  <>
                    <div className="flex flex-col items-start gap-2.5">
                      <Pill tone="new">
                        {info.data.invitedBy === undefined ? (
                          <Text path="admin.invite.pillAnon" />
                        ) : (
                          <Text path="admin.invite.pill" values={{ name: info.data.invitedBy }} />
                        )}
                      </Pill>
                      <h1 className="font-semibold text-28 text-ink">
                        <Text path="admin.invite.heading" />
                      </h1>
                      <p className="m-0 text-14 text-ink-dim">
                        <Text path="admin.invite.role" values={{ role: info.data.role }} />
                      </p>
                      <Can role={info.data.role} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={nameId} className="font-medium text-14 text-ink">
                        <Text path="admin.invite.name" />
                      </label>
                      <Input
                        id={nameId}
                        value={name}
                        maxLength={MAX_NAME_LENGTH}
                        required
                        autoFocus
                        autoComplete="nickname"
                        placeholder={t('admin.invite.namePlaceholder')}
                        onChange={(event) => setName(event.currentTarget.value)}
                      />
                      <span className="text-12 text-ink-faint">
                        <Text path="admin.invite.nameHint" />
                      </span>
                      <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
                        <legend className="sr-only">{t('admin.invite.examples')}</legend>
                        {EXAMPLES.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setName(t(key))}
                            className="rounded-full border border-line px-2.5 py-0.5 text-12 text-ink-dim transition-[color,border-color] duration-(--duration-micro) hover:border-line-strong hover:text-ink"
                          >
                            <Text path={key} />
                          </button>
                        ))}
                      </fieldset>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-start gap-2.5">
                    <h1 className="font-semibold text-28 text-ink">
                      <Text path="admin.invite.deviceHeading" />
                    </h1>
                    <p className="m-0 text-14 text-ink-dim">
                      <Text path="admin.invite.device" values={{ name: info.data.name }} />
                    </p>
                  </div>
                )}
                {failure === null ? null : <Notice failure={failure} />}
                <Button
                  type="submit"
                  size="lg"
                  disabled={busy || (info.data.name === undefined && name.trim() === '')}
                >
                  <Text path={busy ? 'admin.invite.signingIn' : 'admin.invite.submit'} />
                </Button>
                <p className="m-0 text-12 text-ink-faint leading-relaxed">
                  <Text
                    path="admin.invite.fine"
                    values={{ expires: expires(info.data.expiresAt) }}
                  />
                </p>
              </form>
            </Card>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
