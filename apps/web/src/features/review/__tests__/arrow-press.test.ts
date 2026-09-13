import { describe, expect, it } from 'vitest';
import { createArrowPress } from '../helpers/arrow-press';

function record() {
  const calls: string[] = [];
  const press = createArrowPress({
    seek: (direction) => calls.push(`seek ${direction}`),
    hold: (direction) => calls.push(`hold ${direction}`),
    release: () => calls.push('release'),
  });

  return { calls, press };
}

describe('createArrowPress', () => {
  it('seeks once on a tap, and only when the key comes up', () => {
    const { calls, press } = record();

    press.press(1, false);
    expect(calls).toEqual([]);

    press.release(1);
    expect(calls).toEqual(['seek 1', 'release']);
  });

  it('never seeks on a hold', () => {
    const { calls, press } = record();

    press.press(-1, false);
    press.press(-1, true);
    press.press(-1, true);
    press.release(-1);

    expect(calls).toEqual(['hold -1', 'hold -1', 'release']);
  });

  it('keeps the two directions apart', () => {
    const { calls, press } = record();

    press.press(-1, false);
    press.press(1, false);
    press.press(1, true);
    press.release(1);
    press.release(-1);

    expect(calls).toEqual(['hold 1', 'release', 'seek -1', 'release']);
  });

  it('does not seek twice for one tap', () => {
    const { calls, press } = record();

    press.press(1, false);
    press.release(1);
    press.release(1);

    expect(calls).toEqual(['seek 1', 'release', 'release']);
  });
});
