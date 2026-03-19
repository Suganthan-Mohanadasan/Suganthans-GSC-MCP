import { fetchAllRows, getDateRange } from "../analytics.js";

interface CannibalizationIssue {
  query: string;
  totalImpressions: number;
  pages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    position: number;
  }>;
}

export async function cannibalizationCheck(
  days: number = 28,
  minImpressions: number = 50
): Promise<CannibalizationIssue[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["query", "page"],
  });

  // Group by query
  const queryMap = new Map<
    string,
    Array<{ page: string; clicks: number; impressions: number; position: number }>
  >();

  for (const row of rows) {
    const query = row.keys[0];
    const page = row.keys[1];

    if (!queryMap.has(query)) {
      queryMap.set(query, []);
    }
    queryMap.get(query)!.push({
      page,
      clicks: row.clicks,
      impressions: row.impressions,
      position: Math.round(row.position * 10) / 10,
    });
  }

  const issues: CannibalizationIssue[] = [];

  for (const [query, pages] of queryMap) {
    if (pages.length < 2) continue;

    const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);
    if (totalImpressions < minImpressions) continue;

    pages.sort((a, b) => a.position - b.position);

    issues.push({
      query,
      totalImpressions,
      pages,
    });
  }

  issues.sort((a, b) => b.totalImpressions - a.totalImpressions);
  return issues.slice(0, 50);
}
