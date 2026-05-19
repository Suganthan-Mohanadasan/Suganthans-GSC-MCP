interface ImageKeywordRow {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}
/**
 * Top image-search keywords for the site, sorted by impressions, clicks, or
 * position. Reuses fetchAllRows with type=image (added to analytics.ts in
 * v2.3). Default window is 90 days because image-search volume is generally
 * lower than web and a longer window surfaces more signal.
 */
export declare function imageKeywordOverview(days?: number, minImpressions?: number, rowLimit?: number, orderBy?: "impressions" | "clicks" | "position"): Promise<ImageKeywordRow[]>;
export {};
