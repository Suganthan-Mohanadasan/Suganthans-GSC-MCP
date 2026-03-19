import { fetchAllRows, getDateRange } from "../analytics.js";

interface ClusterPerformance {
  pathPattern: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  pageCount: number;
  topPages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
}

export async function topicClusterPerformance(
  pathPattern: string,
  days: number = 28
): Promise<ClusterPerformance> {
  const { startDate, endDate } = getDateRange(days);

  // Fetch page-level data filtered by URL pattern
  const pageRows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["page"],
    dimensionFilterGroups: [
      {
        filters: [
          {
            dimension: "page",
            operator: "contains",
            expression: pathPattern,
          },
        ],
      },
    ],
  });

  // Fetch query-level data filtered by URL pattern
  const queryRows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["query"],
    dimensionFilterGroups: [
      {
        filters: [
          {
            dimension: "page",
            operator: "contains",
            expression: pathPattern,
          },
        ],
      },
    ],
  });

  let totalClicks = 0;
  let totalImpressions = 0;
  let positionSum = 0;

  for (const row of pageRows) {
    totalClicks += row.clicks;
    totalImpressions += row.impressions;
    positionSum += row.position;
  }

  const topPages = pageRows
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)
    .map((r) => ({
      page: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      position: Math.round(r.position * 10) / 10,
    }));

  const topQueries = queryRows
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5)
    .map((r) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      position: Math.round(r.position * 10) / 10,
    }));

  return {
    pathPattern,
    totalClicks,
    totalImpressions,
    averageCtr:
      totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 10000) / 100
        : 0,
    averagePosition:
      pageRows.length > 0
        ? Math.round((positionSum / pageRows.length) * 10) / 10
        : 0,
    pageCount: pageRows.length,
    topPages,
    topQueries,
  };
}
