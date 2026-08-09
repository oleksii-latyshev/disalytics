import { advanceClock, type Clock, createClock, lastFrame, type TickTrack } from '@disa/demo-core';

type Listener = () => void;

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
  /** Moves the clock to a position, clamped into the track. Repaints; does not change play state. */
  seek(frame: number): void;
  /** Moves by whole samples from the sample the clock stands on, and stops playback. */
  step(samples: number): void;
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

    step(samples) {
      pause();
      seek(Math.round(clock.frame) + samples);
    },

    setSpeed(speed) {
      if (clock.speed === speed) return;

      clock.speed = speed;
      notify(transportListeners);
    },

    advance(elapsedMs) {
      const wasPlaying = clock.isPlaying;

      advanceClock(clock, track, elapsedMs);
      notify(frameListeners);

      if (clock.isPlaying !== wasPlaying) notify(transportListeners);
    },

    subscribeToFrames: (listener) => subscribeTo(frameListeners, listener),
    subscribeToTransport: (listener) => subscribeTo(transportListeners, listener),
  };
}
