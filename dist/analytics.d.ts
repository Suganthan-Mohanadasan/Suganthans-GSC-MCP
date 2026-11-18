export interface SearchAnalyticsRow {
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}
export interface DimensionFilter {
    dimension: string;
    operator: string;
    expression: string;
}
export interface DimensionFilterList {
    dimension: string;
    expressions: string[];
}
export type SearchType = "web" | "image" | "video" | "news" | "discover" | "googleNews" | "webMultimodal";
export declare const BRANDED_DATA_START = "2026-02-21";
export interface QueryParams {
    startDate: string;
    endDate: string;
    dimensions: string[];
    dimensionFilterGroups?: Array<{
        filters?: DimensionFilter[];
        filterLists?: DimensionFilterList[];
    }>;
    rowLimit?: number;
    type?: SearchType;
}
/**
 * Builds the single AND filter group the API supports from single-value
 * filters and multi-value filter lists. Country codes are lower-cased and
 * device names upper-cased in filter lists, which is the form the API matches.
 */
export declare function buildFilterGroups(filters?: DimensionFilter[], filterLists?: DimensionFilterList[]): QueryParams["dimensionFilterGroups"];
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
