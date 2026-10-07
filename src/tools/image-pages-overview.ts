import { fetchAllRows, getDateRange } from "../analytics.js";

interface ImagePageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Pages on the site ranked by image-search performance. Tells you which pages
 * are actually showing up in Google Images and which are not. Useful when
 * paired with image-keyword-overview to map "what queries are we ranking on"
 * back to "which pages carry that ranking".
 */
export async function imagePagesOverview(
  days: number = 90,
  minImpressions: number = 100,
  rowLimit: number = 50,
  orderBy: "impressions" | "clicks" | "position" = "clicks"
): Promise<ImagePageRow[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["page"],
    type: "image",
  });

  const filtered = rows.filter((r) => r.impressions >= minImpressions);

  if (orderBy === "impressions") {
    filtered.sort((a, b) => b.impressions - a.impressions);
  } else if (orderBy === "clicks") {
    filtered.sort((a, b) => b.clicks - a.clicks);
  } else {
    filtered.sort((a, b) => a.position - b.position);
  }

  return filtered.slice(0, rowLimit).map((r) => ({
    page: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: Math.round(r.ctr * 10000) / 100,
    position: Math.round(r.position * 10) / 10,
  }));
}
