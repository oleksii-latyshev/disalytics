/**
 * How many marks the field can carry at once, and they are two numbers because they are two
 * questions. Players are the reel's own `slotCount`. **Ten utility is a measurement**: the round
 * the reel holds peaks at nine live marks, and `reel:generate` fails rather than dropping one, so a
 * future reel that needs more says so at build time instead of losing marks on screen.
 *
 * They are their own module because they have three readers in two runtimes: the shader compiles
 * the bound into a GLSL loop, `sampleReel` fills the array up to it, and `reel:generate` refuses a
 * round that would need more. The generator runs in Bun with no DOM, which is why this cannot sit
 * beside `pixelColours` and its `getComputedStyle`.
 */
export const PLAYER_AGENTS = 10;
export const UTILITY_AGENTS = 10;
export const AGENT_COUNT = PLAYER_AGENTS + UTILITY_AGENTS;

/** Floats per agent in the uniform: x, y, strength, radius. */
export const AGENT_STRIDE = 4;
