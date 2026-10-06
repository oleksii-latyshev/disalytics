import { mainSteps } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Link } from '@tanstack/react-router';
import { NotebookPen, Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { SAMPLE_MATCHES, sampleByteLength, sampleKey } from '@/core/samples';
import { mergeRecent, type RecentItem } from '../../helpers/home-recent';
import { mapTitle } from '../../helpers/map-title';
import { megabytesOf } from '../../helpers/saved-list';
import type { WidgetProps } from './types';
import { WidgetBadge } from './WidgetBadge';

const ROW =
  'flex w-full items-center gap-3 rounded-chip px-1.5 py-1.5 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus';

function RowText({ title, meta }: { title: ReactNode; meta: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-13 font-medium leading-dense">{title}</span>
      <span className="truncate text-11 text-ink-dim">{meta}</span>
    </span>
  );
}

function When({ at }: { at: number }) {
  return (
    <span className="numeric shrink-0 text-11 text-ink-dim">
      <Text path="library.saved.storedAt" values={{ when: new Date(at) }} />
    </span>
  );
}

function ItemRow({
  item,
  onEnter,
}: {
  item: RecentItem;
  onEnter: WidgetProps['actions']['onEnter'];
}) {
  if (item.kind === 'tactic') {
    return (
      <Link to="/tactics" className={ROW}>
        <WidgetBadge icon={NotebookPen} />
        <RowText
          title={item.tactic.title}
          meta={
            <Text
              path="library.home.widget.recent.tacticMeta"
              values={{ map: mapTitle(item.tactic.map), count: mainSteps(item.tactic).length }}
            />
          }
        />
        <When at={item.at} />
      </Link>
    );
  }

  const { demo } = item;

  return (
    <button type="button" onClick={() => onEnter(demo, 0)} className={ROW}>
      <WidgetBadge icon={Play} />
      <RowText
        title={
          <Text
            path="library.home.widget.recent.matchTitle"
            values={{ map: mapTitle(demo.map), ...demo.score }}
          />
        }
        meta={
          <Text path="library.home.widget.recent.matchMeta" values={{ count: demo.roundCount }} />
        }
      />
      <When at={item.at} />
    </button>
  );
}

export function RecentWidget({ size, data, actions }: WidgetProps) {
  const items = mergeRecent(data.demos ?? [], data.tactics, size === 'L' ? 6 : 3);
  const showsSamples = items.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-4 md:px-5 md:py-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-14 font-semibold leading-dense md:text-16">
          <Text
            path={
              showsSamples
                ? 'library.home.widget.recent.samples'
                : 'library.home.widget.recent.title'
            }
          />
        </h3>
        <Link to="/library" className="shrink-0 text-12 text-ink-dim hover:text-ink">
          <Text path="library.home.widget.recent.library" />
        </Link>
      </div>
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-hidden p-0">
        {showsSamples
          ? SAMPLE_MATCHES.map((sample) => (
              <li key={sampleKey(sample.id)}>
                <button type="button" onClick={() => actions.onSample(sample)} className={ROW}>
                  <WidgetBadge icon={Play} />
                  <RowText
                    title={
                      <Text
                        path="library.samples.teams"
                        values={{ home: sample.teams[0], away: sample.teams[1] }}
                      />
                    }
                    meta={`${sample.map} · ${sample.event}`}
                  />
                  <span className="numeric shrink-0 text-11 text-ink-dim">
                    <Text
                      path="library.samples.size"
                      values={{ megabytes: megabytesOf(sampleByteLength(sample.id)) }}
                    />
                  </span>
                </button>
              </li>
            ))
          : items.map((item) => (
              <li key={item.kind === 'match' ? item.demo.key : item.tactic.id}>
                <ItemRow item={item} onEnter={actions.onEnter} />
              </li>
            ))}
      </ul>
    </div>
  );
}
