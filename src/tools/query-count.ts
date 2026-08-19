import {
  fetchAllRows,
  getDateRange,
  getPriorDateRange,
  SearchType,
  assertValidDimensions,
} from "../analytics.js";

/**
 * Query counting: how many distinct queries a site (and each page) is visible
 * for, split by position group.
 *
 * The number GSC hands back is a FLOOR, not the truth: queries below Google's
 * privacy threshold never appear as rows, so their clicks show up in the site
 * total but in no query row. We therefore also report that gap explicitly
 * instead of pretending the query table is complete.
 */

interface PositionGroupCount {
  group: string;
  queries: number;
  clicks: number;
  impressions: number;
  queryShare: number;
}

interface PageQueryCount {
  page: string;
  queries: number;
  clicks: number;
  impressions: number;
}

interface QueryCountResult {
  period: { startDate: string; endDate: string; days: number };
  totals: {
    visibleQueries: number;
    clicksFromVisibleQueries: number;
    totalClicks: number;
    anonymizedClicks: number;
    anonymizedClicksShare: number;
  };
  byPositionGroup: PositionGroupCount[];
  previousPeriod: {
    startDate: string;
    endDate: string;
    visibleQueries: number;
    change: number;
    changePercent: number;
  } | null;
  topPagesByQueryCount: PageQueryCount[] | null;
}

const POSITION_GROUPS = ["1-3", "4-10", "11-20", "21-50", "51+"] as const;

function positionGroup(position: number): string {
  if (position <= 3) return "1-3";
  if (position <= 10) return "4-10";
  if (position <= 20) return "11-20";
  if (position <= 50) return "21-50";
  return "51+";
}

export async function queryCount(
  days: number = 28,
  comparePrevious: boolean = true,
  includePages: boolean = false,
  topPages: number = 25,
  searchType: SearchType = "web"
): Promise<QueryCountResult> {
  assertValidDimensions(searchType, ["query"]);
  const { startDate, endDate } = getDateRange(days);

  const queryRows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["query"],
    searchType,
  });

  // Site totals without the query dimension. Grouping by date keeps the request
  // small while still summing to the same figure the GSC dashboard shows.
  const dateRows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["date"],
    searchType,
  });

  const clicksFromVisibleQueries = queryRows.reduce((sum, r) => sum + r.clicks, 0);
  const totalClicks = dateRows.reduce((sum, r) => sum + r.clicks, 0);
  const anonymizedClicks = Math.max(0, totalClicks - clicksFromVisibleQueries);

  const buckets = new Map<string, { queries: number; clicks: number; impressions: number }>();
  for (const group of POSITION_GROUPS) {
    buckets.set(group, { queries: 0, clicks: 0, impressions: 0 });
  }
  for (const row of queryRows) {
    const bucket = buckets.get(positionGroup(row.position))!;
    bucket.queries += 1;
    bucket.clicks += row.clicks;
    bucket.impressions += row.impressions;
  }

  const visibleQueries = queryRows.length;
  const byPositionGroup: PositionGroupCount[] = POSITION_GROUPS.map((group) => {
    const bucket = buckets.get(group)!;
    return {
      group,
      queries: bucket.queries,
      clicks: bucket.clicks,
      impressions: bucket.impressions,
      queryShare:
        visibleQueries > 0 ? Math.round((bucket.queries / visibleQueries) * 10000) / 100 : 0,
    };
  });

  let previousPeriod: QueryCountResult["previousPeriod"] = null;
  if (comparePrevious) {
    const prior = getPriorDateRange(days);
    const priorRows = await fetchAllRows({
      startDate: prior.startDate,
      endDate: prior.endDate,
      dimensions: ["query"],
      searchType,
    });
    const change = visibleQueries - priorRows.length;
    previousPeriod = {
      startDate: prior.startDate,
      endDate: prior.endDate,
      visibleQueries: priorRows.length,
      change,
      changePercent:
        priorRows.length > 0 ? Math.round((change / priorRows.length) * 10000) / 100 : 0,
    };
  }

  let topPagesByQueryCount: PageQueryCount[] | null = null;
  if (includePages) {
    assertValidDimensions(searchType, ["page", "query"]);
    const pageQueryRows = await fetchAllRows({
      startDate,
      endDate,
      dimensions: ["page", "query"],
      searchType,
      maxRows: 100000,
    });

    const pages = new Map<string, { queries: number; clicks: number; impressions: number }>();
    for (const row of pageQueryRows) {
      const page = row.keys[0];
      const entry = pages.get(page) || { queries: 0, clicks: 0, impressions: 0 };
      entry.queries += 1;
      entry.clicks += row.clicks;
      entry.impressions += row.impressions;
      pages.set(page, entry);
    }

    topPagesByQueryCount = [...pages.entries()]
      .map(([page, entry]) => ({ page, ...entry }))
      .sort((a, b) => b.queries - a.queries)
      .slice(0, topPages);
  }

  return {
    period: { startDate, endDate, days },
    totals: {
      visibleQueries,
      clicksFromVisibleQueries,
      totalClicks,
      anonymizedClicks,
      anonymizedClicksShare:
        totalClicks > 0 ? Math.round((anonymizedClicks / totalClicks) * 10000) / 100 : 0,
    },
    byPositionGroup,
    previousPeriod,
    topPagesByQueryCount,
  };
}
