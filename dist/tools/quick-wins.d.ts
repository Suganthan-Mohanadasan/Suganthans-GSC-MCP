import { SearchType } from "../analytics.js";
interface QuickWin {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    opportunity: number;
}
export declare function quickWins(days?: number, minImpressions?: number, maxPosition?: number, searchType?: SearchType, device?: string, country?: string): Promise<QuickWin[]>;
export {};
