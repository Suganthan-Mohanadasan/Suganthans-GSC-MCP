import {
  fetchAllRows,
  getDateRange,
  getPriorDateRange,
  assertValidDimensions,
} from "../analytics.js";

interface PeriodTotals {
  clicks: number;
  impressions: number;
  ctr: number;
}

interface DiscoverPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
}

interface DiscoverAnalysisResult {
  surface: "discover";
  period: { startDate: string; endDate: string };
  totals: PeriodTotals;
  change: { clicksPercent: number; impressionsPercent: number };
  topPages: DiscoverPage[];
  byCountry: Array<{ country: string; clicks: number; impressions: number; ctr: number }>;
  dailyTrend: Array<{ date: string; clicks: number; impressions: number }>;
  note: string;
}

function totals(rows: { clicks: number; impressions: number }[]): PeriodTotals {
  let clicks = 0;
  let impressions = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
  };
}

function pct(curr: number, prior: number): number {
  return prior > 0 ? Math.round(((curr - prior) / prior) * 10000) / 100 : 0;
}

/**
 * Isolated Google Discover performance. Discover is NOT query-based, so the API
 * only supports page / country / date dimensions here. Position/CTR-vs-position
 * benchmarks from web tools do not apply.
 */
export async function discoverAnalysis(
  days: number = 28,
  rowLimit: number = 50,
  siteUrl?: string
): Promise<DiscoverAnalysisResult> {
  const current = getDateRange(days);
  const prior = getPriorDateRange(days);

  assertValidDimensions("discover", ["page"]);

  const [pageRows, priorPageRows, countryRows, dateRows] = await Promise.all([
    fetchAllRows(
      { startDate: current.startDate, endDate: current.endDate, dimensions: ["page"], type: "discover" },
      siteUrl
    ),
    fetchAllRows(
      { startDate: prior.startDate, endDate: prior.endDate, dimensions: ["page"], type: "discover" },
      siteUrl
    ),
    fetchAllRows(
      { startDate: current.startDate, endDate: current.endDate, dimensions: ["country"], type: "discover" },
      siteUrl
    ),
    fetchAllRows(
      { startDate: current.startDate, endDate: current.endDate, dimensions: ["date"], type: "discover" },
      siteUrl
    ),
  ]);

  const curTotals = totals(pageRows);
  const priorTotals = totals(priorPageRows);

  const topPages = pageRows
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, Math.min(rowLimit, 200))
    .map((r) => ({
      page: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
    }));

  const byCountry = countryRows
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 15)
    .map((r) => ({
      country: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
    }));

  const dailyTrend = dateRows
    .sort((a, b) => a.keys[0].localeCompare(b.keys[0]))
    .map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions }));

  return {
    surface: "discover",
    period: current,
    totals: curTotals,
    change: {
      clicksPercent: pct(curTotals.clicks, priorTotals.clicks),
      impressionsPercent: pct(curTotals.impressions, priorTotals.impressions),
    },
    topPages,
    byCountry,
    dailyTrend,
    note:
      "Google Discover is feed-based, not query-based. There are no query-level rows " +
      "and average position is not meaningful here. Optimise on title, hero image and freshness.",
  };
}
