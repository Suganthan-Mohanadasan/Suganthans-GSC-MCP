import {
  fetchAllRows,
  getDateRange,
  getPriorDateRange,
  SearchType,
  assertValidDimensions,
  QueryParams,
  deviceCountryFilters,
} from "../analytics.js";

/**
 * Query counting: how many distinct queries a property, a section or a single
 * URL is visible for - split by position group, optionally as a time series.
 *
 * The count GSC hands back is a FLOOR, not the truth: queries below Google's
 * privacy threshold never appear as rows, so their clicks land in the totals
 * but in no query row. That gap is reported explicitly instead of leaving the
 * query table to be mistaken for the complete keyword set.
 *
 * Time series buckets are fetched one request per bucket. That is deliberate:
 * the API de-duplicates queries within the requested range, so a per-bucket
 * request yields an exact distinct count without holding every query string
 * of every day in memory.
 */

export type Granularity = "none" | "day" | "week" | "month";

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

interface Bucket {
  startDate: string;
  endDate: string;
  visibleQueries: number;
  clicks: number;
  impressions: number;
}

interface QueryCountResult {
  period: { startDate: string; endDate: string; days: number };
  scope: {
    url: string | null;
    urlContains: string | null;
    surface: SearchType;
    minPosition: number | null;
    maxPosition: number | null;
    device: string | null;
    country: string | null;
  };
  totals: {
    visibleQueries: number;
    clicksFromVisibleQueries: number;
    totalClicks: number;
    anonymizedClicks: number;
    anonymizedClicksShare: number;
  };
  filtered: { visibleQueries: number; clicks: number; impressions: number } | null;
  byPositionGroup: PositionGroupCount[];
  timeSeries: Bucket[] | null;
  previousPeriod: {
    startDate: string;
    endDate: string;
    visibleQueries: number;
    change: number;
    changePercent: number;
  } | null;
  topPagesByQueryCount: PageQueryCount[] | null;
  comparabilityWarning: string | null;
}

const POSITION_GROUPS = ["1-3", "4-10", "11-20", "21-50", "51+"] as const;

function positionGroup(position: number): string {
  if (position <= 3) return "1-3";
  if (position <= 10) return "4-10";
  if (position <= 20) return "11-20";
  if (position <= 50) return "21-50";
  return "51+";
}

