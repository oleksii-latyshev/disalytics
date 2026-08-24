import {
  advanceClock,
  type Clock,
  createClock,
  type Frame,
  lastFrame,
  type TickTrack,
} from '@disa/demo-core';

type Listener = () => void;

/**
 * Where playback should stand instead of the position it just advanced to, or `null` to keep it.
 * Consulted once per animation frame, so it must not allocate.
 */
export type FrameSkip = (frame: number) => Frame | null;

export interface Transport {
  readonly clock: Clock;
  play(): void;
  /**
   * Plays on from where the clock stands, without the rewind `play()` does at the end of the match.
   * Resuming out of a scrub has to keep the position the scrub just chose.
   */
  resume(): void;
  pause(): void;
  toggle(): void;
  setSpeed(speed: number): void;
  /**
   * A held arrow key — DESIGN.md §9.1. The clock runs at `rate` — signed by the direction the
   * reader is holding — until `releaseScrub` puts back the speed and the play state the hold
   * interrupted. It is not `setSpeed`: a rate nobody chose must not appear on the speed control as
   * one that was (§7.2).
   */
  holdScrub(rate: number): void;
  releaseScrub(): void;
  /** Moves the clock to a position, clamped into the track. Repaints; does not change play state. */
  seek(frame: number): void;
  /** Moves by whole samples from the sample the clock stands on, and stops playback. */
  step(samples: number): void;
  /**
   * A rule playback obeys and a seek does not — DESIGN.md §10.5's skip-the-buy-phase row is the
   * only caller. It is deliberately not applied in `seek`: scrubbing into what the rule skips has
   * to land there, or the reader is locked out of part of the match.
   */
  setFrameSkip(skip: FrameSkip | null): void;
  /** Moves the clock on by real time elapsed. The rAF loop calls this and nothing else does. */
  advance(elapsedMs: number): void;
  /** Once per animation frame. A sink draws; it never writes React state. */
  subscribeToFrames(listener: Listener): () => void;
  /** Play, pause and speed — never the frame. This is the part React is allowed to render from. */
  subscribeToTransport(listener: Listener): () => void;
}

// perf: called once per animation frame, so it walks an array by index — a `Set` or a `for…of`
// allocates an iterator each time round.
function notify(listeners: readonly Listener[]): void {
  for (let index = 0; index < listeners.length; index++) {
    const listener = listeners[index];
    if (listener !== undefined) listener();
  }
}

function subscribeTo(listeners: Listener[], listener: Listener): () => void {
  listeners.push(listener);

  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

export function createTransport(track: TickTrack, startFrame: number): Transport {
  const clock = createClock(startFrame);
  const frameListeners: Listener[] = [];
  const transportListeners: Listener[] = [];
  let frameSkip: FrameSkip | null = null;
  let playStateBeforeScrub: boolean | null = null;

  function resume(): void {
    if (clock.isPlaying) return;

    clock.isPlaying = true;
    notify(transportListeners);
    notify(frameListeners);
  }

  function play(): void {
    if (clock.isPlaying) return;
    if (clock.frame >= lastFrame(track)) clock.frame = 0;

    resume();
  }

  function pause(): void {
    // A hold interrupted by anything other than its own key release ends here instead of being
    // restored later: `releaseScrub` puts back a play state, and a pause is the newer answer to it.
    clock.scrub = null;
    playStateBeforeScrub = null;

    if (!clock.isPlaying) return;

    clock.isPlaying = false;
    notify(transportListeners);
  }

  function seek(frame: number): void {
    const end = lastFrame(track);

    clock.frame = frame < 0 ? 0 : frame > end ? end : frame;
    notify(frameListeners);
  }

  return {
    clock,
    play,
    resume,
    pause,
    seek,
    toggle: () => (clock.isPlaying ? pause() : play()),

    holdScrub(rate) {
      if (playStateBeforeScrub === null) playStateBeforeScrub = clock.isPlaying;

      clock.scrub = rate;
      clock.isPlaying = true;
      notify(transportListeners);
    },

    releaseScrub() {
      if (playStateBeforeScrub === null) return;

      clock.scrub = null;
      clock.isPlaying = playStateBeforeScrub;
      playStateBeforeScrub = null;
      notify(transportListeners);
      notify(frameListeners);
    },

    step(samples) {
      pause();
      seek(Math.round(clock.frame) + samples);
    },

    setFrameSkip(skip) {
      frameSkip = skip;
    },

    setSpeed(speed) {
      if (clock.speed === speed) return;

      clock.speed = speed;
      notify(transportListeners);
    },

    advance(elapsedMs) {
      const wasPlaying = clock.isPlaying;

      advanceClock(clock, track, elapsedMs);

      // A held arrow is the reader scrubbing by hand, so the buy-phase rule stands aside for it for
      // the reason it stands aside for `seek`: rewinding into a phase the rule skips has to land
      // there rather than be pushed back out of it once per animation frame.
      if (frameSkip !== null && clock.scrub === null) {
        const skipped = frameSkip(clock.frame);
        if (skipped !== null) clock.frame = skipped;
      }

      notify(frameListeners);

      if (clock.isPlaying !== wasPlaying) notify(transportListeners);
    },

    subscribeToFrames: (listener) => subscribeTo(frameListeners, listener),
    subscribeToTransport: (listener) => subscribeTo(transportListeners, listener),
  };
}
