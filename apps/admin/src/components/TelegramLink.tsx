import type { WhoAmI } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { type FormEvent, useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import { Notice } from './Notice';
import { isTelegramInputValid, TelegramField, telegramLinkOf } from './TelegramField';

/** A signed-in person's own Telegram channel: shown, and set, changed or cleared in place. */
export function TelegramLink({
  me,
  onSaved,
}: {
  me: WhoAmI;
  /** Told who they are now, so the rest of the page can follow. */
  onSaved?: (me: WhoAmI) => void;
}) {
  const [saved, setSaved] = useState(me.telegramUrl ?? null);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const save = async (next: string | null) => {
    setBusy(true);
    setFailure(null);
    try {
      const updated = await call((client) => client.me.update({ payload: { telegramUrl: next } }));
      setSaved(updated.telegramUrl ?? null);
      onSaved?.(updated);
      setDraft(null);
    } catch (error) {
      setFailure(isFailure(error) ? error : { key: 'admin.error.network', detail: undefined });
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const link = telegramLinkOf(draft ?? '');
    if (link !== null || (draft ?? '').trim() === '') void save(link);
  };

  if (draft === null) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-12 text-ink-dim">
        <Text path="admin.telegram.yours" />:
        {saved === null ? (
          <span className="text-ink-faint">
            <Text path="admin.telegram.none" />
          </span>
        ) : (
          <a
            href={saved}
            target="_blank"
            rel="noreferrer"
            className="numeric text-ink underline-offset-4 hover:underline"
          >
            {saved.replace('https://t.me/', '@')}
          </a>
        )}
        <Button variant="ghost" onClick={() => setDraft(saved ?? '')}>
          <Text path={saved === null ? 'admin.telegram.add' : 'admin.telegram.edit'} />
        </Button>
      </span>
    );
  }

  return (
    <form className="flex w-full max-w-[520px] flex-col gap-2" onSubmit={submit}>
      <TelegramField value={draft} onChange={setDraft} autoFocus />
      {failure === null ? null : <Notice failure={failure} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || !isTelegramInputValid(draft)}>
          <Text path="admin.telegram.save" />
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setDraft(null)}>
          <Text path="admin.telegram.cancel" />
        </Button>
        {saved === null ? null : (
          <Button variant="ghost" disabled={busy} onClick={() => void save(null)}>
            <Text path="admin.telegram.remove" />
          </Button>
        )}
      </div>
    </form>
  );
}
