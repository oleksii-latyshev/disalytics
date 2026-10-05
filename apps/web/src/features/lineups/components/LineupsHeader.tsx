import { Text } from '@disa/i18n';
import type { MapId } from '@disa/map-data';
import { Button } from '@disa/ui';
import { Plus } from 'lucide-react';
import { mapName } from '../helpers/map-name';
import { LineupMapTabs } from './LineupMapTabs';
import { LineupsTransfer } from './LineupsTransfer';

interface Props {
  map: MapId;
  counts: ReadonlyMap<string, number>;
  ownCount: number;
  onMap: (map: MapId) => void;
  onAdd: () => void;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<number>;
}

/** The title, a tab per map, and the two things a reader does to their own lineups. */
export function LineupsHeader({ map, counts, ownCount, onMap, onAdd, onExport, onImport }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-3 wide:gap-x-4">
      <h1 className="font-ui font-semibold text-20 text-ink leading-tight wide:text-28">
        <Text path="library.lineups.title" />
      </h1>
      <LineupMapTabs map={map} counts={counts} onMap={onMap} />
      <span className="flex-1" />
      <LineupsTransfer
        mapName={mapName(map)}
        ownCount={ownCount}
        onExport={onExport}
        onImport={onImport}
      />
      <Button onClick={onAdd} className="gap-2">
        <Plus aria-hidden="true" className="size-4" />
        <Text path="library.lineups.add" />
      </Button>
    </header>
  );
}
