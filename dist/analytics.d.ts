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
export declare const ALLOWED_DIMENSIONS: Record<SearchType, string[]>;
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
export declare function assertValidDimensions(searchType: SearchType, dimensions: string[]): void;
/** Devices as the API spells them in dimension filters. */
export declare const DEVICES: readonly ["MOBILE", "DESKTOP", "TABLET"];
export type Device = (typeof DEVICES)[number];
/**
 * Dimension filters for device and country.
 *
 * Both are optional, and unset means unfiltered - every tool keeps returning
 * all devices and all countries unless asked otherwise.
 *
 * Discover has no device dimension (see ALLOWED_DIMENSIONS), so filtering by
 * device there is impossible rather than merely empty. That fails loudly.
 */
export declare function deviceCountryFilters(device?: string, country?: string, searchType?: SearchType): Array<{
    dimension: string;
    operator: string;
    expression: string;
}>;
export declare function getDateRange(days: number): {
    startDate: string;
    endDate: string;
};
export declare function getPriorDateRange(days: number): {
    startDate: string;
    endDate: string;
};
/**
 * Fetches all rows from the Search Analytics API with automatic pagination.
 * Uses dataState: 'all' so data matches the GSC dashboard exactly.
 */
export declare function fetchAllRows(params: QueryParams, siteUrlOverride?: string): Promise<SearchAnalyticsRow[]>;
