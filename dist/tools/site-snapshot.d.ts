interface SiteSnapshot {
    period: {
        startDate: string;
        endDate: string;
    };
    current: {
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    };
    prior: {
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    };
    change: {
        clicks: number;
        clicksPercent: number;
        impressions: number;
        impressionsPercent: number;
        ctr: number;
        position: number;
    };
}
export declare function siteSnapshot(days?: number): Promise<SiteSnapshot>;
export {};
