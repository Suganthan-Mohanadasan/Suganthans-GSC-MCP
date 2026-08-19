import { SearchType } from "../analytics.js";
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
export declare function ctrOpportunities(days?: number, minImpressions?: number, searchType?: SearchType, device?: string, country?: string): Promise<CtrOpportunity[]>;
export {};
