import { type ParsedDemo, roundIndexAtFrame, sideScoreAtFrame } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { type Transport, useFrameReadout } from '@/core/playback';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  isInspectorOpen: boolean;
  onInspectorToggle: () => void;
  isAudibilityShown: boolean;
  onAudibilityToggle: () => void;
  onClose: () => void;
}

function RoundReadout({ demo, frame }: { demo: ParsedDemo; frame: number }) {
  const { rounds } = demo.events;
  const roundIndex = roundIndexAtFrame(demo, frame);
  const round = roundIndex === undefined ? undefined : rounds.at(roundIndex);

  if (round === undefined) {
    return (
      <span className="text-14">
        <Text path="review.warmup" />
      </span>
    );
  }

  return (
    <span className="numeric text-14">
      <Text path="review.roundOfTotal" values={{ current: round.number, total: rounds.length }} />
    </span>
  );
}

/**
 * The round, the map and the score, in 56px — DESIGN.md §5. Nothing else is informational here: the
 * file name moved into the drawer, which is where the rest of this demo's provenance already lives.
 */
export function TopBar({
  demo,
  transport,
  isInspectorOpen,
  onInspectorToggle,
  isAudibilityShown,
  onAudibilityToggle,
  onClose,
}: Props) {
  // Everything here is read as text, so it moves at the 10 Hz readout rather than with the clock —
  // AGENTS.md §8.
  const frame = useFrameReadout(transport);
  const score = sideScoreAtFrame(demo, frame);

  return (
    <header className="flex h-14 items-center gap-6 border-line border-b bg-surface-1 px-4 shadow-raised">
      <RoundReadout demo={demo} frame={frame} />

      <p className="flex items-baseline gap-2">
        <span className="label-dense text-ink-dim">
          <Text path="review.map" />
        </span>
        <span className="text-14">{demo.header.map}</span>
      </p>

      {/* The one place a side pair appears in the chrome, because a score is side data — §5. */}
      <p className="flex items-baseline gap-2">
        <span className="label-dense text-ink-dim">
          <Text path="review.score" />
        </span>
        <span className="font-narrow text-ct">CT</span>
        <span className="numeric text-16">{score.CT}</span>
        <span className="text-14 text-ink-faint">:</span>
        <span className="numeric text-16">{score.T}</span>
        <span className="font-narrow text-t">T</span>
      </p>

      {/* Monochrome, and measured rather than assumed. DESIGN.md §2 permits the accent on a top
          bar's actions, then overrides itself: an accent control the reader can compare against a
          CT token loses. This screen shows four at once — the CT glyph above, the rail markers, the
          plate's own tokens — and `--accent` against `--ct` measures ΔE2000 6.59 with 5.84° of hue
          between them, against ΔE2000 50.17 for the CT/T pair the reader is meant to tell apart. */}
      <div className="ms-auto flex items-center gap-2">
        {/* A toggle rather than a pair of states: the plate under it says which way it is set, and
            the pressed fill is `--selected`, which is §2's "interaction is luminance, not hue". */}
        <Button
          type="button"
          variant="outline"
          aria-pressed={isAudibilityShown}
          onClick={onAudibilityToggle}
          className="aria-pressed:bg-selected"
        >
          <Text path={isAudibilityShown ? 'radar.audibility.hide' : 'radar.audibility.show'} />
        </Button>

        <Button
          type="button"
          variant="outline"
          aria-expanded={isInspectorOpen}
          onClick={onInspectorToggle}
        >
          <Text path={isInspectorOpen ? 'inspector.close' : 'inspector.open'} />
        </Button>

        <Button type="button" variant="outline" onClick={onClose}>
          <Text path="review.close" />
        </Button>
      </div>
    </header>
  );
}
