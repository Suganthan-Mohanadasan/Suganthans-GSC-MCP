import {
  fetchAllRows,
  getDateRange,
  getPriorDateRange,
  buildFilterGroups,
  DimensionFilterList,
  SearchAnalyticsRow,
} from "../analytics.js";

interface Totals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface KeyedRow extends Totals {
  key: string;
}

interface MultimodalResult {
  hasData: boolean;
  note: string;
  period: { startDate: string; endDate: string };
  priorPeriod: { startDate: string; endDate: string };
  filterListsApplied: DimensionFilterList[];
  multimodal: Totals;
  multimodalPrior: Totals;
  clicksChangePct: number | null;
  impressionsChangePct: number | null;
  web: Totals;
  multimodalVsWebImpressionsPct: number;
  multimodalVsWebClicksPct: number;
  topPages: KeyedRow[];
  byCountry: KeyedRow[];
  byDevice: KeyedRow[];
  trend: Array<{ date: string; clicks: number; impressions: number }>;
}

function totals(row?: SearchAnalyticsRow): Totals {
  return {
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row ? Math.round(row.ctr * 10000) / 100 : 0,
    position: row ? Math.round(row.position * 10) / 10 : 0,
  };
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0;
}

function changePct(current: number, prior: number): number | null {
  return prior > 0 ? Math.round(((current - prior) / prior) * 10000) / 100 : null;
}

/**
 * Performance in multimodal search: Google Lens, Circle to Search on Android
 * and image uploads in Google Search (`type=webMultimodal`, in the Search
 * Analytics API since November 2026).
 *
 * Google does not expose queries for this surface. Grouping or filtering by
 * query or brandedClassification is rejected with a 400, so the breakdowns
 * here are page, country, device and date.
 */
export async function multimodalSearchOverview(
  days: number = 90,
  rowLimit: number = 25,
  filterLists: DimensionFilterList[] = [],
  siteUrl?: string
): Promise<MultimodalResult> {
  const period = getDateRange(days);
  const priorPeriod = getPriorDateRange(days);
  const dimensionFilterGroups = buildFilterGroups([], filterLists);

  const multimodal = (range: { startDate: string; endDate: string }, dimensions: string[]) =>
    fetchAllRows({ ...range, dimensions, dimensionFilterGroups, type: "webMultimodal" }, siteUrl);

  const [total, priorTotal, webTotal, pages, countries, devices, daily] = await Promise.all([
    multimodal(period, []),
    multimodal(priorPeriod, []),
    fetchAllRows({ ...period, dimensions: [], dimensionFilterGroups, type: "web" }, siteUrl),
    multimodal(period, ["page"]),
    multimodal(period, ["country"]),
    multimodal(period, ["device"]),
    multimodal(period, ["date"]),
  ]);

  const current = totals(total[0]);
  const prior = totals(priorTotal[0]);
  const web = totals(webTotal[0]);

  const keyed = (rows: SearchAnalyticsRow[], limit: number): KeyedRow[] =>
    rows
      .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
      .slice(0, limit)
      .map((r) => ({ key: r.keys[0], ...totals(r) }));

  return {
    hasData: current.impressions > 0,
    note:
      "Multimodal = Google Lens, Circle to Search on Android, and image uploads in Google Search. " +
      "Google does not provide queries for this surface, so there is no keyword breakdown. " +
      "Page rows are aggregated by page and can differ from the property totals.",
    period,
    priorPeriod,
    filterListsApplied: filterLists,
    multimodal: current,
    multimodalPrior: prior,
    clicksChangePct: changePct(current.clicks, prior.clicks),
    impressionsChangePct: changePct(current.impressions, prior.impressions),
    web,
    multimodalVsWebImpressionsPct: pct(current.impressions, web.impressions),
    multimodalVsWebClicksPct: pct(current.clicks, web.clicks),
    topPages: keyed(pages, rowLimit),
    byCountry: keyed(countries, rowLimit),
    byDevice: keyed(devices, 3),
    trend: daily
      .map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
