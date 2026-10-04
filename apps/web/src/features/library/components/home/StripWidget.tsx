import { Text } from '@disa/i18n';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { type WidgetId, widgetSpec } from '../../helpers/home-widgets';
import type { HomeData } from '../../hooks/use-home-data';
import { useShellActions } from '../../hooks/use-shell-actions';
import { WidgetBadge } from './WidgetBadge';

const STRIP =
  'relative flex h-full p-4 md:px-5 md:py-[18px] min-w-0 flex-col items-start justify-center gap-2 text-left md:flex-row md:items-center md:gap-3.5';

function StripBody({ id, children }: { id: WidgetId; children?: ReactNode }) {
  const spec = widgetSpec(id);

  return (
    <>
      <WidgetBadge icon={spec.icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`text-14 font-semibold leading-dense md:text-16 ${spec.isSoon ? 'text-ink-dim' : 'text-ink'}`}
        >
          <Text path={spec.titlePath} />
        </span>
        <span className="hidden text-12 text-ink-dim leading-prose md:line-clamp-2">
          {children ?? <Text path={spec.blurbPath} />}
        </span>
      </span>
      {!spec.isSoon && (
        <ArrowRight aria-hidden="true" className="hidden size-4 shrink-0 text-ink-dim md:block" />
      )}
    </>
  );
}

/** One line: a glyph, a name, a sentence, and where it leads. */
export function StripWidget({ id, data }: { id: WidgetId; data: HomeData }) {
  const { openHelp } = useShellActions();

  switch (id) {
    case 'soon':
      return (
        <Link
          to="/stats"
          className={`${STRIP} focus-visible:outline-2 focus-visible:outline-focus`}
        >
          <StripBody id={id} />
        </Link>
      );
    case 'economy':
    case 'refs':
      return (
        <Link
          to="/tools"
          className={`${STRIP} focus-visible:outline-2 focus-visible:outline-focus`}
        >
          <StripBody id={id} />
        </Link>
      );
    case 'keys':
      return (
        <button
          type="button"
          onClick={openHelp}
          className={`${STRIP} focus-visible:outline-2 focus-visible:outline-focus`}
        >
          <StripBody id={id} />
        </button>
      );
    case 'storage':
      return (
        <Link
          to="/library"
          className={`${STRIP} focus-visible:outline-2 focus-visible:outline-focus`}
        >
          <StripBody id={id}>
            <Text
              path="library.home.widget.storage.status"
              values={{ count: data.demos?.length ?? 0 }}
            />
          </StripBody>
        </Link>
      );
    default:
      return (
        <div className={STRIP}>
          <StripBody id={id} />
        </div>
      );
  }
}
