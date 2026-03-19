interface QuickWin {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    opportunity: number;
}
export declare function quickWins(days?: number, minImpressions?: number, maxPosition?: number): Promise<QuickWin[]>;
export {};
