import { useT } from '@disa/i18n';
import { CircleQuestionMark, Settings } from 'lucide-react';
import { DOCK_SECTIONS, type ShellView } from '../helpers/views';
import { useDockMagnify } from '../hooks/use-dock-magnify';
import { DockEntry } from './DockEntry';

interface Props {
  view: ShellView;
  onView: (view: ShellView) => void;
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
}

export function ShellDock({ view, onView, onSettingsOpen, onHelpOpen }: Props) {
  const t = useT();
  const panelRef = useDockMagnify();

  return (
    // The band takes no pointer events, so the field and the content under it stay reachable
    // everywhere the panel itself is not.
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3">
      <div ref={panelRef} className="atlas-dock pointer-events-auto flex items-end">
        <nav aria-label={t('library.shell.nav')}>
          <ul className="flex list-none items-end atlas-dock-group p-0">
            {DOCK_SECTIONS.map((section) => (
              <li key={section.view}>
                <DockEntry
                  icon={section.icon}
                  labelPath={section.labelPath}
                  isCurrent={section.view === view}
                  isSoon={section.isSoon}
                  tone={section.tone}
                  onSelect={() => onView(section.view)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* The same two sheets settings and help own, so the way in keeps no copy of either. */}
        <div className="atlas-dock-group flex items-end">
          <DockEntry
            icon={Settings}
            labelPath="common.settings"
            tone="linear-gradient(160deg, #8a919e, #505966)"
            onSelect={onSettingsOpen}
          />

          <DockEntry
            icon={CircleQuestionMark}
            labelPath="common.help"
            tone="linear-gradient(160deg, #54b9d5, #217c9c)"
            onSelect={onHelpOpen}
          />
        </div>
      </div>
    </div>
  );
}
