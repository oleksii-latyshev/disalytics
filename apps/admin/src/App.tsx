import type { ChangeEntry } from '@disa/admin-contract';
import { Text } from '@disa/i18n';
import { useCallback, useState } from 'react';
import { call } from './api/client';
import { ChangesList } from './components/ChangesList';
import { CommitBar, ResultSummary } from './components/CommitBar';
import { CurrentLineups } from './components/CurrentLineups';
import { FileDrop } from './components/FileDrop';
import { Header } from './components/Header';
import { MapPicker } from './components/MapPicker';
import { Notice } from './components/Notice';
import { PreviewSection } from './components/PreviewSection';
import { Muted, Section } from './components/Section';
import { planChunks } from './helpers/chunks';
import { toResolutions } from './helpers/decisions';
import { DEFAULT_MAP, mapOptions } from './helpers/format';
import { mapsOf } from './helpers/lineup-file';
import { useCommit } from './hooks/use-commit';
import { useImport } from './hooks/use-import';
import { useResource } from './hooks/use-resource';

export function App() {
  const [map, setMap] = useState(DEFAULT_MAP);

  const [me] = useResource('me', () => call((client) => client.me.whoami()));
  const [current, reloadCurrent] = useResource(map, async () => {
    const { lineups } = await call((client) => client.lineups.byMap({ params: { map } }));
    return lineups;
  });
  const [changes, reloadChanges] = useResource<readonly ChangeEntry[]>(map, async () => {
    const response = await call((client) => client.changes.list({ query: { map } }));
    return response.changes;
  });

  const afterCommit = useCallback(() => {
    reloadCurrent();
    reloadChanges();
  }, [reloadCurrent, reloadChanges]);
  const commit = useCommit(afterCommit);
  const imported = useImport(map, setMap, commit.reset);
  const { loaded, data } = imported;

  const resolutions = toResolutions(imported.decisions, imported.lineups);
  const apply = () => {
    if (loaded === null) return;
    const entries = resolutions.flatMap((resolution) => {
      const lineup = imported.lineups.get(resolution.id);
      return lineup === undefined ? [] : [{ lineup, resolution }];
    });
    commit.start(map, planChunks(entries, loaded.file.images), imported.copyLinks);
  };
  const startOver = () => {
    commit.reset();
    imported.clear();
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <Header me={me} />

      <Section title={<Text path="admin.file.title" />}>
        <MapPicker
          map={map}
          options={mapOptions(loaded === null ? [] : mapsOf(loaded.file.lineups))}
          onChange={setMap}
        />
        <FileDrop file={loaded?.file ?? null} onFile={imported.open} />
        {imported.problem !== null && !imported.problem.ok ? (
          <Notice failure={{ key: imported.problem.key, detail: imported.problem.detail }} />
        ) : null}
        {loaded === null && imported.problem === null ? (
          <Muted>
            <Text path="admin.file.hint" />
          </Muted>
        ) : null}
      </Section>

      {loaded !== null && commit.state.phase !== 'done' ? (
        <>
          <PreviewSection
            map={map}
            preview={imported.preview}
            lineups={imported.lineups}
            images={loaded.file.images}
            decisions={imported.decisions}
            onDecision={imported.setDecision}
            copyLinks={imported.copyLinks}
            onCopyLinks={imported.setCopyLinks}
            onRetry={imported.reloadPreview}
          />
          {data !== null && data.items.length > 0 ? (
            <CommitBar
              count={resolutions.length}
              state={commit.state}
              onApply={apply}
              onRetry={() => void commit.retry()}
            />
          ) : null}
        </>
      ) : null}

      {commit.state.phase === 'done' ? (
        <ResultSummary
          results={commit.state.results}
          skipped={data === null ? 0 : data.items.length - resolutions.length}
          onAgain={startOver}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <CurrentLineups
          map={map}
          resource={current}
          onChanged={afterCommit}
          onRetry={reloadCurrent}
        />
        <ChangesList resource={changes} onRetry={reloadChanges} />
      </div>
    </div>
  );
}
