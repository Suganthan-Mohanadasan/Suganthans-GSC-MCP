interface SubmitResult {
    url: string;
    type: string;
    notifyTime: string | null;
    success: boolean;
    error: string | null;
    note: string;
}
export declare function submitUrl(url: string, action?: "URL_UPDATED" | "URL_DELETED"): Promise<SubmitResult>;
export declare function submitBatch(urls: string[], action?: "URL_UPDATED" | "URL_DELETED"): Promise<{
    results: SubmitResult[];
    summary: {
        total: number;
        succeeded: number;
        failed: number;
        note: string;
    };
}>;
export {};
