import { mainSteps } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useSetting } from '@/core/settings';
import { mapTitle } from '../../helpers/map-title';
import { MapPoster } from '../MapPoster';
import type { WidgetProps } from './types';

const ACTION =
  'mt-1 inline-flex w-fit items-center gap-1.5 text-13 font-medium text-ink hover:text-ink-dim focus-visible:outline-2 focus-visible:outline-focus';

export function TacticsWidget({ data }: WidgetProps) {
  const [theme] = useSetting('radarTheme');
  const tactic = data.tactics[0];

  return (
    <>
      <MapPoster map={tactic?.map ?? 'de_mirage'} theme={theme} />
      <div className="relative flex h-full flex-col justify-end gap-1.5 p-4 md:px-5 md:py-[18px]">
        <p className="label-dense text-ink-dim">
          <Text
            path={
              tactic === undefined
                ? 'library.home.widget.tactics.eyebrowEmpty'
                : 'library.home.widget.tactics.eyebrow'
            }
          />
        </p>
        {tactic === undefined ? (
          <>
            <p className="text-16 font-semibold leading-dense">
              <Text path="library.home.widget.tactics.emptyTitle" />
            </p>
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.home.widget.tactics.emptyHint" />
            </p>
            <Link to="/tactics" className={ACTION}>
              <Text path="library.home.widget.tactics.draw" />
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        ) : (
          <>
            <p className="truncate text-16 font-semibold leading-dense">{tactic.title}</p>
            <p className="truncate text-12 text-ink-dim">
              <Text
                path="library.home.widget.tactics.meta"
                values={{
                  map: mapTitle(tactic.map),
                  side: tactic.side,
                  count: mainSteps(tactic).length,
                }}
              />
            </p>
            <Link to="/tactics" className={ACTION}>
              <Text path="library.home.widget.tactics.open" />
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        )}
      </div>
    </>
  );
}
