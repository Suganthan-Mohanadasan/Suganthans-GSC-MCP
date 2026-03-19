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
}
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
export declare function fetchAllRows(params: QueryParams): Promise<SearchAnalyticsRow[]>;
