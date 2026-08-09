import { advanceClock, type Clock, createClock, lastFrame, type TickTrack } from '@disa/demo-core';

type Listener = () => void;

export interface Transport {
  readonly clock: Clock;
  play(): void;
  pause(): void;
  toggle(): void;
  setSpeed(speed: number): void;
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

  function play(): void {
    if (clock.isPlaying) return;
    if (clock.frame >= lastFrame(track)) clock.frame = 0;

    clock.isPlaying = true;
    notify(transportListeners);
    notify(frameListeners);
  }

  function pause(): void {
    if (!clock.isPlaying) return;

    clock.isPlaying = false;
    notify(transportListeners);
  }

  return {
    clock,
    play,
    pause,
    toggle: () => (clock.isPlaying ? pause() : play()),

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
