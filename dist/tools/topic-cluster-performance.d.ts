interface ClusterPerformance {
    pathPattern: string;
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
    pageCount: number;
    topPages: Array<{
        page: string;
        clicks: number;
        impressions: number;
        position: number;
    }>;
    topQueries: Array<{
        query: string;
        clicks: number;
        impressions: number;
        position: number;
    }>;
}
export declare function topicClusterPerformance(pathPattern: string, days?: number): Promise<ClusterPerformance>;
export {};
