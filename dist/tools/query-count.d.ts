import { SearchType } from "../analytics.js";
/**
 * Query counting: how many distinct queries a site (and each page) is visible
 * for, split by position group.
 *
 * The number GSC hands back is a FLOOR, not the truth: queries below Google's
 * privacy threshold never appear as rows, so their clicks show up in the site
 * total but in no query row. We therefore also report that gap explicitly
 * instead of pretending the query table is complete.
 */
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
interface QueryCountResult {
    period: {
        startDate: string;
        endDate: string;
        days: number;
    };
    totals: {
        visibleQueries: number;
        clicksFromVisibleQueries: number;
        totalClicks: number;
        anonymizedClicks: number;
        anonymizedClicksShare: number;
    };
    byPositionGroup: PositionGroupCount[];
    previousPeriod: {
        startDate: string;
        endDate: string;
        visibleQueries: number;
        change: number;
        changePercent: number;
    } | null;
    topPagesByQueryCount: PageQueryCount[] | null;
}
export declare function queryCount(days?: number, comparePrevious?: boolean, includePages?: boolean, topPages?: number, searchType?: SearchType): Promise<QueryCountResult>;
export {};
