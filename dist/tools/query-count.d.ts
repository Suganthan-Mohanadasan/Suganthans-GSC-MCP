import { SearchType } from "../analytics.js";
/**
 * Query counting: how many distinct queries a property, a section or a single
 * URL is visible for - split by position group, optionally as a time series.
 *
 * The count GSC hands back is a FLOOR, not the truth: queries below Google's
 * privacy threshold never appear as rows, so their clicks land in the totals
 * but in no query row. That gap is reported explicitly instead of leaving the
 * query table to be mistaken for the complete keyword set.
 *
 * Time series buckets are fetched one request per bucket. That is deliberate:
 * the API de-duplicates queries within the requested range, so a per-bucket
 * request yields an exact distinct count without holding every query string
 * of every day in memory.
 */
export type Granularity = "none" | "day" | "week" | "month";
interface PositionGroupCount {
    group: string;
    queries: number;
    clicks: number;
    impressions: number;
    queryShare: number;
}
interface PageQueryCount {
    page: string;
    queries: number;
    clicks: number;
    impressions: number;
}
interface Bucket {
    startDate: string;
    endDate: string;
    visibleQueries: number;
    clicks: number;
    impressions: number;
}
interface QueryCountResult {
    period: {
        startDate: string;
        endDate: string;
        days: number;
    };
    scope: {
        url: string | null;
        urlContains: string | null;
        surface: SearchType;
        minPosition: number | null;
        maxPosition: number | null;
    };
    totals: {
        visibleQueries: number;
        clicksFromVisibleQueries: number;
        totalClicks: number;
        anonymizedClicks: number;
        anonymizedClicksShare: number;
    };
    filtered: {
        visibleQueries: number;
        clicks: number;
        impressions: number;
    } | null;
    byPositionGroup: PositionGroupCount[];
    timeSeries: Bucket[] | null;
    previousPeriod: {
        startDate: string;
        endDate: string;
        visibleQueries: number;
        change: number;
        changePercent: number;
    } | null;
    topPagesByQueryCount: PageQueryCount[] | null;
}
export declare function queryCount(days?: number, comparePrevious?: boolean, includePages?: boolean, topPages?: number, surface?: SearchType, url?: string, urlContains?: string, granularity?: Granularity, minPosition?: number, maxPosition?: number): Promise<QueryCountResult>;
export {};
