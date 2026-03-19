export interface InspectionResult {
    indexed: boolean;
    indexingState: string;
    lastCrawlTime: string | null;
    crawlAllowed: boolean;
    robotsTxtState: string;
    indexingAllowed: boolean;
    pageFetchState: string;
    googleCanonical: string | null;
    userCanonical: string | null;
    canonicalMatch: boolean;
    mobileUsability: string;
    verdict: string;
    issues: string[];
}
export declare function inspectUrl(url: string): Promise<InspectionResult>;
