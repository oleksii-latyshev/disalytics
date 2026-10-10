import type { ChangeEntry, Contributor, SiteTacticsResponse, WhoAmI } from '@disa/admin-contract';
import { isLineup } from '@disa/demo-core';
import { useCallback, useState } from 'react';
import { call } from './api/client';
import { ChangesList } from './components/ChangesList';
import { ContributorsSection } from './components/ContributorsSection';
import { ImportFlow } from './components/flow/ImportFlow';
import { Header } from './components/Header';
import { InviteScreen } from './components/InviteScreen';
import { Notice } from './components/Notice';
import { OnSite } from './components/OnSite';
import { PeopleSection } from './components/PeopleSection';
import { SectionTabs, type TabId, tabPanelId } from './components/SectionTabs';
import { SignedOut } from './components/SignedOut';
import { SiteCollections } from './components/SiteCollections';
import { TacticsTab } from './components/TacticsTab';
import { DEFAULT_MAP } from './helpers/format';
import { forgetInvite, inviteTokenOf } from './helpers/invite-link';
import { mapResource, useResource } from './hooks/use-resource';

/**
 * Who is here decides the screen: an invite link being opened, a device with no session, or a
 * signed-in person and the admin itself.
 */
export function App() {
  const [invite, setInvite] = useState(() => inviteTokenOf(globalThis.location.hash));
  const [me, reloadMe] = useResource(invite === null ? 'me' : null, () =>
    call((client) => client.me.whoami()),
  );

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
      <Header me={me.status === 'ready' ? me.data : null} onSignOut={signOut} />
      {me.status === 'error' ? (
        me.failure.key === 'admin.error.unauthorized' ? (
          <SignedOut />
        ) : (
          <Notice failure={me.failure} onRetry={reloadMe} />
        )
      ) : null}
      {me.status === 'ready' ? <Workspace me={me.data} /> : null}
    </div>
  );
}

const PANEL_PREFIX = 'admin';

function Workspace({ me }: { me: WhoAmI }) {
  const [map, setMap] = useState(DEFAULT_MAP);
  const [tab, setTab] = useState<TabId>('import');
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

  const afterChange = useCallback(() => {
    reloadCurrent();
    reloadChanges();
    reloadContributors();
  }, [reloadCurrent, reloadChanges, reloadContributors]);
  const afterTacticChange = useCallback(() => {
    reloadTactics();
    reloadChanges();
  }, [reloadTactics, reloadChanges]);
  const tabs: readonly TabId[] =
    me.role === 'owner'
      ? ['import', 'onSite', 'tactics', 'people', 'contributors', 'history']
      : ['import', 'onSite', 'tactics', 'contributors', 'history'];
  const onSite = current.status === 'ready' ? current.data.lineups.filter(isLineup) : [];

  const lineupsResource = mapResource(current, (data) => data.lineups);
  const collectionsResource = mapResource(current, (data) => data.collections);

  return (
    <>
      <SectionTabs tabs={tabs} active={tab} onChange={setTab} idPrefix={PANEL_PREFIX} />
      <div role="tabpanel" id={tabPanelId(PANEL_PREFIX, 'import')} hidden={tab !== 'import'}>
        <ImportFlow map={map} onMap={setMap} onSite={onSite} onChanged={afterChange} />
      </div>
      <div role="tabpanel" id={tabPanelId(PANEL_PREFIX, 'onSite')} hidden={tab !== 'onSite'}>
        <OnSite
          map={map}
          onMap={setMap}
          resource={lineupsResource}
          onChanged={afterChange}
          onRetry={reloadCurrent}
        />
        <SiteCollections map={map} resource={collectionsResource} onChanged={afterChange} />
      </div>
      <div role="tabpanel" id={tabPanelId(PANEL_PREFIX, 'tactics')} hidden={tab !== 'tactics'}>
        <TacticsTab resource={siteTactics} onChanged={afterTacticChange} onRetry={reloadTactics} />
      </div>
      {me.role === 'owner' ? (
        <div role="tabpanel" id={tabPanelId(PANEL_PREFIX, 'people')} hidden={tab !== 'people'}>
          <PeopleSection me={me} />
        </div>
      ) : null}
      <div
        role="tabpanel"
        id={tabPanelId(PANEL_PREFIX, 'contributors')}
        hidden={tab !== 'contributors'}
      >
        <ContributorsSection resource={contributors} onRetry={reloadContributors} />
      </div>
      <div role="tabpanel" id={tabPanelId(PANEL_PREFIX, 'history')} hidden={tab !== 'history'}>
        <ChangesList resource={changes} onRetry={reloadChanges} />
      </div>
    </>
  );
}
