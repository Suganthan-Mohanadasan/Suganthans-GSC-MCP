interface ImagePageRow {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}
/**
 * Pages on the site ranked by image-search performance. Tells you which pages
 * are actually showing up in Google Images and which are not. Useful when
 * paired with image-keyword-overview to map "what queries are we ranking on"
 * back to "which pages carry that ranking".
 */
export declare function imagePagesOverview(days?: number, minImpressions?: number, rowLimit?: number, orderBy?: "impressions" | "clicks" | "position"): Promise<ImagePageRow[]>;
export {};
