interface VerificationResult {
    claim: string;
    metric: string;
    url?: string;
    query?: string;
    expected_value: number;
    actual_value: number | null;
    period: {
        startDate: string;
        endDate: string;
    };
    verified: boolean;
    discrepancy: string | null;
}
/**
 * Verify a specific numeric claim against live GSC data.
 * Use this to self-check before presenting findings to the user.
 */
export declare function verifyClaim(claim: string, metric: "clicks" | "impressions" | "ctr" | "position", expectedValue: number, url?: string, query?: string, days?: number): Promise<VerificationResult>;
export {};
