/**
 * The way in's background: three soft bands drifting across the ground, in the two colours the token
 * layer gives this screen and nothing else.
 *
 * **The colours are read out of the stylesheet rather than written here**, the way `radarColors`
 * reads the plate's: a token is the one place a colour is decided, and a literal in a shader is a
 * second one that nothing would ever check.
 */
export interface WaveColours {
  ground: readonly [number, number, number];
  first: readonly [number, number, number];
  second: readonly [number, number, number];
}

const HEX = /^#([0-9a-f]{6})$/i;

/** `#rrggbb` to the 0–1 triple a uniform takes. Anything else is black, which is the ground. */
function channels(value: string): readonly [number, number, number] {
  const digits = HEX.exec(value.trim())?.at(1);
  if (digits === undefined) return [0, 0, 0];

  const packed = Number.parseInt(digits, 16);

  return [((packed >> 16) & 255) / 255, ((packed >> 8) & 255) / 255, (packed & 255) / 255];
}

export function waveColours(element: Element): WaveColours {
  const style = getComputedStyle(element);
  const token = (name: string) => channels(style.getPropertyValue(name));

  return {
    ground: token('--color-surface-0'),
    first: token('--color-wave-1'),
    second: token('--color-wave-2'),
  };
}

export const WAVE_VERTEX = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

/**
 * Three bands, each a sine of the horizontal position whose phase moves with time, lit where the
 * fragment is near the band's own centre.
 *
 * Two details are load-bearing rather than decorative. **The bands are shaped in an aspect-corrected
 * space**, so a wave has the same wavelength on a phone and on a monitor instead of being stretched
 * flat by a wide viewport. And **the result is dithered by a quantum of one 8-bit step**: a gradient
 * this dark and this wide bands visibly on an ordinary panel, and a pixel of noise under the last
 * bit is what a shipped gradient needs and a screenshot of one never shows.
 */
export const WAVE_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;
  uniform vec3 uGround;
  uniform vec3 uFirst;
  uniform vec3 uSecond;

  varying vec2 vUv;

  float hash(vec2 seed) {
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float bandAt(vec2 uv, float index) {
    float drift = uTime * (0.05 + index * 0.017);
    float wave =
      sin(uv.x * (1.1 + index * 0.45) + drift + index * 2.4) * (0.13 + index * 0.03) +
      sin(uv.x * (2.3 - index * 0.35) - drift * 0.7 + index) * 0.06;

    return 0.5 + wave + (index - 1.0) * 0.16;
  }

  void main() {
    vec2 uv = vec2(vUv.x * uAspect, vUv.y);
    vec3 colour = uGround;

    for (float index = 0.0; index < 3.0; index += 1.0) {
      float distance = abs(vUv.y - bandAt(uv, index));
      float glow = smoothstep(0.44, 0.0, distance);
      float mixed = 0.2 + index * 0.3 + 0.15 * sin(uTime * 0.08 + index * 1.7);

      colour += mix(uFirst, uSecond, clamp(mixed, 0.0, 1.0)) * glow * glow * 0.62;
    }

    colour += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

    gl_FragColor = vec4(colour, 1.0);
  }
`;
