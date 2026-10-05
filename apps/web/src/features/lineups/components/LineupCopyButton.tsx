import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Check, Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

const COPIED_MS = 2000;

interface Props {
  text: string;
  /** What the button says before it is pressed. */
  children?: ReactNode;
}

/**
 * The only thing that writes to the clipboard on this screen, and only when it is pressed — a row
 * or a marker that is merely picked never does.
 */
export function LineupCopyButton({ text, children }: Props) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const isCopied = copiedText === text;

  useEffect(() => {
    if (copiedText === null) return;
    const timer = setTimeout(() => setCopiedText(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copiedText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
    } catch {
      setCopiedText(null);
    }
  };

  return (
    <Button
      variant="secondary"
      onClick={() => void handleCopy()}
      className="h-7 shrink-0 px-2 text-11"
    >
      {isCopied ? (
        <>
          <Check aria-hidden="true" className="size-3 text-ct" />
          <Text path="library.lineups.copied" />
        </>
      ) : (
        <>
          <Copy aria-hidden="true" className="size-3" />
          {children ?? <Text path="library.lineups.copy" />}
        </>
      )}
    </Button>
  );
}
