import { DimensionFilterList, SearchType } from "../analytics.js";
type BrandedSearchType = Exclude<SearchType, "webMultimodal">;
interface Totals {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}
interface ClassSummary extends Totals {
    clickShare: number;
    impressionShare: number;
    prior: Totals | null;
    clicksChangePct: number | null;
    impressionsChangePct: number | null;
}
interface TopRow extends Totals {
    key: string;
}
interface BrandedResult {
    eligible: boolean;
    note?: string;
    searchType: string;
    period: {
        startDate: string;
        endDate: string;
    };
    priorPeriod: {
        startDate: string;
        endDate: string;
    } | null;
    filterListsApplied: DimensionFilterList[];
    branded: ClassSummary | null;
    nonBranded: ClassSummary | null;
    trend: Array<{
        date: string;
        brandedClicks: number;
        brandedImpressions: number;
        nonBrandedClicks: number;
        nonBrandedImpressions: number;
    }>;
    topBrandedQueries: TopRow[];
    topNonBrandedQueries: TopRow[];
    topBrandedPages: TopRow[];
    topNonBrandedPages: TopRow[];
}
/**
 * Branded vs non-branded performance, using Google's own classification
 * (`brandedClassification`, in the Search Analytics API since November 2026).
 *
 * Google only classifies top-level properties with enough query volume, and
 * only from 2026-02-21. An ineligible property gets an empty response rather
 * than an error, which is reported here as `eligible: false`.
 */
export declare function brandedVsNonBranded(days?: number, rowLimit?: number, filterLists?: DimensionFilterList[], includeTrend?: boolean, siteUrl?: string, searchType?: BrandedSearchType): Promise<BrandedResult>;
export {};
