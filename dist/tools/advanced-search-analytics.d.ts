interface Filter {
    dimension: string;
    operator: string;
    expression: string;
}
interface AdvancedSearchResult {
    rows: Array<{
        keys: string[];
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    }>;
    totalRows: number;
    dimensions: string[];
    period: {
        startDate: string;
        endDate: string;
    };
    filtersApplied: Filter[];
}
export declare function advancedSearchAnalytics(days?: number, dimensions?: string[], filters?: Filter[], rowLimit?: number, orderBy?: string, orderDirection?: string, siteUrl?: string): Promise<AdvancedSearchResult>;
export {};
