// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: the sampled DOM readout keeps
// related values on one preview frame without putting the preview clock in React state.
import { Text, useT } from '@disa/i18n';
import { getMapOverview, radarAssetPath } from '@disa/map-data';
import { Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSetting } from '@/core/settings';
import { radarColors } from '@/features/radar';
import { WAY_IN_REEL } from '../generated/reel';
import { prefersLessMotion } from '../helpers/less-motion';
import { previewDraw } from '../helpers/preview-draw';
import { decodeReel } from '../helpers/reel';

const RATE = 0.75;
function timestamp(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
}

export function RoundPreview({ suspended }: { suspended: boolean }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLOutputElement>(null);
  const eventRef = useRef<HTMLParagraphElement>(null);
  const ctRef = useRef<HTMLSpanElement>(null);
  const tRef = useRef<HTMLSpanElement>(null);
  const position = useRef(68);
  const repaint = useRef<(() => void) | null>(null);
  const [palette] = useSetting('palette');
  const [theme] = useSetting('radarTheme');
  const [motion] = useSetting('motion');
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(() => prefersLessMotion(motion));
  const reel = useMemo(() => decodeReel(WAY_IN_REEL), []);
  const level = getMapOverview(WAY_IN_REEL.map)?.levels[0];
  const duration = (WAY_IN_REEL.frameCount - 1) / WAY_IN_REEL.hz;
  const active = playing && !suspended && !reduced;
  const note = t('library.preview.note');
  const secondsUnit = t('radar.utility.secondsUnit');

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(prefersLessMotion(motion));
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [motion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const detail = WAY_IN_REEL.detail;
    if (canvas === null || reel === null || detail === undefined) return;
    const context = canvas.getContext('2d');
    if (context === null) return;
    const painter = previewDraw(context, reel, detail, radarColors(palette), secondsUnit);
    const events = detail.kills.map((kill) => ({
      seconds: kill.seconds,
      text: `${kill.attacker === null ? '—' : (reel.players[kill.attacker]?.name ?? '—')} → ${reel.players[kill.victim]?.name ?? '—'} · ${kill.weapon}`,
    }));
    const times = Array.from(
      { length: Math.ceil(duration * 5) + 1 },
      (_, at) => `${timestamp(at / 5)} / ${timestamp(duration)}`,
    );
    let width = 1;
    let ratio = 1;
    let frame = 0;
    let previous = 0;
    let lastRead = -1;
    let disposed = false;
    const draw = () => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      painter.draw(position.current, width);
    };
    const readout = () => {
      const seconds = position.current;
      const at = Math.floor(seconds * 5);
      if (at === lastRead) return;
      lastRead = at;
      if (seekRef.current !== null) seekRef.current.value = String(seconds);
      if (timeRef.current !== null) timeRef.current.textContent = times[at] ?? '';
      let ct = 0;
      let attackers = 0;
      for (let slot = 0; slot < reel.slotCount; slot++) {
        const bit =
          slot * reel.frameCount + Math.min(reel.frameCount - 1, Math.floor(seconds * reel.hz));
        const living =
          ((reel.alive[bit >> 3] ?? 0) & (1 << (bit & 7))) !== 0 &&
          !detail.kills.some((kill) => kill.victim === slot && kill.seconds <= seconds);
        if (living) {
          if (reel.players[slot]?.side === 'CT') ct++;
          else attackers++;
        }
      }
      if (ctRef.current !== null) ctRef.current.textContent = String(ct);
      if (tRef.current !== null) tRef.current.textContent = String(attackers);
      if (eventRef.current !== null)
        eventRef.current.textContent =
          events.findLast((event) => event.seconds <= seconds && seconds - event.seconds < 6)
            ?.text ?? note;
    };
    repaint.current = () => {
      lastRead = -1;
      draw();
      readout();
    };
    const resize = () => {
      width = canvas.getBoundingClientRect().width;
      ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = canvas.width;
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    readout();
    void document.fonts.ready.then(() => {
      if (!disposed) {
        painter.measure();
        draw();
      }
    });
    const tick = (now: number) => {
      if (previous !== 0)
        position.current =
          (position.current + Math.min((now - previous) / 1000, 0.05) * RATE) % duration;
      previous = now;
      draw();
      frame = requestAnimationFrame(tick);
    };
    const follow = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (active && !document.hidden) frame = requestAnimationFrame(tick);
    };
    follow();
    const timer = window.setInterval(() => {
      if (!document.hidden) readout();
    }, 200);
    document.addEventListener('visibilitychange', follow);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearInterval(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', follow);
      repaint.current = null;
    };
  }, [active, duration, note, palette, reel, secondsUnit]);

  if (level === undefined) return null;
  return (
    <section aria-label={t('library.preview.label')}>
      <div className="mb-1 flex flex-wrap justify-between gap-2 text-11 text-ink-dim">
        <span>
          <strong className="font-medium text-ink">Dust2</strong> ·{' '}
          <Text path="library.preview.round" values={{ round: WAY_IN_REEL.round }} />
        </span>
        <span>
          <Text path="library.preview.liveRound" />
        </span>
      </div>
      <div className="relative aspect-square">
        <img
          src={`${import.meta.env.BASE_URL}${radarAssetPath(level, theme)}`}
          alt=""
          className="absolute inset-0 size-full object-contain"
        />
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t('library.preview.label')}
          className="absolute inset-0 size-full"
        />
      </div>
      <div className="mt-2 pt-3 [border-block-start:1px_solid_var(--color-line)]">
        <div className="flex flex-wrap items-center justify-between gap-2 text-11">
          <span className="text-t">
            ● NAVI · T <span ref={tRef} className="font-mono text-ink" />
          </span>
          <span className="text-10 text-ink-dim">IEM ATLANTA 2026</span>
          <span className="text-ct">
            ● Vitality · CT <span ref={ctRef} className="font-mono text-ink" />
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={reduced || suspended}
            onClick={() => setPlaying((value) => !value)}
            aria-label={t(active ? 'library.preview.pause' : 'library.preview.play')}
            className="flex size-8 shrink-0 items-center justify-center rounded-chip border border-line-strong bg-surface-2 text-ink disabled:opacity-50"
          >
            {active ? (
              <Pause aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
          </button>
          <input
            ref={seekRef}
            type="range"
            min={0}
            max={duration}
            step={0.1}
            defaultValue={68}
            aria-label={t('library.preview.seek')}
            onInput={(event) => {
              position.current = event.currentTarget.valueAsNumber;
              repaint.current?.();
            }}
            className="h-1 min-w-0 flex-1 accent-ink"
          />
          <output ref={timeRef} className="shrink-0 font-mono text-11 text-ink-dim" />
        </div>
        <p ref={eventRef} className="mt-3 min-h-8 text-11 text-ink-dim leading-prose">
          {note}
        </p>
      </div>
    </section>
  );
}
