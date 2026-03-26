interface Recommendation {
    priority: number;
    action: "update" | "create" | "consolidate";
    targetPage?: string;
    targetKeyword?: string;
    secondaryPages?: string[];
    keywords?: string[];
    estimatedOpportunity: number;
    reasoning: string;
}
interface RecommendationResult {
    recommendations: Recommendation[];
    summary: {
        update: number;
        create: number;
        consolidate: number;
        totalOpportunity: number;
    };
}
export declare function contentRecommendations(days?: number, maxRecommendations?: number): Promise<RecommendationResult>;
export {};
