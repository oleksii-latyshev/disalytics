import type { OverviewMap } from '@disa/admin-contract';
import { Text, type TranslationKey } from '@disa/i18n';
import { RADAR_IMAGE_BASE } from '../../config';
import { type MapCard, mapCards, mapTitle } from '../../helpers/overview';
import { TILE_BODY, TileHead } from './BentoTile';

const COUNTS: readonly (readonly ['lineups' | 'collections' | 'tactics', TranslationKey])[] = [
  ['lineups', 'admin.overview.totals.lineups'],
  ['collections', 'admin.overview.totals.collections'],
  ['tactics', 'admin.overview.totals.tactics'],
];

function MapLink({ card }: { card: MapCard }) {
  return (
    <a
      href={`#/lineups/site/${card.map}`}
      className={`relative z-3 flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-2 transition-[border-color,opacity] duration-(--duration-micro) hover:border-line-strong ${
        card.isEmpty ? 'opacity-60 hover:opacity-100' : ''
      }`}
    >
      <span className="sr-only">
        <Text path="admin.overview.maps.open" values={{ map: mapTitle(card.map) }} />
      </span>
      <span aria-hidden="true" className="relative block aspect-square w-full bg-surface-0">
        <img
          src={`${RADAR_IMAGE_BASE}${card.image}`}
          alt=""
          loading="lazy"
          decoding="async"
          className={`size-full object-cover ${card.isEmpty ? 'opacity-50' : ''}`}
        />
        <span className="absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-black/80 to-transparent px-3 pt-8 pb-2">
          <span className="truncate font-medium text-14 text-white">{mapTitle(card.map)}</span>
          <span className="numeric truncate text-11 text-white/70">{card.map}</span>
        </span>
      </span>
      <span aria-hidden="true" className="p-3">
        {card.isEmpty ? (
          <span className="text-12 text-ink-dim">
            <Text path="admin.overview.maps.nothing" />
          </span>
        ) : (
          <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-12">
            {COUNTS.map(([key, label]) => (
              <div key={key} className="contents">
                <dt className="truncate text-ink-dim">
                  <Text path={label} />
                </dt>
                <dd className="numeric m-0 text-right text-ink">{card[key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </span>
    </a>
  );
}

/** Every map with a radar as a card: the radar large, the name over it, the three counts below. */
export function MapsTile({ maps }: { maps: readonly OverviewMap[] }) {
  return (
    <div className={TILE_BODY}>
      <TileHead
        title={<Text path="admin.overview.maps.title" />}
        aside={
          <span className="hidden text-12 text-ink-faint sm:inline">
            <Text path="admin.overview.maps.lede" />
          </span>
        }
      />
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4 xl:grid-cols-7">
        {mapCards(maps).map((card) => (
          <li key={card.map} className="min-w-0">
            <MapLink card={card} />
          </li>
        ))}
      </ul>
    </div>
  );
}
