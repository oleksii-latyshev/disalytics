import type {
  ChangeEntry,
  Contributor,
  OverviewResponse,
  SiteTacticsResponse,
  WhoAmI,
} from '@disa/admin-contract';
import { isLineup } from '@disa/demo-core';
import { useCallback, useEffect, useState } from 'react';
import { call } from './api/client';
import { ChangesList } from './components/ChangesList';
import { ContributorsSection } from './components/ContributorsSection';
import { ImportFlow } from './components/flow/ImportFlow';
import { Header } from './components/Header';
import { InviteScreen } from './components/InviteScreen';
import { Notice } from './components/Notice';
import { OnSite } from './components/OnSite';
import { Overview } from './components/overview/Overview';
import { PeopleSection } from './components/PeopleSection';
import { SectionNav } from './components/SectionNav';
import { SignedOut } from './components/SignedOut';
import { SiteCollections } from './components/SiteCollections';
import { TacticsTab } from './components/TacticsTab';
import { DEFAULT_MAP } from './helpers/format';
import { forgetInvite, inviteTokenOf } from './helpers/invite-link';
import type { Section } from './helpers/route';
import { mapResource, useResource } from './hooks/use-resource';
import { useRoute } from './hooks/use-route';

/** The person with the Steam link they last saved, when they saved one since signing in. */
function withSteam(me: WhoAmI, steam: string | null | undefined): WhoAmI {
  if (steam === undefined) return me;
  const { steamUrl: _previous, ...rest } = me;
  return steam === null ? rest : { ...rest, steamUrl: steam };
}

/**
 * Who is here decides the screen: an invite link being opened, a device with no session, or a
 * signed-in person and the admin itself.
 */
export function App() {
  const [invite, setInvite] = useState(() => inviteTokenOf(globalThis.location.hash));
  const [me, reloadMe] = useResource(invite === null ? 'me' : null, () =>
    call((client) => client.me.whoami()),
  );

  const [steam, setSteam] = useState<string | null | undefined>(undefined);
  const [isAccountOpen, setAccountOpen] = useState(false);
  // The Steam link is edited in the account menu without reloading who is signed in, so the page
  // keeps the newest answer beside `me`.
  const signedIn = me.status === 'ready' ? withSteam(me.data, steam) : null;

  const signOut = () => {
    // Whatever the answer, the next whoami tells the truth about this device.
    call((client) => client.auth.signOut()).then(reloadMe, reloadMe);
  };

  if (invite !== null) {
    return (
      <InviteScreen
        token={invite}
        onSignedIn={() => {
          forgetInvite();
          setInvite(null);
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-4">
      <Header
        me={signedIn}
        onSignOut={signOut}
        isAccountOpen={isAccountOpen}
        onAccountOpenChange={setAccountOpen}
        onSteamSaved={setSteam}
      />
      {me.status === 'error' ? (
        me.failure.key === 'admin.error.unauthorized' ? (
          <SignedOut />
        ) : (
          <Notice failure={me.failure} onRetry={reloadMe} />
        )
      ) : null}
      {signedIn === null ? null : (
        <Workspace me={signedIn} onAddSteam={() => setAccountOpen(true)} />
      )}
    </div>
  );
}

function Workspace({ me, onAddSteam }: { me: WhoAmI; onAddSteam: () => void }) {
  const [route, navigate] = useRoute();
  const [map, setMap] = useState(route.map ?? DEFAULT_MAP);
  // The address names a map (a link from the overview, Back, a reload): the lists follow it.
  useEffect(() => {
    if (route.map !== undefined) setMap(route.map);
  }, [route.map]);
  const pickMap = (next: string) => {
    setMap(next);
    if (route.section === 'onSite') navigate({ section: 'onSite', map: next }, 'replace');
  };
  const startedTactic = useCallback(() => navigate({ section: 'tactics' }, 'replace'), [navigate]);

  const [current, reloadCurrent] = useResource(map, async () => {
    const { lineups, collections } = await call((client) =>
      client.lineups.byMap({ params: { map } }),
    );
    return { lineups, collections };
  });
  const [changes, reloadChanges] = useResource<readonly ChangeEntry[]>(map, async () => {
    const response = await call((client) => client.changes.list({ query: { map } }));
    return response.changes;
  });

  const [contributors, reloadContributors] = useResource<readonly Contributor[]>(
    'contributors',
    async () => {
      const response = await call((client) => client.contributors.list());
      return response.contributors;
    },
  );

  const [siteTactics, reloadTactics] = useResource<SiteTacticsResponse>('tactics', () =>
    call((client) => client.tactics.list()),
  );
  const [overview, reloadOverview] = useResource<OverviewResponse>('overview', () =>
    call((client) => client.overview.read()),
  );

  const afterChange = useCallback(() => {
    reloadCurrent();
    reloadChanges();
    reloadContributors();
    reloadOverview();
  }, [reloadCurrent, reloadChanges, reloadContributors, reloadOverview]);
  const afterTacticChange = useCallback(() => {
    reloadTactics();
    reloadChanges();
    reloadOverview();
  }, [reloadTactics, reloadChanges, reloadOverview]);
  const sections: readonly Section[] =
    me.role === 'owner'
      ? ['overview', 'import', 'onSite', 'tactics', 'people', 'contributors', 'history']
      : ['overview', 'import', 'onSite', 'tactics', 'contributors', 'history'];
  // A person who is not an owner has no People; its address reads as the overview.
  const active: Section = sections.includes(route.section) ? route.section : 'overview';
  const onSite = current.status === 'ready' ? current.data.lineups.filter(isLineup) : [];

  const lineupsResource = mapResource(current, (data) => data.lineups);
  const collectionsResource = mapResource(current, (data) => data.collections);

  return (
    <>
      <SectionNav sections={sections} active={active} />
      <div hidden={active !== 'overview'}>
        <Overview me={me} resource={overview} onRetry={reloadOverview} onAddSteam={onAddSteam} />
      </div>
      <div hidden={active !== 'import'}>
        <ImportFlow map={map} onMap={setMap} onSite={onSite} onChanged={afterChange} />
      </div>
      <div hidden={active !== 'onSite'}>
        <OnSite
          map={map}
          onMap={pickMap}
          resource={lineupsResource}
          onChanged={afterChange}
          onRetry={reloadCurrent}
        />
        <SiteCollections map={map} resource={collectionsResource} onChanged={afterChange} />
      </div>
      <div hidden={active !== 'tactics'}>
        <TacticsTab
          map={map}
          startNew={route.isNewTactic === true}
          onStarted={startedTactic}
          resource={siteTactics}
          onChanged={afterTacticChange}
          onRetry={reloadTactics}
        />
      </div>
      {me.role === 'owner' ? (
        <div hidden={active !== 'people'}>
          <PeopleSection me={me} />
        </div>
      ) : null}
      <div hidden={active !== 'contributors'}>
        <ContributorsSection resource={contributors} onRetry={reloadContributors} />
      </div>
      <div hidden={active !== 'history'}>
        <ChangesList resource={changes} onRetry={reloadChanges} />
      </div>
    </>
  );
}
