import type { WhoAmI } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { type FormEvent, useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import { Notice } from './Notice';
import { isSteamInputValid, SteamField } from './SteamField';

/** A signed-in person's own Steam link: shown, and set, changed or cleared in place. */
export function SteamLink({
  me,
  onSaved,
}: {
  me: WhoAmI;
  /** Told the new link (or `null` when cleared), so the rest of the page can follow. */
  onSaved?: (steamUrl: string | null) => void;
}) {
  const [saved, setSaved] = useState(me.steamUrl ?? null);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const save = async (next: string | null) => {
    setBusy(true);
    setFailure(null);
    try {
      const updated = await call((client) => client.me.update({ payload: { steamUrl: next } }));
      setSaved(updated.steamUrl ?? null);
      onSaved?.(updated.steamUrl ?? null);
      setDraft(null);
    } catch (error) {
      setFailure(isFailure(error) ? error : { key: 'admin.error.network', detail: undefined });
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = (draft ?? '').trim();
    void save(trimmed === '' ? null : trimmed);
  };

  if (draft === null) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-12 text-ink-dim">
        <Text path="admin.steam.yours" />:
        {saved === null ? (
          <span className="text-ink-faint">
            <Text path="admin.steam.none" />
          </span>
        ) : (
          <a
            href={saved}
            target="_blank"
            rel="noreferrer"
            className="numeric text-ink underline-offset-4 hover:underline"
          >
            {saved.replace('https://steamcommunity.com/', '')}
          </a>
        )}
        <Button variant="ghost" onClick={() => setDraft(saved ?? '')}>
          <Text path={saved === null ? 'admin.steam.add' : 'admin.steam.edit'} />
        </Button>
      </span>
    );
  }

  return (
    <form className="flex w-full max-w-[520px] flex-col gap-2" onSubmit={submit}>
      <SteamField value={draft} onChange={setDraft} autoFocus />
      {failure === null ? null : <Notice failure={failure} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || !isSteamInputValid(draft)}>
          <Text path="admin.steam.save" />
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => setDraft(null)}>
          <Text path="admin.steam.cancel" />
        </Button>
        {saved === null ? null : (
          <Button variant="ghost" disabled={busy} onClick={() => void save(null)}>
            <Text path="admin.steam.remove" />
          </Button>
        )}
      </div>
    </form>
  );
}
