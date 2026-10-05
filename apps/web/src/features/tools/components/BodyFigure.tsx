import { zoneHeat } from '../helpers/weapon-damage';

export function BodyFigure({
  head,
  chest,
  stomach,
  legs,
  hasVest,
  hasHelmet,
  className,
}: {
  head: number;
  chest: number;
  stomach: number;
  legs: number;
  hasVest: boolean;
  hasHelmet: boolean;
  className?: string;
}) {
  const opacity = (damage: number) => 0.14 + 0.8 * zoneHeat(damage);
  return (
    <svg viewBox="0 0 120 200" aria-hidden="true" className={`text-ink ${className ?? ''}`}>
      <circle cx="60" cy="22" r="16" fill="currentColor" fillOpacity={opacity(head)} />
      <g fill="currentColor" fillOpacity={opacity(chest)}>
        <rect x="36" y="44" width="48" height="44" rx="8" />
        <rect x="18" y="46" width="14" height="56" rx="6" />
        <rect x="88" y="46" width="14" height="56" rx="6" />
      </g>
      <rect
        x="38"
        y="92"
        width="44"
        height="26"
        rx="6"
        fill="currentColor"
        fillOpacity={opacity(stomach)}
      />
      <g fill="currentColor" fillOpacity={opacity(legs)}>
        <rect x="38" y="122" width="19" height="72" rx="7" />
        <rect x="63" y="122" width="19" height="72" rx="7" />
      </g>
      {hasVest && (
        <path
          d="M40 44 H50 L60 55 L70 44 H80 L85 52 V110 Q85 118 77 118 H43 Q35 118 35 110 V52 Z"
          className="text-ct"
          fill="currentColor"
          fillOpacity={0.16}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      )}
      {hasHelmet && (
        <path
          d="M41 25 A19 19 0 0 1 79 25 Z"
          className="text-ct"
          fill="currentColor"
          fillOpacity={0.16}
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
