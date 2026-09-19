import type { PlayerInfo, PlayerSlot, Team, ThrowDetail } from '@disa/demo-core';
import { UTILITY_NAMES, utilityKindOfGrenade } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { BookmarkPlus, Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { type LineupFormData, LineupFormModal } from '@/features/lineups';

interface Props {
  detail: ThrowDetail | undefined;
  players: readonly PlayerInfo[];
  map?: string;
}

const SIDE_INK: Readonly<Record<Team, string>> = { CT: 'text-ct', T: 'text-t' };

/**
 * The lineup and movement details of the grenade throw under the pointer or focus — #388.
 *
 * Displays the CS2 console command (`setpos ...; setang ...`) along with throw classification
 * (stand, run, jump, crouch) and movement keys pressed during the 2-second run-up window.
 *
 * **Its height is held whether or not a throw is chosen**, preventing the list above it from jittering.
 */
export function ThrowCard({ detail, players, map }: Props) {
  const t = useT();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const isCopied = copiedCommand !== null && copiedCommand === detail?.command;

  useEffect(() => {
    if (copiedCommand === null) return;
    const timer = setTimeout(() => setCopiedCommand(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedCommand]);

  const handleCopy = async () => {
    if (detail === undefined) return;
    try {
      await navigator.clipboard.writeText(detail.command);
      setCopiedCommand(detail.command);
    } catch {
      // Clipboard write may fail if permissions are denied or non-secure context
    }
  };

  const nameOf = useCallback(
    (slot: PlayerSlot) =>
      players.find((player) => player.slot === slot)?.name ?? t('review.feed.unknownPlayer'),
    [players, t],
  );

  const initialData: LineupFormData | undefined = useMemo(() => {
    if (detail === undefined) return undefined;
    const utility = utilityKindOfGrenade(detail.grenadeType);
    const throwerName = nameOf(detail.thrower);
    return {
      title: `${throwerName} ${UTILITY_NAMES[utility]} (R${detail.roundIndex + 1})`,
      map: map ?? 'de_mirage',
      side: detail.throwerSide ?? 'BOTH',
      kind: utility,
      origin: detail.playerPos,
      landing: detail.landing,
      pitch: detail.pitch,
      yaw: detail.yaw,
      throwType: detail.throwType,
      movementKeys: detail.movementKeys,
      command: detail.command,
    };
  }, [detail, map, nameOf]);

  const handleSaved = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="flex h-[9.5rem] flex-col gap-1.5 overflow-hidden rounded-card bg-surface-2 p-2.5 text-13">
      {detail === undefined ? (
        <p className="text-ink-dim leading-prose">
          <Text path="review.maps.throw.empty" />
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 text-12">
              <span className="numeric shrink-0 text-ink-dim">
                <Text path="review.maps.roundShort" values={{ round: detail.roundIndex + 1 }} />
              </span>
              <span
                className={`min-w-0 truncate font-medium ${
                  detail.throwerSide === undefined ? 'text-ink' : SIDE_INK[detail.throwerSide]
                }`}
              >
                {nameOf(detail.thrower)}
              </span>
              {(() => {
                const utility = utilityKindOfGrenade(detail.grenadeType);
                return (
                  <span className="flex shrink-0 items-center gap-1 text-ink-dim">
                    <UtilityGlyph kind={utility} label={UTILITY_NAMES[utility]} size="control" />
                    <span className="truncate">{UTILITY_NAMES[utility]}</span>
                  </span>
                );
              })()}
            </div>

            <span className="shrink-0 rounded-chip border border-line bg-surface-3 px-1.5 py-0.5 text-11 text-ink">
              <Text path={`review.maps.throw.types.${detail.throwType}`} />
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-12">
            <span className="label-dense text-ink-dim">
              <Text path="review.maps.throw.movement" />
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {detail.movementKeys.map((key) => (
                <kbd
                  key={key}
                  className="rounded-chip border border-line bg-surface-3 px-1.5 py-0.5 font-mono text-11 text-ink"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-chip border border-line bg-surface-1 px-2 py-1">
            <code
              className="min-w-0 flex-1 select-all truncate font-mono text-11 text-ink"
              title={detail.command}
            >
              {detail.command}
            </code>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6 shrink-0 text-ink-dim hover:text-ink"
              onClick={handleCopy}
              aria-label={t(
                isCopied ? 'review.maps.throw.copied' : 'review.maps.throw.copyCommand',
              )}
              title={t(isCopied ? 'review.maps.throw.copied' : 'review.maps.throw.copyCommand')}
            >
              {isCopied ? <Check className="size-3.5 text-ink" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 text-12 text-ink-dim">
            <span className="truncate">
              <Text
                path="review.maps.throw.landing"
                values={{ x: Math.round(detail.landing.x), y: Math.round(detail.landing.y) }}
              />
            </span>
            {savedNotice ? (
              <span className="flex shrink-0 items-center gap-1 font-medium text-11 text-ink">
                <Check className="size-3" />
                <Text path="review.maps.throw.saved" />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-11 text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <BookmarkPlus className="size-3" />
                <Text path="review.maps.throw.saveLineup" />
              </button>
            )}
          </div>

          {isModalOpen && (
            <LineupFormModal
              isOpen={isModalOpen}
              onDismiss={() => setIsModalOpen(false)}
              initialData={initialData}
              defaultMap={map ?? 'de_mirage'}
              onSaved={handleSaved}
            />
          )}
        </>
      )}
    </div>
  );
}
