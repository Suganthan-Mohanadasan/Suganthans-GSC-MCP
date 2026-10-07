import { fetchAllRows, getDateRange } from "../analytics.js";

interface ImageKeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Top image-search keywords for the site, sorted by impressions, clicks, or
 * position. Reuses fetchAllRows with type=image (added to analytics.ts in
 * v2.3). Default window is 90 days because image-search volume is generally
 * lower than web and a longer window surfaces more signal.
 */
export async function imageKeywordOverview(
  days: number = 90,
  minImpressions: number = 50,
  rowLimit: number = 50,
  orderBy: "impressions" | "clicks" | "position" = "impressions"
): Promise<ImageKeywordRow[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["query"],
    type: "image",
  });

  const filtered = rows.filter((r) => r.impressions >= minImpressions);

  if (orderBy === "impressions") {
    filtered.sort((a, b) => b.impressions - a.impressions);
  } else if (orderBy === "clicks") {
    filtered.sort((a, b) => b.clicks - a.clicks);
  } else {
    // position: lower is better
    filtered.sort((a, b) => a.position - b.position);
  }

  return filtered.slice(0, rowLimit).map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: Math.round(r.ctr * 10000) / 100,
    position: Math.round(r.position * 10) / 10,
  }));
}
