interface TrendRow {
    query: string;
    currentClicks: number;
    priorClicks: number;
    currentImpressions: number;
    priorImpressions: number;
    impressionsDelta: number;
    currentPosition: number;
    priorPosition: number;
    positionDelta: number;
}
/**
 * Two equal-length windows of image-search data joined on query. Reports
 * impression and position deltas so you can spot which image-search queries
 * are gaining or losing visibility. Negative position delta means the query
 * improved its average rank (smaller position number = better rank).
 */
export declare function imageKeywordTrends(days?: number, minCombinedImpressions?: number, rowLimit?: number, orderBy?: "impressions_delta" | "position_delta"): Promise<TrendRow[]>;
export {};
