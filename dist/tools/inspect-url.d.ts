interface InspectionSummary {
    url: string;
    indexed: boolean;
    indexingState: string;
    lastCrawlTime: string | null;
    crawlAllowed: boolean;
    indexingAllowed: boolean;
    pageFetchState: string;
    googleCanonical: string | null;
    userCanonical: string | null;
    canonicalMatch: boolean;
    mobileUsability: string;
    issues: string[];
    summary: string;
}
export declare function inspectUrlTool(url: string): Promise<InspectionSummary>;
export {};
