import type { WhoAmI } from '@disa/admin-contract';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ChevronDown, User, Waypoints } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { SteamLink } from './SteamLink';

/** The person's own corner: who they are, their Steam link, sign out. Closes on Escape or a press outside. */
function AccountMenu({
  me,
  isOpen,
  onOpenChange,
  onSteamSaved,
  onSignOut,
}: {
  me: WhoAmI;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSteamSaved: (steamUrl: string | null) => void;
  onSignOut: () => void;
}) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const panel = useId();

  useEffect(() => {
    if (!isOpen) return;
    const away = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        onOpenChange(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panel}
        aria-label={t('admin.nav.account')}
        onClick={() => onOpenChange(!isOpen)}
        className="flex h-control max-w-48 items-center gap-2 rounded-card border border-line bg-surface-1 px-2.5 text-13 text-ink transition-colors hover:border-line-strong"
      >
        <User aria-hidden="true" className="size-4 shrink-0 text-ink-dim" />
        <span className="hidden truncate sm:inline">{me.name}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-ink-dim" />
      </button>
      {isOpen ? (
        <div
          id={panel}
          className="absolute top-full right-0 z-20 mt-2 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 rounded-card border border-line-strong bg-surface-2 p-4 shadow-lg"
        >
          <p className="text-13 text-ink">
            <Text path="admin.signedIn" values={{ name: me.name }} />
            <span className="text-ink-dim">
              {' · '}
              <Text path={me.role === 'owner' ? 'admin.role.owner' : 'admin.role.editor'} />
            </span>
          </p>
          <SteamLink key={me.id} me={me} onSaved={onSteamSaved} />
          <div>
            <Button variant="outline" onClick={onSignOut}>
              <Text path="admin.signOut" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Header({
  me,
  onSignOut,
  isAccountOpen,
  onAccountOpenChange,
  onSteamSaved,
}: {
  me: WhoAmI | null;
  onSignOut: () => void;
  isAccountOpen: boolean;
  onAccountOpenChange: (open: boolean) => void;
  onSteamSaved: (steamUrl: string | null) => void;
}) {
  const t = useT();
  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="min-w-0 font-medium text-20 text-ink">
        <a
          href="#/"
          aria-label={t('admin.nav.home')}
          className="flex items-center gap-2.5 rounded-chip"
        >
          <span
            aria-hidden="true"
            style={{ background: 'var(--tone-add)' }}
            className="flex size-8 shrink-0 items-center justify-center rounded-card border border-white/20 text-white"
          >
            <Waypoints className="size-4" strokeWidth={1.8} />
          </span>
          <span className="truncate">
            <Text path="admin.title" />
          </span>
        </a>
      </h1>
      {me === null ? null : (
        <AccountMenu
          me={me}
          isOpen={isAccountOpen}
          onOpenChange={onAccountOpenChange}
          onSteamSaved={onSteamSaved}
          onSignOut={onSignOut}
        />
      )}
    </header>
  );
}
