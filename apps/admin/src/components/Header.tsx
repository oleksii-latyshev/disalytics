import type { WhoAmI } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { SteamLink } from './SteamLink';

export function Header({ me, onSignOut }: { me: WhoAmI | null; onSignOut: () => void }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-2">
      <h1 className="font-medium text-20 text-ink">
        <Text path="admin.title" />
      </h1>
      {me === null ? null : (
        <span className="flex flex-wrap items-center gap-2 text-12 text-ink-dim">
          <span>
            <Text path="admin.signedIn" values={{ name: me.name }} />
            {' · '}
            <Text path={me.role === 'owner' ? 'admin.role.owner' : 'admin.role.editor'} />
          </span>
          <Button variant="ghost" onClick={onSignOut}>
            <Text path="admin.signOut" />
          </Button>
        </span>
      )}
      {me === null ? null : <SteamLink key={me.id} me={me} />}
    </header>
  );
}
