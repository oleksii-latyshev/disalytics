import { Text } from '@disa/i18n';
import { ArrowRight } from 'lucide-react';
import { useSetting } from '@/core/settings';
import { mapTitle } from '../../helpers/map-title';
import { MapPoster } from '../MapPoster';
import type { WidgetProps } from './types';

export function CoachWidget({ data, actions }: WidgetProps) {
  const [theme] = useSetting('radarTheme');
  const { last, notes } = data;
  const note = notes.at(0);

  return (
    <>
      <MapPoster map={last?.map ?? 'de_mirage'} theme={theme} />
      <div className="relative flex h-full flex-col justify-end gap-1.5 p-4 md:px-5 md:py-[18px]">
        <p className="label-dense text-ink-dim">
          <Text path="library.home.widget.coach.eyebrow" />
        </p>
        {last !== null && note !== undefined ? (
          <>
            <p className="text-16 font-semibold leading-dense">
              <Text
                path="library.home.widget.coach.round"
                values={{ round: note.roundIndex + 1 }}
              />
            </p>
            <p className="truncate text-12 text-ink-dim">
              <Text path="library.home.widget.coach.meta" values={{ map: mapTitle(last.map) }} />
            </p>
            <button
              type="button"
              onClick={() => actions.onEnter(last, note.roundIndex)}
              className="mt-1 inline-flex w-fit items-center gap-1.5 text-13 font-medium text-ink hover:text-ink-dim focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Text path="library.home.widget.coach.open" />
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </>
        ) : (
          <>
            <p className="text-16 font-semibold leading-dense">
              <Text path="library.home.widget.coach.emptyTitle" />
            </p>
            <p className="text-12 text-ink-dim leading-prose">
              <Text path="library.home.widget.coach.emptyHint" />
            </p>
          </>
        )}
      </div>
    </>
  );
}
