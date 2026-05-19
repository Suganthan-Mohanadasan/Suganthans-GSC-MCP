import { fetchAllRows, getDateRange } from "../analytics.js";

interface NoClickRow {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

/**
 * Surfaces query+page pairs that earn meaningful image-search impressions but
 * effectively no clicks. This is the textbook "thumbnail is not converting"
 * pattern: the image is in the SERP but the crop, alt text mismatch, or page
 * authority relative to competitors keeps users from clicking.
 *
 * Defaults are tuned for image search, which runs at much higher impression
 * volumes per page than web search.
 */
export async function imageImpressionsNoClicks(
  days: number = 90,
  minImpressions: number = 500,
  maxClicks: number = 2,
  rowLimit: number = 50
): Promise<NoClickRow[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["query", "page"],
    type: "image",
  });

  const filtered = rows.filter(
    (r) => r.impressions >= minImpressions && r.clicks <= maxClicks
  );

  filtered.sort((a, b) => b.impressions - a.impressions);

  return filtered.slice(0, rowLimit).map((r) => ({
    query: r.keys[0],
    page: r.keys[1],
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: Math.round(r.ctr * 10000) / 100,
    position: Math.round(r.position * 10) / 10,
  }));
}
