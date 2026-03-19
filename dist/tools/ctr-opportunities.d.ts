interface CtrOpportunity {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    expectedCtr: number;
    ctrGap: number;
    potentialExtraClicks: number;
}
export declare function ctrOpportunities(days?: number, minImpressions?: number): Promise<CtrOpportunity[]>;
export {};
