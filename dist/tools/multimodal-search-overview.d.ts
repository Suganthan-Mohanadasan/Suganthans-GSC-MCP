import { DimensionFilterList } from "../analytics.js";
interface Totals {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}
interface KeyedRow extends Totals {
    key: string;
}
interface MultimodalResult {
    hasData: boolean;
    note: string;
    period: {
        startDate: string;
        endDate: string;
    };
    priorPeriod: {
        startDate: string;
        endDate: string;
    };
    filterListsApplied: DimensionFilterList[];
    multimodal: Totals;
    multimodalPrior: Totals;
    clicksChangePct: number | null;
    impressionsChangePct: number | null;
    web: Totals;
    multimodalVsWebImpressionsPct: number;
    multimodalVsWebClicksPct: number;
    topPages: KeyedRow[];
    byCountry: KeyedRow[];
    byDevice: KeyedRow[];
    trend: Array<{
        date: string;
        clicks: number;
        impressions: number;
    }>;
}
/**
 * Performance in multimodal search: Google Lens, Circle to Search on Android
 * and image uploads in Google Search (`type=webMultimodal`, in the Search
 * Analytics API since November 2026).
 *
 * Google does not expose queries for this surface. Grouping or filtering by
 * query or brandedClassification is rejected with a 400, so the breakdowns
 * here are page, country, device and date.
 */
export declare function multimodalSearchOverview(days?: number, rowLimit?: number, filterLists?: DimensionFilterList[], siteUrl?: string): Promise<MultimodalResult>;
export {};
