interface ReportResult {
    filePath: string;
    sectionsIncluded: string[];
    summary: string;
}
export declare function generateReport(outputPath?: string, days?: number, includeSections?: string[]): Promise<ReportResult>;
export {};
