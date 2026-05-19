interface ComparisonRow {
    query: string;
    webClicks: number;
    webImpressions: number;
    webCtr: number;
    webPosition: number | null;
    imageClicks: number;
    imageImpressions: number;
    imageCtr: number;
    imagePosition: number | null;
    imageVsWebImpressionsRatio: number;
}
/**
 * For each query, returns side-by-side performance across the web and image
 * search surfaces. Two API calls (type=web, type=image), joined on query.
 *
 * The `imageVsWebImpressionsRatio` field surfaces queries where image search
 * carries a disproportionate share of impressions vs web search; on
 * image-heavy sites this ratio can exceed 1 across most of the catalogue.
 * `-1` indicates the query has image impressions but zero web impressions.
 */
export declare function compareWebVsImage(days?: number, minCombinedImpressions?: number, rowLimit?: number): Promise<ComparisonRow[]>;
export {};
