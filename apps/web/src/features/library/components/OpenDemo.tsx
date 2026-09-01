import { Text } from '@disa/i18n';
import { matchHistoryFolder } from '../helpers/match-history';
import { ChooseDemo } from './ChooseDemo';

interface Props {
  onFile: (file: File) => void;
  isDraggedOver: boolean;
}

interface HintProps {
  folder: string | null;
  isDraggedOver: boolean;
}

/**
 * The invitation, with the folder the reader's own demos are recorded into. The path is game
 * vocabulary — one string in both locales, rendered as vocabulary rather than through `<Text>` —
 * and it is interpolated into a whole sentence rather than appended to a translated prefix, which
 * is grammatically impossible in Russian (`AGENTS.md` §11).
 *
 * It wraps rather than truncating: the Windows path is the longest and it does not fit the card on
 * one line at any width the card has, and a path with its middle elided names nothing.
 */
function Hint({ folder, isDraggedOver }: HintProps) {
  if (isDraggedOver) return <Text path="library.open.release" />;
  if (folder === null) return <Text path="library.open.hint" />;

  return (
    <Text
      path="library.open.hintFolder"
      values={{ folder: <code className="wrap-anywhere text-ink">{folder}</code> }}
    />
  );
}

/**
 * **The card leads with the action.** The heading, the hint and the button used to stack in that
 * order, which reads as a paragraph with a control at the end of it; the reader came here to open a
 * demo, and the one white control on the screen is what they are looking for. It is first, and what
 * follows it explains it rather than introducing it.
 */
export function OpenDemo({ onFile, isDraggedOver }: Props) {
  // Read where it is used rather than passed down: it is a constant of the device, not state, and
  // the card is the only thing on the screen that says it.
  const folder = matchHistoryFolder({
    platform: navigator.userAgentData?.platform,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  });

  return (
    <div className="flex flex-col items-start gap-4">
      <h2 className="font-ui font-medium text-28 leading-dense">
        <Text path="library.open.title" />
      </h2>

      <ChooseDemo onFile={onFile} />

      <p className="text-13 text-ink-dim leading-prose">
        <Hint folder={folder} isDraggedOver={isDraggedOver} />
      </p>
    </div>
  );
}
