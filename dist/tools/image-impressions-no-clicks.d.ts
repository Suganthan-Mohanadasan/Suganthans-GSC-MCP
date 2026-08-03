interface NoClickRow {
    query: string;
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
}
/**
 * Surfaces query+page pairs that earn meaningful image-search impressions but
 * effectively no clicks. This is the textbook "thumbnail is not converting"
 * pattern: the image is in the SERP but the crop, alt text mismatch, or page
 * authority relative to competitors keeps users from clicking.
 *
 * Defaults are tuned for image search, which runs at much higher impression
 * volumes per page than web search.
 */
export declare function imageImpressionsNoClicks(days?: number, minImpressions?: number, maxClicks?: number, rowLimit?: number): Promise<NoClickRow[]>;
export {};
