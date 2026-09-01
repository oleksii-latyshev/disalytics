import { SlidingNumber } from '@disa/ui';
import type { MoneyShape } from '../helpers/money';

interface Props {
  value: number;
  money: Intl.NumberFormat;
  shape: MoneyShape;
  /**
   * Whether the digits roll. A live balance does; a round's equipment figure is a fact about a
   * round that is over and has nothing to roll from.
   */
  isSliding: boolean;
}

/**
 * An amount of money, in the locale's own shape.
 *
 * `SlidingNumber` writes digits and only digits — it takes a `thousandSeparator` string and knows
 * nothing about a currency — so the symbol and its placement come off `Intl.formatToParts` once per
 * locale and sit either side of the rolling figure. That is what keeps `$4,200` and `4 200 $` both
 * correct while the digits themselves animate.
 *
 * **The roller is `aria-hidden` and the plain figure is what is read.** The rolling digit is ten
 * absolutely-positioned copies of every place, so its accessible text is the ten digits rather than
 * the number; a screen reader hearing `$4,200` needs the formatter's own string, which is what the
 * `sr-only` span carries.
 *
 * `initiallyStable` is what stops all ten rows counting up from zero as the match arrives: the
 * component's default is to treat its first value as a change and roll to it, which would put ten
 * five-digit spins into §8's assembly.
 */
export function Money({ value, money, shape, isSliding }: Props) {
  if (!isSliding) return <>{money.format(value)}</>;

  return (
    <>
      <span className="sr-only">{money.format(value)}</span>

      <span aria-hidden="true" className="inline-flex items-center">
        {shape.prefix}
        <SlidingNumber
          number={value}
          thousandSeparator={shape.group}
          initiallyStable={true}
          padStart={false}
        />
        {shape.suffix}
      </span>
    </>
  );
}
