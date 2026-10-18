import { useT } from '@disa/i18n';
import { buttonVariants, ToggleGroup, ToggleGroupItem } from '@disa/ui';
import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { EventGlyph } from '@/core/glyphs';
import type { RoundFilter } from '../helpers/round-tactics';

type Facet = 'ct' | 't' | 'won' | 'lost' | 'planted';

const FACETS: readonly Facet[] = ['t', 'ct', 'won', 'lost', 'planted'];

const MARK: Readonly<Record<Facet, ReactNode>> = {
  t: <span className="font-mono text-12">T</span>,
  ct: <span className="font-mono text-12">CT</span>,
  won: <Check aria-hidden="true" />,
  lost: <X aria-hidden="true" />,
  planted: <EventGlyph kind="plant" size="control" />,
};

function isOn(filter: RoundFilter, facet: Facet): boolean {
  return facet === 'planted' ? filter.isPlantedOnly : filter[facet];
}

interface Props {
  filter: RoundFilter;
  onChange: (filter: RoundFilter) => void;
}

/**
 * The round strip's filter, in the manner of the round axis's: one switch per kind of round, in the
 * row so that what is switched off is on the screen. A kind that is off dims its rounds on the
 * strip and the arrow keys walk past them; the plant switch is the one that narrows rather than
 * widens.
 */
export function TacticRoundFilters({ filter, onChange }: Props) {
  const t = useT();
  const value = FACETS.filter((facet) => isOn(filter, facet));

  const handleValueChange = (pressed: readonly string[]) =>
    onChange({
      t: pressed.includes('t'),
      ct: pressed.includes('ct'),
      won: pressed.includes('won'),
      lost: pressed.includes('lost'),
      isPlantedOnly: pressed.includes('planted'),
    });

  return (
    <ToggleGroup
      multiple
      aria-label={t('review.tactics.filter.label')}
      value={value}
      onValueChange={handleValueChange}
      className="flex shrink-0 items-center self-center"
    >
      {FACETS.map((facet) => (
        <ToggleGroupItem
          key={facet}
          value={facet}
          aria-label={t(`review.tactics.filter.${facet}`)}
          title={t(`review.tactics.filter.${facet}`)}
          className={`${buttonVariants({ variant: 'ghost', size: 'icon' })} ${
            isOn(filter, facet) ? 'text-ink' : 'text-ink-faint'
          }`}
        >
          {MARK[facet]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
