import { fetchAllRows, getDateRange } from "../analytics.js";

interface ContentGap {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
}

export async function contentGaps(
  days: number = 90,
  minImpressions: number = 50,
  minPosition: number = 20
): Promise<ContentGap[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["query"],
  });

  const gaps: ContentGap[] = [];

  for (const row of rows) {
    if (row.impressions < minImpressions) continue;
    if (row.position < minPosition) continue;

    gaps.push({
      query: row.keys[0],
      impressions: row.impressions,
      clicks: row.clicks,
      position: Math.round(row.position * 10) / 10,
    });
  }

  gaps.sort((a, b) => b.impressions - a.impressions);
  return gaps.slice(0, 50);
}
