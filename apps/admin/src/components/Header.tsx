import type { WhoAmI } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import type { Resource } from '../hooks/use-resource';
import { Notice } from './Notice';

export function Header({ me }: { me: Resource<WhoAmI> }) {
  return (
    <>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-medium text-20 text-ink">
          <Text path="admin.title" />
        </h1>
        {me.status === 'ready' ? (
          <p className="numeric text-12 text-ink-dim">
            <Text path="admin.signedIn" values={{ email: me.data.email }} />
          </p>
        ) : null}
      </header>
      {me.status === 'error' ? <Notice failure={me.failure} /> : null}
    </>
  );
}
