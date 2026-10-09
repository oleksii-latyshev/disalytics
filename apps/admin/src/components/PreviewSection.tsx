import type { PreviewResponse, PreviewStatus } from '@disa/admin-contract';
import type { Lineup } from '@disa/demo-core';
import { Text, type TranslationKey } from '@disa/i18n';
import { Switch } from '@disa/ui';
import type { Failure } from '../api/client';
import type { Decision, Decisions } from '../helpers/decisions';
import type { Resource } from '../hooks/use-resource';
import { Notice } from './Notice';
import { PreviewRow } from './PreviewRow';
import { Muted, Section } from './Section';

const ORDER: readonly PreviewStatus[] = ['update', 'duplicate', 'new', 'unchanged'];
const STATUS_KEYS: Readonly<Record<PreviewStatus, TranslationKey>> = {
  new: 'admin.status.new',
  update: 'admin.status.update',
  duplicate: 'admin.status.duplicate',
  unchanged: 'admin.status.unchanged',
};

export function PreviewSection({
  map,
  preview,
  lineups,
  images,
  decisions,
  onDecision,
  copyLinks,
  onCopyLinks,
  onRetry,
}: {
  map: string;
  preview: Resource<PreviewResponse>;
  lineups: ReadonlyMap<string, Lineup>;
  images: Readonly<Record<string, string>>;
  decisions: Decisions;
  onDecision: (id: string, next: Decision) => void;
  copyLinks: boolean;
  onCopyLinks: (value: boolean) => void;
  onRetry: () => void;
}) {
  return (
    <Section
      title={<Text path="admin.preview.title" />}
      aside={
        preview.status === 'ready' ? (
          <span className="numeric">
            <Text path="admin.preview.revision" values={{ revision: preview.data.revision }} />
          </span>
        ) : null
      }
    >
      <div aria-live="polite" className="flex flex-col gap-3">
        <Body
          map={map}
          preview={preview}
          lineups={lineups}
          images={images}
          decisions={decisions}
          onDecision={onDecision}
          copyLinks={copyLinks}
          onCopyLinks={onCopyLinks}
          onRetry={onRetry}
        />
      </div>
    </Section>
  );
}

function Body(props: Parameters<typeof PreviewSection>[0]) {
  const { preview } = props;
  if (preview.status === 'idle') return null;
  if (preview.status === 'loading') {
    return (
      <Muted>
        <Text path="admin.preview.loading" />
      </Muted>
    );
  }
  if (preview.status === 'error') {
    const failure: Failure = preview.failure;
    return <Notice failure={failure} onRetry={props.onRetry} />;
  }
  return <Ready {...props} data={preview.data} />;
}

function Ready({
  data,
  map,
  lineups,
  images,
  decisions,
  onDecision,
  copyLinks,
  onCopyLinks,
}: Parameters<typeof PreviewSection>[0] & { data: PreviewResponse }) {
  if (data.items.length === 0) {
    return (
      <Muted>
        <Text path="admin.preview.empty" values={{ map }} />
      </Muted>
    );
  }
  return (
    <>
      {data.ignored > 0 ? (
        <Muted>
          <Text path="admin.file.otherMaps" values={{ count: data.ignored }} />
        </Muted>
      ) : null}
      <PhotoControls stats={data.photos} copyLinks={copyLinks} onCopyLinks={onCopyLinks} />
      {ORDER.map((status) => {
        const rows = data.items.filter((item) => item.status === status);
        if (rows.length === 0) return null;
        return (
          <div key={status} className="flex flex-col gap-2">
            <h3 className="font-medium text-13 text-ink">
              <Text path={STATUS_KEYS[status]} />{' '}
              <span className="numeric text-ink-dim">{rows.length}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {rows.map((item) => {
                const lineup = lineups.get(item.id);
                const decision = decisions[item.id];
                if (lineup === undefined || decision === undefined) return null;
                return (
                  <PreviewRow
                    key={item.id}
                    item={item}
                    lineup={lineup}
                    images={images}
                    decision={decision}
                    onChange={(next) => onDecision(item.id, next)}
                  />
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function PhotoControls({
  stats,
  copyLinks,
  onCopyLinks,
}: {
  stats: PreviewResponse['photos'];
  copyLinks: boolean;
  onCopyLinks: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-13">
      {stats.embedded > 0 ? (
        <Muted>
          <Text path="admin.photos.embedded" values={{ count: stats.embedded }} />
        </Muted>
      ) : null}
      {stats.ours > 0 ? (
        <Muted>
          <Text path="admin.photos.ours" values={{ count: stats.ours }} />
        </Muted>
      ) : null}
      {stats.links > 0 ? (
        <label htmlFor="copy-link-photos" className="flex items-start gap-3">
          <Switch
            id="copy-link-photos"
            checked={copyLinks}
            onChange={(event) => onCopyLinks(event.currentTarget.checked)}
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-ink">
              <Text path="admin.photos.copy" />
            </span>
            <span className="text-12 text-ink-dim">
              <Text path="admin.photos.copyNote" values={{ count: stats.links }} />
            </span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
