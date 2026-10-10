/** What every public, edge-cached read answers with: a minute fresh, ten more while it revalidates. */
export const PUBLIC_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=600';
