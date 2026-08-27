import { getSearchConsoleClient, getConfig } from "./auth.js";

/**
 * GSC search types, i.e. the values the Search Analytics `type` filter takes.
 * The API defaults to "web" when the field is omitted.
 */
export type SearchType = "web" | "image" | "video" | "news" | "discover" | "googleNews";

/**
 * Dimensions the API actually allows per search type. Used by
 * assertValidDimensions() so an illegal combination fails with a clear message
 * instead of the API's opaque 400.
 *
 * searchAppearance is listed here but is special: the API requires it to be the
 * only grouping dimension, which the guard checks separately.
 */
export const ALLOWED_DIMENSIONS: Record<SearchType, string[]> = {
  web: ["query", "page", "country", "device", "date", "searchAppearance"],
  image: ["query", "page", "country", "device", "date", "searchAppearance"],
  video: ["query", "page", "country", "device", "date", "searchAppearance"],
  news: ["query", "page", "country", "device", "date"],
  // Discover is feed-based, not query-based: no "query", and no "device" either.
  discover: ["page", "country", "date", "searchAppearance"],
  googleNews: ["page", "country", "date"],
};

/**
 * Validates that the requested dimensions are legal for the chosen search type.
 * Throws a descriptive error instead of letting the API return a generic 400
 * that names neither the offending dimension nor the allowed set.
 */
export function assertValidDimensions(searchType: SearchType, dimensions: string[]): void {
  const allowed = ALLOWED_DIMENSIONS[searchType];
  const invalid = dimensions.filter((d) => !allowed.includes(d));
  if (invalid.length > 0) {
    throw new Error(
      `Dimension(s) [${invalid.join(", ")}] are not supported for type "${searchType}". ` +
        `Allowed: [${allowed.join(", ")}].`
    );
  }
  if (dimensions.includes("searchAppearance") && dimensions.length > 1) {
    throw new Error(
      `"searchAppearance" must be the only grouping dimension. ` +
        `To break a single appearance down by page or query, filter on searchAppearance instead.`
    );
  }
}

export const DEVICES = ["MOBILE", "DESKTOP", "TABLET"] as const;
export type Device = (typeof DEVICES)[number];

/**
 * Builds the device and country dimension filters shared by the analysis tools.
 * Both are opt-in: omitting them keeps the API default of all devices and all
 * countries, so existing callers are unaffected.
 *
 * Discover carries no device dimension (see ALLOWED_DIMENSIONS), so filtering
 * by device there is impossible rather than merely empty. That fails loudly.
 */
export function deviceCountryFilters(
  device?: string,
  country?: string,
  searchType: SearchType = "web"
): Array<{ dimension: string; operator: string; expression: string }> {
  const filters: Array<{ dimension: string; operator: string; expression: string }> = [];

  if (device) {
    if (!ALLOWED_DIMENSIONS[searchType].includes("device")) {
      throw new Error(
        `type "${searchType}" has no device dimension, so it cannot be filtered by device. ` +
          `Allowed dimensions: [${ALLOWED_DIMENSIONS[searchType].join(", ")}].`
      );
    }
    const upper = device.toUpperCase() as Device;
    if (!DEVICES.includes(upper)) {
      throw new Error(`Unknown device "${device}". Allowed: ${DEVICES.join(", ")}.`);
    }
    filters.push({ dimension: "device", operator: "equals", expression: upper });
  }

  if (country) {
    const lower = country.toLowerCase();
    if (!/^[a-z]{3}$/.test(lower)) {
      throw new Error(
        `Country must be an ISO-3166-1 alpha-3 code such as deu, aut, che or usa - got "${country}".`
      );
    }
    filters.push({ dimension: "country", operator: "equals", expression: lower });
  }

  return filters;
}

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
  type?: SearchType;
  /** Hard cap on rows fetched across all pages. Omit for no cap. */
  maxRows?: number;
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
    if (params.maxRows && allRows.length >= params.maxRows) break;
    startRow += pageSize;
  }

  return params.maxRows ? allRows.slice(0, params.maxRows) : allRows;
}
