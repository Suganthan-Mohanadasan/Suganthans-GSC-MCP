import { SearchType } from "../analytics.js";
interface DecayingPage {
    page: string;
    period1Clicks: number;
    period2Clicks: number;
    period3Clicks: number;
    totalClickLoss: number;
    period1Position: number;
    period2Position: number;
    period3Position: number;
    positionTrend: string;
}
export declare function contentDecay(searchType?: SearchType, device?: string, country?: string): Promise<DecayingPage[]>;
export {};
