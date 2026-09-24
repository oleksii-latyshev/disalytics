import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import type { RadarTheme } from '@disa/map-data';
import { Button } from '@disa/ui';
import { ArrowUpRight, X } from 'lucide-react';
import type { MotionPreference } from '@/core/settings';
import { prefersLessMotion } from '../helpers/less-motion';
import { megabytesOf, minutesOf } from '../helpers/saved-list';
import { DemoFileName } from './DemoFileName';
import { MapPoster } from './MapPoster';
import { MatchShape } from './MatchShape';
import { MetaDot } from './MetaDot';

interface Props {
  demo: SavedDemo;
  theme: RadarTheme;
  motionPreference: MotionPreference;
  featured?: boolean;
  onOpen: (demo: SavedDemo) => void;
  onRemove: (key: string) => void;
}

function mapTitle(map: string): string {
  const name = map.replace(/^de_/, '').replaceAll('_', ' ');
  return name === 'dust2' ? 'Dust II' : name.charAt(0).toUpperCase() + name.slice(1);
}

export function DemoCard({
  demo,
  theme,
  motionPreference,
  featured = false,
  onOpen,
  onRemove,
}: Props) {
  const t = useT();

  if (featured) {
    return (
      <li className="library-feature group relative list-none overflow-hidden rounded-float border border-line-strong bg-surface-1">
        <button
          type="button"
          onClick={() => onOpen(demo)}
          onPointerMove={(event) => {
            if (event.pointerType !== 'mouse' || prefersLessMotion(motionPreference)) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            event.currentTarget.style.setProperty(
              '--spotlight-x',
              `${event.clientX - bounds.left}px`,
            );
            event.currentTarget.style.setProperty(
              '--spotlight-y',
              `${event.clientY - bounds.top}px`,
            );
          }}
          aria-label={t('library.saved.open', { map: demo.map })}
          className="relative flex min-h-[19rem] w-full flex-col justify-end overflow-hidden p-6 text-left transition-colors duration-(--duration-base) ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus sm:min-h-[22rem] sm:p-9"
        >
          <MapPoster map={demo.map} theme={theme} />
          <span className="pointer-events-none relative z-10 flex max-w-[34rem] flex-col items-start">
            <span className="font-ui text-[clamp(36px,5vw,56px)] font-medium leading-[1.05] tracking-[-0.055em]">
              {mapTitle(demo.map)}
            </span>
            <span className="numeric mt-2 text-28 leading-dense sm:text-44">
              <Text path="library.saved.score" values={{ ...demo.score }} />
            </span>
            <span className="mt-3 flex flex-wrap items-baseline gap-x-2 text-12 text-ink-dim">
              <span className="numeric">
                <Text path="library.saved.rounds" values={{ count: demo.roundCount }} />
              </span>
              {demo.durationSeconds !== undefined && (
                <>
                  <MetaDot />
                  <span className="numeric">
                    <Text
                      path="library.saved.duration"
                      values={{ minutes: minutesOf(demo.durationSeconds) }}
                    />
                  </span>
                </>
              )}
              <MetaDot />
              <span className="numeric">
                <Text path="library.saved.storedAt" values={{ when: new Date(demo.storedAt) }} />
              </span>
              <MetaDot />
              <span className="numeric">
                <Text
                  path="library.saved.size"
                  values={{ megabytes: megabytesOf(demo.byteLength) }}
                />
              </span>
            </span>
            <span className="mt-2 max-w-full">
              <DemoFileName fileName={demo.fileName} />
            </span>
            <span className="mt-6 inline-flex items-center gap-2 rounded-chip bg-ink px-4 py-2.5 text-12 font-medium text-surface-0 transition-[gap] duration-(--duration-micro) ease-out group-hover:gap-3">
              <Text path="library.saved.view" />
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </span>
          </span>
          {demo.winners !== undefined && (
            <span className="pointer-events-none relative z-10 mt-7 block w-full max-w-[23rem] opacity-85">
              <MatchShape winners={demo.winners} />
            </span>
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-20 bg-surface-0/75 text-ink-dim hover:bg-surface-2 hover:text-ink"
          aria-label={t('library.saved.remove', { fileName: demo.fileName })}
          onClick={() => onRemove(demo.key)}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </li>
    );
  }

  return (
    <li className="group relative list-none [border-block-end:1px_solid_var(--color-line)]">
      <button
        type="button"
        onClick={() => onOpen(demo)}
        aria-label={t('library.saved.open', { map: demo.map })}
        className="flex min-h-24 w-full items-center gap-4 py-3 pr-11 text-left transition-[padding,background-color] duration-(--duration-micro) ease-out hover:pl-2 hover:bg-hover focus-visible:rounded-chip focus-visible:outline-2 focus-visible:outline-focus"
      >
        <span className="relative size-16 shrink-0 overflow-hidden rounded-chip border border-line bg-surface-1">
          <MapPoster map={demo.map} theme={theme} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-16 font-medium leading-dense">{mapTitle(demo.map)}</span>
            <span className="numeric text-14 text-ink-dim">
              <Text path="library.saved.score" values={{ ...demo.score }} />
            </span>
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 text-11 text-ink-dim">
            <span className="numeric">
              <Text path="library.saved.rounds" values={{ count: demo.roundCount }} />
            </span>
            {demo.durationSeconds !== undefined && (
              <>
                <MetaDot />
                <span className="numeric">
                  <Text
                    path="library.saved.duration"
                    values={{ minutes: minutesOf(demo.durationSeconds) }}
                  />
                </span>
              </>
            )}
            <MetaDot />
            <span className="numeric">
              <Text path="library.saved.storedAt" values={{ when: new Date(demo.storedAt) }} />
            </span>
          </span>
          <span className="block max-w-full">
            <DemoFileName fileName={demo.fileName} />
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="size-4 shrink-0 text-ink-dim transition-[transform,color] duration-(--duration-micro) ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-1/2 right-0 -translate-y-1/2 text-ink-dim hover:text-ink"
        aria-label={t('library.saved.remove', { fileName: demo.fileName })}
        onClick={() => onRemove(demo.key)}
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </li>
  );
}
