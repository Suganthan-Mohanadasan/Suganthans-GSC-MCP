interface ImageQuickWin {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    opportunity: number;
}
/**
 * Image-search variant of the quick-wins tool. Surfaces queries that rank in
 * the image SERP at positions 4-15 with high impressions. Opportunity is the
 * estimated extra clicks if the query reached position 3, using the
 * image-search CTR baseline above.
 */
export declare function imageSearchQuickWins(days?: number, minImpressions?: number, maxPosition?: number): Promise<ImageQuickWin[]>;
export {};
