import { AGENT_COUNT } from './agents';

/**
 * The way in's ground: the product's own map, taken apart into pixels.
 *
 * **The colours are read out of the stylesheet** rather than written here, the way `radarColors`
 * reads the plate's: a token is the one place a colour is decided, and a literal in a shader is a
 * second one that nothing would ever check.
 */
export interface PixelColours {
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

export function pixelColours(element: Element): PixelColours {
  const style = getComputedStyle(element);
  const token = (name: string) => channels(style.getPropertyValue(name));

  return {
    ground: token('--color-surface-0'),
    first: token('--color-pixel-1'),
    second: token('--color-pixel-2'),
  };
}

/**
 * How much of the map is on screen. This is `object-fit: contain` rather than `cover`, done where
 * the sampling happens: a crop of Dust2 is a field of squares, and the whole of it is a map somebody
 * can name — which is the only reason to draw a map at all rather than a texture.
 */
export function coverOf(width: number, height: number): readonly [number, number] {
  const aspect = width / Math.max(height, 1);

  return aspect >= 1 ? [aspect, 1] : [1, 1 / aspect];
}

/**
 * The grid, in CSS pixels. Around 144 cells across a 1440px viewport — enough to read a map.
 *
 * It is here rather than in the component because **the way in has one grid**: the field draws the
 * map in it and the card's watcher draws a player in it, and two screens' worth of squares at two
 * pitches would be two languages on one page.
 */
export const CELL_PX = 10;

/**
 * Half a lit cell's side, in cell units, at full strength. The shader scales it by the wave — a cell
 * exists where there is something under it and its *size* says how much — and anything else drawn in
 * this grid scales it the same way, which is what makes the two look like one material.
 */
export const CELL_EXTENT = 0.44;

export const PIXEL_VERTEX = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

/**
 * One square per cell of a fixed grid, lit by what the map has at that cell, by a wave crossing the
 * grid, and by the round the reel is playing over it.
 *
 * Four things are deliberate. **The map is sampled once per cell, at the cell's own centre**, so
 * this is a picture of the map at the grid's resolution rather than a picture of the map with a
 * grid over it — the difference is whether a wall stays one block wide when it is a pixel wide.
 * **A lit cell is a square with a gap around it**, because the gap is what makes the grid readable
 * as pixels rather than as a smeared image. **The wave decides size, not colour**: a cell grows
 * and shrinks where the wave passes, which reads as the map breathing, where a hue that changed
 * would read as data. And **an agent is more of the same wave rather than a mark of its own** — a
 * player and a grenade raise the energy of the cells they stand on, so they arrive as the map
 * brightening under them and stay inside the two pixel tokens. Lending them `--color-ct` or a
 * grenade's own colour would put a reading on the one screen in the product that has no data on it.
 *
 * **The mark takes the cell rather than adding to it** — `max` and not a sum — and that is what makes
 * a player readable wherever the wave happens to be. Added, a mark in a crest had a quarter of the
 * range left to say anything with and vanished into it; taken, a cell under a mark is always at the
 * ceiling while the wave alone can only reach 1.0, so the difference between the two is the same
 * everywhere on the field.
 *
 * The ceiling is what keeps the grid a grid: at `1.25` a lit cell is 0.485 of its box against the
 * 0.5 where neighbours meet, so the brightest thing the field can draw still has a hairline around
 * it rather than smearing into a blob.
 */
export const PIXEL_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uCell;
  uniform vec2 uResolution;
  uniform vec2 uCover;
  uniform vec3 uGround;
  uniform vec3 uFirst;
  uniform vec3 uSecond;
  // xy is the position in the map's own uv, z how much of the mark is on screen, w its radius in
  // the same uv. A zero z is an empty slot, which is most of them for most of the round.
  uniform vec4 uAgents[${AGENT_COUNT}];

  varying vec2 vUv;

  void main() {
    vec2 cell = floor(gl_FragCoord.xy / uCell);
    vec2 centre = (cell + 0.5) * uCell / uResolution;
    vec2 mapUv = (centre - 0.5) * uCover + 0.5;

    vec4 sampled = texture2D(uMap, mapUv);
    // Two facts, and both are needed. **Alpha says whether the map is there at all** — a radar asset
    // is transparent outside its own outline — and **the brightest channel says whether this is
    // structure or the plate's own ground**, which the blue theme puts around 0.15 against 0.30 for
    // a wall. A luminance would read that theme as almost nothing, and brightness without the floor
    // draws a square under every cell of the ground: an even field of dots with a map hidden in it.
    float brightest = max(max(sampled.r, sampled.g), sampled.b);
    // Two levels rather than one: the plate's own ground is a dim cell and its structure is a bright
    // one, which is what makes the shape a map instead of a scatter. The blue theme puts the ground
    // near 0.15 and a wall near 0.30, and a luminance would read both as almost nothing.
    float ink = sampled.a * (0.45 + 0.55 * smoothstep(0.16, 0.34, brightest));

    float wave =
      sin(cell.x * 0.055 + uTime * 0.55) +
      sin(cell.y * 0.075 - uTime * 0.38) +
      sin((cell.x + cell.y) * 0.035 + uTime * 0.7);
    float pulse = clamp(0.5 + wave / 4.5, 0.0, 1.0);

    float glow = 0.0;
    for (int index = 0; index < ${AGENT_COUNT}; index++) {
      vec4 agent = uAgents[index];
      if (agent.z <= 0.0) continue;

      glow += agent.z * (1.0 - smoothstep(0.0, agent.w, distance(mapUv, agent.xy)));
    }
    glow = clamp(glow, 0.0, 1.0);

    // A mark carries its own presence: a player crossing the plate's dim ground has to read, and
    // that ground alone lights a cell barely at all. It is still bounded by the map, so the field
    // outside the outline stays the app's own surface however close a mark passes to the rim.
    ink = max(ink, glow);

    // Outside the map is the ground: the texture clamps at its edge, and a clamped edge repeated
    // sideways would draw a stripe of the map's rim across the rest of the screen.
    vec2 inside = step(vec2(0.0), mapUv) * step(mapUv, vec2(1.0));
    ink *= inside.x * inside.y;

    // The wave was the whole of the movement before there was a round to play; it is texture now,
    // and its swing is compressed to about half so the thing that moves on purpose is the loudest
    // thing on the field. It is not compressed further than this: taken to a third, the map stopped
    // changing any 8-bit pixel between two frames a second apart, which is a still image rather than
    // a quiet one. A mark still takes the cell outright, so a player is the biggest square on screen
    // wherever the wave happens to be.
    float breath = 0.20 + 0.50 * pulse;
    float energy = max(breath, glow * 1.25);

    vec2 inCell = fract(gl_FragCoord.xy / uCell) - 0.5;
    float extent = max(abs(inCell.x), abs(inCell.y));
    // Presence is the map's and size is the wave's: a cell exists where there is map under it, and
    // how big it is says where the wave — and whoever is standing on it — has got to.
    float size = ${CELL_EXTENT} * (0.55 + 0.45 * energy);
    float square = 1.0 - smoothstep(size - 0.08, size, extent);

    vec3 tint = mix(uFirst, uSecond, clamp(0.15 + 0.85 * min(energy, 1.0), 0.0, 1.0));
    vec3 colour = uGround + tint * square * ink * (0.95 + 0.50 * pulse + 0.95 * glow);

    gl_FragColor = vec4(colour, 1.0);
  }
`;
