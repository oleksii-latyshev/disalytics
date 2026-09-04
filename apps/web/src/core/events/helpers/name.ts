import type { Translate } from '@disa/i18n';
import type { KillRow, NameOfSlot } from './row';

/**
 * A kill's whole accessible name — who, whom, with what, and the marks that qualify it.
 *
 * **It lives here because two surfaces name the same kill** (#214). §5.4's feed draws the row and
 * §7.1's axis draws a glyph for it, and both were building a sentence of their own: the feed's
 * carried the weapon and the three marks, the axis's carried neither. Below `--breakpoint-split` the
 * feed is not drawn at all, so at those widths the weapon and the marks were on a tooltip and
 * nowhere else — and a tooltip is not a reading a keyboard or a screen reader can reach.
 *
 * The marks are appended as their own sentences rather than interpolated, which is the shape the
 * feed already had: a mark is an independent fact about the kill, and a message that named all three
 * would need eight forms of itself in each locale.
 */
export function killName(kill: KillRow, nameOf: NameOfSlot, t: Translate): string {
  const sentence =
    kill.attacker === null
      ? t('events.kill.byWorld', { victim: nameOf(kill.victim) })
      : t('events.kill.byPlayer', {
          attacker: nameOf(kill.attacker),
          victim: nameOf(kill.victim),
          // Game vocabulary reaches a label untranslated, the way a team row's weapon does.
          weapon: kill.weaponName,
        });

  const marks: string[] = [];
  if (kill.isHeadshot) marks.push(t('events.kill.headshot'));
  if (kill.isWallbang) marks.push(t('events.kill.wallbang'));
  if (kill.isThroughSmoke) marks.push(t('events.kill.throughSmoke'));

  return [sentence, ...marks].join('. ');
}
