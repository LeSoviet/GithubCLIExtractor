import { execGhJson } from './exec-gh.js';

/**
 * Paginate through a `gh api` endpoint page by page.
 *
 * Uses multiple small requests instead of `--paginate` in a single command,
 * which avoids stdout-buffer overflows and 60s timeouts on huge histories
 * (e.g. exporting all commits from a large repo).
 *
 * @param endpoint - gh api endpoint, e.g. `repos/o/r/commits`
 * @param query - URL query params (without `per_page`/`page`)
 * @param maxItems - maximum number of items to fetch (0 = unlimited)
 */
export async function paginateApi<T>(
  endpoint: string,
  query: string,
  maxItems: number = 0
): Promise<T[]> {
  const perPage = 100;
  const items: T[] = [];
  let page = 1;

  // Loop until we reach the cap, get an empty page, or a short page (end).
  while (maxItems === 0 || items.length < maxItems) {
    const url = `${endpoint}?per_page=${perPage}&page=${page}${query ? `&${query}` : ''}`;
    const batch = await execGhJson<T[]>(`api ${url}`, {
      timeout: 60000,
      useRateLimit: false,
      useRetry: false,
    });

    if (!batch || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return maxItems > 0 ? items.slice(0, maxItems) : items;
}
