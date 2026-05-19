import {
  fetchAllRows,
  getDateRange,
  getPriorDateRange,
  SearchAnalyticsRow,
} from "../analytics.js";

interface TrendRow {
  query: string;
  currentClicks: number;
  priorClicks: number;
  currentImpressions: number;
  priorImpressions: number;
  impressionsDelta: number;
  currentPosition: number;
  priorPosition: number;
  positionDelta: number;
}

/**
 * Two equal-length windows of image-search data joined on query. Reports
 * impression and position deltas so you can spot which image-search queries
 * are gaining or losing visibility. Negative position delta means the query
 * improved its average rank (smaller position number = better rank).
 */
export async function imageKeywordTrends(
  days: number = 28,
  minCombinedImpressions: number = 100,
  rowLimit: number = 50,
  orderBy: "impressions_delta" | "position_delta" = "impressions_delta"
): Promise<TrendRow[]> {
  const current = getDateRange(days);
  const prior = getPriorDateRange(days);

  const [currentRows, priorRows] = await Promise.all([
    fetchAllRows({
      startDate: current.startDate,
      endDate: current.endDate,
      dimensions: ["query"],
      type: "image",
    }),
    fetchAllRows({
      startDate: prior.startDate,
      endDate: prior.endDate,
      dimensions: ["query"],
      type: "image",
    }),
  ]);

  const toMap = (rows: SearchAnalyticsRow[]): Map<string, SearchAnalyticsRow> => {
    const map = new Map<string, SearchAnalyticsRow>();
    for (const r of rows) {
      map.set(r.keys[0], r);
    }
    return map;
  };

  const currentMap = toMap(currentRows);
  const priorMap = toMap(priorRows);

  const queries = new Set<string>();
  for (const q of currentMap.keys()) queries.add(q);
  for (const q of priorMap.keys()) queries.add(q);

  const results: TrendRow[] = [];
  for (const query of queries) {
    const c = currentMap.get(query);
    const p = priorMap.get(query);

    const cImpr = c?.impressions || 0;
    const pImpr = p?.impressions || 0;

    if (cImpr + pImpr < minCombinedImpressions) continue;

    const cPos = c?.position || 0;
    const pPos = p?.position || 0;

    results.push({
      query,
      currentClicks: c?.clicks || 0,
      priorClicks: p?.clicks || 0,
      currentImpressions: cImpr,
      priorImpressions: pImpr,
      impressionsDelta: cImpr - pImpr,
      currentPosition: Math.round(cPos * 10) / 10,
      priorPosition: Math.round(pPos * 10) / 10,
      positionDelta: Math.round((cPos - pPos) * 10) / 10,
    });
  }

  if (orderBy === "impressions_delta") {
    results.sort((a, b) => b.impressionsDelta - a.impressionsDelta);
  } else {
    // position_delta: most-improved first (most negative)
    results.sort((a, b) => a.positionDelta - b.positionDelta);
  }

  return results.slice(0, rowLimit);
}
