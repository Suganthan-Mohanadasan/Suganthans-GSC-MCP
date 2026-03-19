"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inspectUrl = inspectUrl;
const auth_js_1 = require("./auth.js");
async function inspectUrl(url) {
    const client = await (0, auth_js_1.getSearchConsoleClient)();
    const { siteUrl } = (0, auth_js_1.getConfig)();
    const response = await client.urlInspection.index.inspect({
        requestBody: {
            inspectionUrl: url,
            siteUrl,
        },
    });
    const result = response.data.inspectionResult;
    const indexStatus = result?.indexStatusResult;
    const mobileResult = result?.mobileUsabilityResult;
    const issues = [];
    if (indexStatus?.robotsTxtState === "DISALLOWED") {
        issues.push("Blocked by robots.txt");
    }
    if (indexStatus?.indexingState === "INDEXING_NOT_ALLOWED") {
        issues.push("Noindex tag detected");
    }
    if (indexStatus?.pageFetchState && indexStatus.pageFetchState !== "SUCCESSFUL") {
        issues.push(`Page fetch failed: ${indexStatus.pageFetchState}`);
    }
    const googleCanonical = indexStatus?.googleCanonical || null;
    const userCanonical = indexStatus?.userCanonical || null;
    if (googleCanonical && userCanonical && googleCanonical !== userCanonical) {
        issues.push(`Canonical mismatch: Google chose ${googleCanonical}, you declared ${userCanonical}`);
    }
    if (mobileResult?.verdict === "VERDICT_HAS_ISSUES") {
        const mobileIssues = mobileResult.issues || [];
        for (const issue of mobileIssues) {
            issues.push(`Mobile: ${issue.message || issue.issueType}`);
        }
    }
    return {
        indexed: indexStatus?.coverageState === "Submitted and indexed" ||
            indexStatus?.verdict === "PASS",
        indexingState: indexStatus?.coverageState || "Unknown",
        lastCrawlTime: indexStatus?.lastCrawlTime || null,
        crawlAllowed: indexStatus?.robotsTxtState !== "DISALLOWED",
        robotsTxtState: indexStatus?.robotsTxtState || "Unknown",
        indexingAllowed: indexStatus?.indexingState !== "INDEXING_NOT_ALLOWED",
        pageFetchState: indexStatus?.pageFetchState || "Unknown",
        googleCanonical,
        userCanonical,
        canonicalMatch: googleCanonical === userCanonical || (!googleCanonical && !userCanonical),
        mobileUsability: mobileResult?.verdict || "Unknown",
        verdict: indexStatus?.verdict || "Unknown",
        issues,
    };
}
