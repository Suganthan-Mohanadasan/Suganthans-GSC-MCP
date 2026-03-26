interface SiteHealth {
    siteUrl: string;
    current: {
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    };
    change: {
        clicksPercent: number;
        impressionsPercent: number;
        ctr: number;
        position: number;
    };
    health: "healthy" | "warning" | "declining";
}
interface MultiSiteDashboardResult {
    periodDays: number;
    sites: SiteHealth[];
    summary: string;
}
export declare function multiSiteDashboard(siteUrls?: string[], days?: number): Promise<MultiSiteDashboardResult>;
export {};
