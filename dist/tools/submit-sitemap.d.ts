interface SitemapSubmitResult {
    siteUrl: string;
    sitemapUrl: string;
    success: boolean;
    error: string | null;
}
interface SitemapListResult {
    siteUrl: string;
    sitemaps: Array<{
        path: string;
        lastSubmitted: string | null;
        isPending: boolean;
        lastDownloaded: string | null;
        warnings: number;
        errors: number;
        contents: Array<{
            type: string;
            submitted: number;
            indexed: number;
        }>;
    }>;
}
export declare function submitSitemap(sitemapUrl?: string): Promise<SitemapSubmitResult>;
export declare function listSitemaps(): Promise<SitemapListResult>;
export {};
