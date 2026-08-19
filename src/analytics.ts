import { getSearchConsoleClient, getConfig } from "./auth.js";

/**
 * GSC search types. The API defaults to "web" when type is omitted, which is
 * why every legacy tool only ever sees web data. Set this explicitly to query
 * Discover, Image, Video or News surfaces in isolation.
 */
export type SearchType = "web" | "image" | "video" | "news" | "discover" | "googleNews";

/**
 * Dimensions the API actually allows per surface. Used for a friendly guard so
 * an invalid combination fails with a clear message instead of an opaque 400.
 * (searchAppearance is special: it must be the ONLY grouping dimension.)
 */
export const ALLOWED_DIMENSIONS: Record<SearchType, string[]> = {
  web: ["query", "page", "country", "device", "date", "searchAppearance"],
  image: ["query", "page", "country", "device", "date", "searchAppearance"],
  video: ["query", "page", "country", "device", "date", "searchAppearance"],
  news: ["query", "page", "country", "device", "date"],
  // Discover is not query-based: no "query", no "device".
  discover: ["page", "country", "date", "searchAppearance"],
  googleNews: ["page", "country", "date"],
};

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
  /** Surface to query. Omit for "web" (the API default). */
  searchType?: SearchType;
  dimensionFilterGroups?: Array<{
    filters: Array<{
      dimension: string;
      operator: string;
      expression: string;
    }>;
  }>;
  rowLimit?: number;
  /** Hard cap on rows fetched across all pages. Omit for no cap. */
  maxRows?: number;
}

/**
 * Validates that the requested dimensions are legal for the chosen surface.
 * Throws a descriptive error instead of letting the API return a generic 400.
 */
export function assertValidDimensions(searchType: SearchType, dimensions: string[]): void {
  const allowed = ALLOWED_DIMENSIONS[searchType];
  const invalid = dimensions.filter((d) => !allowed.includes(d));
  if (invalid.length > 0) {
    throw new Error(
      `Dimension(s) [${invalid.join(", ")}] are not supported for searchType "${searchType}". ` +
        `Allowed: [${allowed.join(", ")}].`
    );
  }
  if (dimensions.includes("searchAppearance") && dimensions.length > 1) {
    throw new Error(
      `"searchAppearance" must be the only grouping dimension. ` +
        `To break a single appearance down by page/query, filter on searchAppearance instead.`
    );
  }
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
        type: params.searchType, // undefined => API default "web"
        dimensionFilterGroups: params.dimensionFilterGroups,
        rowLimit: pageSize,
        startRow,
        dataState: "all",
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
    if (params.maxRows && allRows.length >= params.maxRows) break;
    startRow += pageSize;
  }

  return params.maxRows ? allRows.slice(0, params.maxRows) : allRows;
}
