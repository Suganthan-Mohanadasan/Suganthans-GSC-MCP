import { getSearchConsoleClient, getConfig } from "./auth.js";

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface QueryParams {
  startDate: string;
  endDate: string;
  dimensions: string[];
  dimensionFilterGroups?: Array<{
    filters: Array<{
      dimension: string;
      operator: string;
      expression: string;
    }>;
  }>;
  rowLimit?: number;
  // GSC Search Analytics `type` filter. Values: web (default), image, video,
  // news, discover, googleNews. Added in v2.3 to unlock image-search data.
  type?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday (latest available)
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

export function getPriorDateRange(days: number): { startDate: string; endDate: string } {
  const currentEnd = new Date();
  currentEnd.setDate(currentEnd.getDate() - 1);
  const currentStart = new Date(currentEnd);
  currentStart.setDate(currentStart.getDate() - days + 1);

  const priorEnd = new Date(currentStart);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - days + 1);

  return {
    startDate: formatDate(priorStart),
    endDate: formatDate(priorEnd),
  };
}

/**
 * Fetches all rows from the Search Analytics API with automatic pagination.
 * Uses dataState: 'all' so data matches the GSC dashboard exactly.
 */
export async function fetchAllRows(params: QueryParams, siteUrlOverride?: string): Promise<SearchAnalyticsRow[]> {
  const client = await getSearchConsoleClient();
  const siteUrl = siteUrlOverride || getConfig().siteUrl;
  const allRows: SearchAnalyticsRow[] = [];
  const pageSize = params.rowLimit || 25000;
  let startRow = 0;

  while (true) {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions,
        dimensionFilterGroups: params.dimensionFilterGroups,
        rowLimit: pageSize,
        startRow,
        dataState: "all",
        // Pass through the type filter when provided. Defaults server-side to
        // `web` when omitted, matching prior behaviour.
        ...(params.type ? { type: params.type } : {}),
      },
    });

    const rows = response.data.rows;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      allRows.push({
        keys: row.keys || [],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    if (rows.length < pageSize) break;
    startRow += pageSize;
  }

  return allRows;
}

/**
 * Expected CTR per position.
 *
 * The study table below comes from an industry-wide analysis of other people's
 * sites. It is only the fallback now. Measured against a content property, the
 * real CTR at position 1 is 3.5% against the table's 28.5% - a factor of 8.
 * Judging pages against that stamps almost every page as underperforming, which
 * says something about the study rather than about the page.
 *
 * So the tools build their own curve from the rows they already fetched and fall
 * back to the table only for ranks with too little volume to measure reliably.
 */
export const STUDY_CTR_BY_POSITION = [
  0.285, 0.157, 0.11, 0.08, 0.072, 0.051, 0.04, 0.032, 0.028, 0.025,
];

export function studyCtrAt(position: number): number {
  if (position <= 0) return STUDY_CTR_BY_POSITION[0];
  if (position <= 10) return STUDY_CTR_BY_POSITION[Math.floor(position) - 1];
  return Math.max(0.005, 0.025 - (position - 10) * 0.002);
}

export type CtrSource = "measured" | "study";

export interface ClickCurve {
  /** Rank -> measured CTR as a fraction (0-1). */
  byRank: Map<number, number>;
  /** What the curve was built from, so the result stays interpretable. */
  basis: string;
  ranksMeasured: number;
  impressionsConsidered: number;
}

/**
 * Builds the CTR-per-rank curve from rows that were already fetched, so this
 * costs no extra API call.
 *
 * CTR per rank is the sum of clicks over the sum of impressions, never a mean of
 * ratios - otherwise a row with three impressions counts as much as one with
 * thirty thousand. Call it on the unfiltered rows: build the curve after an
 * impressions filter and it skews high.
 */
export function buildClickCurve(
  rows: SearchAnalyticsRow[],
  basis: string,
  minImpressionsPerRank: number = 100
): ClickCurve {
  const buckets = new Map<number, { clicks: number; impressions: number }>();
  let impressionsConsidered = 0;

  for (const row of rows) {
    if (!row.impressions) continue;
    const rank = Math.max(1, Math.round(row.position));
    const bucket = buckets.get(rank) || { clicks: 0, impressions: 0 };
    bucket.clicks += row.clicks;
    bucket.impressions += row.impressions;
    buckets.set(rank, bucket);
    impressionsConsidered += row.impressions;
  }

  const byRank = new Map<number, number>();
  for (const [rank, bucket] of buckets) {
    if (bucket.impressions < minImpressionsPerRank) continue;
    byRank.set(rank, bucket.clicks / bucket.impressions);
  }

  return { byRank, basis, ranksMeasured: byRank.size, impressionsConsidered };
}

/** The measured CTR for this rank, else the study table. */
export function expectedCtr(
  position: number,
  curve?: ClickCurve
): { ctr: number; source: CtrSource } {
  const rank = Math.max(1, Math.round(position));
  const measured = curve?.byRank.get(rank);
  if (measured !== undefined) return { ctr: measured, source: "measured" };
  return { ctr: studyCtrAt(position), source: "study" };
}
