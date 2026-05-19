interface DecayingImagePage {
    page: string;
    period1Clicks: number;
    period2Clicks: number;
    period3Clicks: number;
    totalClickLoss: number;
    period1Impressions: number;
    period2Impressions: number;
    period3Impressions: number;
    period1Position: number;
    period2Position: number;
    period3Position: number;
    positionTrend: string;
}
/**
 * Image-search version of content-decay. Three 30-day windows running
 * back from yesterday. Pages with a consistent decline across all three
 * periods (clicks p3 > p2 > p1) are flagged, sorted by total click loss.
 *
 * Default minimum p3 clicks is lower than the web equivalent because image
 * search produces lower click volumes overall.
 */
export declare function imageContentDecay(minPeriod3Clicks?: number): Promise<DecayingImagePage[]>;
export {};