function parseISO(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Splits a date range into day, ISO-week (Mon-Sun) or calendar-month buckets. */
function buildBuckets(
  startDate: string,
  endDate: string,
  granularity: Exclude<Granularity, "none">
): Array<{ startDate: string; endDate: string }> {
  const end = parseISO(endDate);
  const out: Array<{ startDate: string; endDate: string }> = [];
  let cursor = parseISO(startDate);

  while (cursor <= end) {
    let bucketEnd: Date;
    if (granularity === "day") {
      bucketEnd = new Date(cursor);
    } else if (granularity === "week") {
      const mondayOffset = (cursor.getUTCDay() + 6) % 7; // 0 = Monday
      bucketEnd = new Date(cursor);
      bucketEnd.setUTCDate(bucketEnd.getUTCDate() + (6 - mondayOffset));
    } else {
      bucketEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    }
    if (bucketEnd > end) bucketEnd = new Date(end);

    out.push({ startDate: toISO(cursor), endDate: toISO(bucketEnd) });
    cursor = new Date(bucketEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}

export async function queryCount(
  days: number = 28,
  comparePrevious: boolean = true,
  includePages: boolean = false,
  topPages: number = 25,
  surface: SearchType = "web",
  url?: string,
  urlContains?: string,
  granularity: Granularity = "none",
  minPosition?: number,
  maxPosition?: number,
  device?: string,
  country?: string
): Promise<QueryCountResult> {
  assertValidDimensions(surface, ["query"]);

  if (granularity === "day" && days > 90) {
    throw new Error(
      `granularity "day" over ${days} days would need ${days}+ API requests. ` +
        `Use "week" or "month" for ranges beyond 90 days.`
    );
  }

  const { startDate, endDate } = getDateRange(days);

  const pageFilters = [];
  if (url) pageFilters.push({ dimension: "page", operator: "equals", expression: url });
  if (urlContains)
    pageFilters.push({ dimension: "page", operator: "contains", expression: urlContains });
  pageFilters.push(...deviceCountryFilters(device, country, surface));
  const dimensionFilterGroups = pageFilters.length ? [{ filters: pageFilters }] : undefined;

  const scoped = (params: Omit<QueryParams, "dimensionFilterGroups">): QueryParams => ({
    ...params,
    dimensionFilterGroups,
  });

  const queryRows = await fetchAllRows(
    scoped({ startDate, endDate, dimensions: ["query"], searchType: surface })
  );

  // Totals without the query dimension: same scope, but including the clicks
  // that no visible query row accounts for.
  const dateRows = await fetchAllRows(
    scoped({ startDate, endDate, dimensions: ["date"], searchType: surface })
  );

  const clicksFromVisibleQueries = queryRows.reduce((sum, r) => sum + r.clicks, 0);
  const totalClicks = dateRows.reduce((sum, r) => sum + r.clicks, 0);
  const anonymizedClicks = Math.max(0, totalClicks - clicksFromVisibleQueries);

  // The position filter narrows what gets counted, but never the gap above:
  // that one only makes sense against the unfiltered scope.
  const inPositionFilter = (position: number) =>
    (minPosition === undefined || position >= minPosition) &&
    (maxPosition === undefined || position <= maxPosition);
  const hasPositionFilter = minPosition !== undefined || maxPosition !== undefined;
  const countedRows = hasPositionFilter
    ? queryRows.filter((r) => inPositionFilter(r.position))
    : queryRows;

  const groups = new Map<string, { queries: number; clicks: number; impressions: number }>();
  for (const group of POSITION_GROUPS) {
    groups.set(group, { queries: 0, clicks: 0, impressions: 0 });
  }
  for (const row of countedRows) {
    const entry = groups.get(positionGroup(row.position))!;
    entry.queries += 1;
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
  }

  const countedTotal = countedRows.length;
  const byPositionGroup: PositionGroupCount[] = POSITION_GROUPS.map((group) => {
    const entry = groups.get(group)!;
    return {
      group,
      queries: entry.queries,
      clicks: entry.clicks,
      impressions: entry.impressions,
      queryShare:
        countedTotal > 0 ? Math.round((entry.queries / countedTotal) * 10000) / 100 : 0,
    };
  });

  let timeSeries: Bucket[] | null = null;
  if (granularity !== "none") {
    timeSeries = [];
    for (const bucket of buildBuckets(startDate, endDate, granularity)) {
      const rows = await fetchAllRows(
        scoped({
          startDate: bucket.startDate,
          endDate: bucket.endDate,
          dimensions: ["query"],
          searchType: surface,
        })
      );
      const counted = hasPositionFilter ? rows.filter((r) => inPositionFilter(r.position)) : rows;
      timeSeries.push({
        startDate: bucket.startDate,
        endDate: bucket.endDate,
        visibleQueries: counted.length,
        clicks: counted.reduce((sum, r) => sum + r.clicks, 0),
        impressions: counted.reduce((sum, r) => sum + r.impressions, 0),
      });
    }
  }

  let previousPeriod: QueryCountResult["previousPeriod"] = null;
  if (comparePrevious) {
    const prior = getPriorDateRange(days);
    const priorRows = await fetchAllRows(
      scoped({
        startDate: prior.startDate,
        endDate: prior.endDate,
        dimensions: ["query"],
        searchType: surface,
      })
    );
    const priorCount = (
      hasPositionFilter ? priorRows.filter((r) => inPositionFilter(r.position)) : priorRows
    ).length;
    const change = countedTotal - priorCount;
    previousPeriod = {
      startDate: prior.startDate,
      endDate: prior.endDate,
      visibleQueries: priorCount,
      change,
      changePercent: priorCount > 0 ? Math.round((change / priorCount) * 10000) / 100 : 0,
    };
  }

  let topPagesByQueryCount: PageQueryCount[] | null = null;
  if (includePages) {
    assertValidDimensions(surface, ["page", "query"]);
    const pageQueryRows = await fetchAllRows(
      scoped({
        startDate,
        endDate,
        dimensions: ["page", "query"],
        searchType: surface,
        maxRows: 100000,
      })
    );

    const pages = new Map<string, { queries: number; clicks: number; impressions: number }>();
    for (const row of pageQueryRows) {
      if (hasPositionFilter && !inPositionFilter(row.position)) continue;
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
    scope: {
      url: url ?? null,
      urlContains: urlContains ?? null,
      surface,
      minPosition: minPosition ?? null,
      maxPosition: maxPosition ?? null,
      device: device ? device.toUpperCase() : null,
      country: country ? country.toLowerCase() : null,
    },
    totals: {
      visibleQueries: queryRows.length,
      clicksFromVisibleQueries,
      totalClicks,
      anonymizedClicks,
      anonymizedClicksShare:
        totalClicks > 0 ? Math.round((anonymizedClicks / totalClicks) * 10000) / 100 : 0,
    },
    filtered: hasPositionFilter
      ? {
          visibleQueries: countedTotal,
          clicks: countedRows.reduce((sum, r) => sum + r.clicks, 0),
          impressions: countedRows.reduce((sum, r) => sum + r.impressions, 0),
        }
      : null,
    byPositionGroup,
    timeSeries,
    previousPeriod,
    topPagesByQueryCount,
    // Measured against a live property: the API returns MORE query rows for a
    // single device slice than for the unfiltered call over the same period
    // (38,586 unfiltered vs 80,531 for MOBILE alone). Clicks stay consistent,
    // so the filter itself is fine - the API simply surfaces more queries once
    // the request is narrowed. Counts are therefore comparable only between
    // runs with the SAME filter, never between filtered and unfiltered.
    comparabilityWarning:
      device || country
        ? "A device or country filter is active. The API returns more query rows for a narrowed request than for the unfiltered one over the same period, so visibleQueries here is NOT comparable to an unfiltered run or to a run with a different filter - only to runs with this exact filter. Clicks and impressions are unaffected. For counts that stay comparable across slices, use the BigQuery bulk export (gsc_query_count in the BigQuery MCP), which does not truncate."
        : null,
  };
}
