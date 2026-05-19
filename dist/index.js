#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const guardrails_js_1 = require("./guardrails.js");
const quick_wins_js_1 = require("./tools/quick-wins.js");
const ctr_opportunities_js_1 = require("./tools/ctr-opportunities.js");
const traffic_drops_js_1 = require("./tools/traffic-drops.js");
const content_gaps_js_1 = require("./tools/content-gaps.js");
const site_snapshot_js_1 = require("./tools/site-snapshot.js");
const inspect_url_js_1 = require("./tools/inspect-url.js");
const cannibalization_check_js_1 = require("./tools/cannibalization-check.js");
const content_decay_js_1 = require("./tools/content-decay.js");
const topic_cluster_performance_js_1 = require("./tools/topic-cluster-performance.js");
const ctr_vs_benchmark_js_1 = require("./tools/ctr-vs-benchmark.js");
const verify_claim_js_1 = require("./tools/verify-claim.js");
const advanced_search_analytics_js_1 = require("./tools/advanced-search-analytics.js");
const check_alerts_js_1 = require("./tools/check-alerts.js");
const content_recommendations_js_1 = require("./tools/content-recommendations.js");
const generate_report_js_1 = require("./tools/generate-report.js");
const multi_site_dashboard_js_1 = require("./tools/multi-site-dashboard.js");
const submit_url_js_1 = require("./tools/submit-url.js");
const submit_sitemap_js_1 = require("./tools/submit-sitemap.js");
// v2.3 image SEO tools — paired with the Image SEO post on suganthan.com.
const image_keyword_overview_js_1 = require("./tools/image-keyword-overview.js");
const image_search_quick_wins_js_1 = require("./tools/image-search-quick-wins.js");
const compare_web_vs_image_js_1 = require("./tools/compare-web-vs-image.js");
const image_pages_overview_js_1 = require("./tools/image-pages-overview.js");
const image_keyword_trends_js_1 = require("./tools/image-keyword-trends.js");
const image_impressions_no_clicks_js_1 = require("./tools/image-impressions-no-clicks.js");
const image_content_decay_js_1 = require("./tools/image-content-decay.js");
const server = new mcp_js_1.McpServer({
    name: "gsc-mcp",
    version: "2.3.0",
});
// 1. Quick Wins
server.tool("quick_wins", "Find keywords you're almost ranking for that could be pushed to page one. Returns queries at positions 4-15 with high impressions, sorted by traffic opportunity." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(100).describe("Minimum impressions threshold"),
    max_position: zod_1.z.number().default(15).describe("Maximum position to include"),
}, async ({ days, min_impressions, max_position }) => {
    const results = await (0, quick_wins_js_1.quickWins)(days, min_impressions, max_position);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "quick_wins", { days, min_impressions, max_position });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 2. CTR Opportunities
server.tool("ctr_opportunities", "Find pages with high impressions but CTR significantly below expected for their position. These are title/meta description optimisation candidates." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(500).describe("Minimum impressions threshold"),
}, async ({ days, min_impressions }) => {
    const results = await (0, ctr_opportunities_js_1.ctrOpportunities)(days, min_impressions);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "ctr_opportunities", { days, min_impressions });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 3. Traffic Drops
server.tool("traffic_drops", "Find pages that lost the most traffic recently. Compares current period vs prior period and diagnoses whether each drop is a ranking loss, CTR collapse, or demand decline." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days per period to compare"),
}, async ({ days }) => {
    const results = await (0, traffic_drops_js_1.trafficDrops)(days);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "traffic_drops", { days });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 4. Content Gaps
server.tool("content_gaps", "Find topics you should create content for. Returns queries where you get impressions but rank beyond position 20, meaning there is search demand but no real content targeting it." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(90).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(50).describe("Minimum impressions threshold"),
    min_position: zod_1.z.number().default(20).describe("Minimum position (queries ranking worse than this)"),
}, async ({ days, min_impressions, min_position }) => {
    const results = await (0, content_gaps_js_1.contentGaps)(days, min_impressions, min_position);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "content_gaps", { days, min_impressions, min_position });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 5. Site Snapshot
server.tool("site_snapshot", "Get a quick overview of how the site is performing. Returns total clicks, impressions, CTR, and position with a comparison to the prior period." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days per period"),
}, async ({ days }) => {
    const results = await (0, site_snapshot_js_1.siteSnapshot)(days);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "site_snapshot", { days });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 6. Inspect URL
server.tool("inspect_url", "Check if a URL is indexed and why or why not. Returns indexing status, last crawl date, canonical info, robots/noindex issues, and mobile usability in one answer." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    url: zod_1.z.string().describe("The full URL to inspect"),
}, async ({ url }) => {
    const results = await (0, inspect_url_js_1.inspectUrlTool)(url);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "inspect_url", { url });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 7. Cannibalization Check
server.tool("cannibalization_check", "Find keywords where multiple pages from your site compete against each other. Shows which page ranks higher, the position gap, and combined impressions being split." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(50).describe("Minimum combined impressions for a query"),
}, async ({ days, min_impressions }) => {
    const results = await (0, cannibalization_check_js_1.cannibalizationCheck)(days, min_impressions);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "cannibalization_check", { days, min_impressions });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 8. Content Decay
server.tool("content_decay", "Find pages that are slowly dying with consistent traffic decline over three consecutive 30-day periods. One bad month is noise; three consecutive bad months is a problem." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {}, async () => {
    const results = await (0, content_decay_js_1.contentDecay)();
    const wrapped = (0, guardrails_js_1.withMeta)(results, "content_decay", {});
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 9. Topic Cluster Performance
server.tool("topic_cluster_performance", "See how a group of pages performs as a whole. Aggregates clicks, impressions, CTR, and position for all pages matching a URL path pattern, plus top 5 pages and queries." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    path_pattern: zod_1.z.string().describe("URL path pattern to match (e.g. /blog/seo)"),
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
}, async ({ path_pattern, days }) => {
    const results = await (0, topic_cluster_performance_js_1.topicClusterPerformance)(path_pattern, days);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "topic_cluster_performance", { path_pattern, days });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 10. CTR vs Benchmark
server.tool("ctr_vs_benchmark", "Compare your actual CTR per page against industry benchmarks by position. Flags pages significantly underperforming for their ranking position." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(200).describe("Minimum impressions threshold"),
}, async ({ days, min_impressions }) => {
    const results = await (0, ctr_vs_benchmark_js_1.ctrVsBenchmark)(days, min_impressions);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "ctr_vs_benchmark", { days, min_impressions });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 11. Verify Claim
server.tool("verify_claim", "Verify a specific numeric claim against live GSC data. Use this to self-check your analysis before presenting findings. Pass the claim text, the metric to check, the expected value, and optionally a URL or query to filter by. Returns whether the claim is verified and any discrepancy found.", {
    claim: zod_1.z.string().describe("The claim to verify, e.g. 'Homepage gets 500 clicks per month'"),
    metric: zod_1.z.enum(["clicks", "impressions", "ctr", "position"]).describe("Which metric to check"),
    expected_value: zod_1.z.number().describe("The numeric value you claimed"),
    url: zod_1.z.string().optional().describe("Filter to a specific URL"),
    query: zod_1.z.string().optional().describe("Filter to a specific search query"),
    days: zod_1.z.number().default(28).describe("Number of days to check"),
}, async ({ claim, metric, expected_value, url, query, days }) => {
    const results = await (0, verify_claim_js_1.verifyClaim)(claim, metric, expected_value, url, query, days);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 12. Advanced Search Analytics
server.tool("advanced_search_analytics", "Run a custom search analytics query with flexible dimensions and filters. Supports country, device, query, and page filtering, plus search type (web/image/video/news/discover/googleNews). For power users who need specific data cuts." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    dimensions: zod_1.z.array(zod_1.z.string()).default(["query"]).describe("Dimensions to group by: query, page, country, device, date"),
    filters: zod_1.z.array(zod_1.z.object({
        dimension: zod_1.z.string().describe("Dimension to filter: query, page, country, device"),
        operator: zod_1.z.string().describe("Operator: contains, notContains, equals, notEquals, includingRegex, excludingRegex"),
        expression: zod_1.z.string().describe("Filter value"),
    })).default([]).describe("Dimension filters to apply"),
    row_limit: zod_1.z.number().default(100).describe("Maximum rows to return (max 500)"),
    order_by: zod_1.z.string().default("clicks").describe("Sort by: clicks, impressions, ctr, position"),
    order_direction: zod_1.z.string().default("descending").describe("Sort direction: ascending, descending"),
    site_url: zod_1.z.string().optional().describe("Override the default site URL"),
    search_type: zod_1.z.enum(["web", "image", "video", "news", "discover", "googleNews"]).optional().describe("Filter by GSC search surface. Defaults to web. Use 'image' to query Google Images data."),
}, async ({ days, dimensions, filters, row_limit, order_by, order_direction, site_url, search_type }) => {
    const results = await (0, advanced_search_analytics_js_1.advancedSearchAnalytics)(days, dimensions, filters, row_limit, order_by, order_direction, site_url, search_type);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "advanced_search_analytics", { days, dimensions, filters, row_limit, order_by, search_type });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 13. Check Alerts
server.tool("check_alerts", "Check for SEO alerts: position drops, CTR collapses, click losses, and pages that disappeared from search results. Returns severity-rated alerts so you know what needs attention first." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(7).describe("Number of days per period to compare"),
    position_drop_threshold: zod_1.z.number().default(20).describe("Alert if position drops more than this many spots"),
    ctr_drop_threshold: zod_1.z.number().default(50).describe("Alert if CTR drops more than this percentage"),
    click_drop_threshold: zod_1.z.number().default(30).describe("Alert if clicks drop more than this percentage"),
}, async ({ days, position_drop_threshold, ctr_drop_threshold, click_drop_threshold }) => {
    const results = await (0, check_alerts_js_1.checkAlerts)(days, position_drop_threshold, ctr_drop_threshold, click_drop_threshold);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "check_alerts", { days, position_drop_threshold, ctr_drop_threshold, click_drop_threshold });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 14. Content Recommendations
server.tool("content_recommendations", "Get actionable content recommendations by cross-referencing quick wins, content gaps, and cannibalisation data. Returns prioritised actions: pages to update, content to create, and pages to consolidate." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    max_recommendations: zod_1.z.number().default(10).describe("Maximum number of recommendations"),
}, async ({ days, max_recommendations }) => {
    const results = await (0, content_recommendations_js_1.contentRecommendations)(days, max_recommendations);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "content_recommendations", { days, max_recommendations });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 15. Generate Report
server.tool("generate_report", "Generate a comprehensive markdown performance report. Covers site snapshot, alerts, quick wins, traffic drops, content decay, and recommendations. Saves to disk for weekly reviews or scheduled reporting." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    output_path: zod_1.z.string().optional().describe("File path to save the report (default: ./gsc-report-{date}.md)"),
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    include_sections: zod_1.z.array(zod_1.z.string()).optional().describe("Sections: snapshot, alerts, quick_wins, traffic_drops, content_decay, recommendations"),
}, async ({ output_path, days, include_sections }) => {
    const results = await (0, generate_report_js_1.generateReport)(output_path, days, include_sections);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 16. Multi-Site Dashboard
server.tool("multi_site_dashboard", "Health check across multiple GSC properties in one view. Shows clicks, impressions, CTR, and position for each site with period comparison and health status. Agency essential." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    site_urls: zod_1.z.array(zod_1.z.string()).optional().describe("Array of GSC property URLs. Falls back to GSC_SITE_URLS env var."),
    days: zod_1.z.number().default(28).describe("Number of days per period"),
}, async ({ site_urls, days }) => {
    const results = await (0, multi_site_dashboard_js_1.multiSiteDashboard)(site_urls, days);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "multi_site_dashboard", { site_urls, days });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 17. Submit URL for Indexing
server.tool("submit_url", "Submit a URL to Google's Indexing API to request crawling and indexing. Works for notifying Google of new or updated content. Note: Google officially supports this for JobPosting/BroadcastEvent schema but processes all page types." + guardrails_js_1.GUARDRAIL_SUFFIX, {
    url: zod_1.z.string().describe("The full URL to submit for indexing"),
    action: zod_1.z.enum(["URL_UPDATED", "URL_DELETED"]).default("URL_UPDATED").describe("URL_UPDATED for new/changed content, URL_DELETED for removed pages"),
}, async ({ url, action }) => {
    const results = await (0, submit_url_js_1.submitUrl)(url, action);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 18. Batch Submit URLs
server.tool("submit_batch", "Submit up to 200 URLs to Google's Indexing API in one go. Daily quota is 200 URL notifications. Use for bulk indexing requests after publishing multiple pages or a site-wide update." + guardrails_js_1.GUARDRAIL_SUFFIX, {
    urls: zod_1.z.array(zod_1.z.string()).describe("Array of URLs to submit (max 200)"),
    action: zod_1.z.enum(["URL_UPDATED", "URL_DELETED"]).default("URL_UPDATED").describe("URL_UPDATED for new/changed content, URL_DELETED for removed pages"),
}, async ({ urls, action }) => {
    const results = await (0, submit_url_js_1.submitBatch)(urls, action);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 19. Submit Sitemap
server.tool("submit_sitemap", "Notify Google of a new or updated sitemap. Triggers Google to recrawl the sitemap and discover new pages." + guardrails_js_1.GUARDRAIL_SUFFIX, {
    sitemap_url: zod_1.z.string().optional().describe("Full sitemap URL (defaults to {site_url}/sitemap.xml)"),
}, async ({ sitemap_url }) => {
    const results = await (0, submit_sitemap_js_1.submitSitemap)(sitemap_url);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 20. List Sitemaps
server.tool("list_sitemaps", "List all sitemaps submitted for the site, with status, errors, warnings, and indexed page counts." + guardrails_js_1.GUARDRAIL_SUFFIX, {}, async () => {
    const results = await (0, submit_sitemap_js_1.listSitemaps)();
    const wrapped = (0, guardrails_js_1.withMeta)(results, "list_sitemaps", {});
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// ---------------------------------------------------------------------------
// v2.3 IMAGE SEO TOOLS
//
// These tools all pass type=image to the GSC Search Analytics API, which most
// third-party tools never expose. Paired with the Image SEO technical guide
// on suganthan.com (link in README). All 7 reuse the existing fetchAllRows
// plumbing; the only meaningfully new logic is the join in compare_web_vs_image.
// ---------------------------------------------------------------------------
// 21. Image Keyword Overview
server.tool("image_keyword_overview", "Top image-search keywords for the site, sorted by impressions, clicks, or position. Filtered to type=image so it returns only what surfaces in Google Images, not web search." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(90).describe("Number of days to analyse (image search is lower volume, default 90)"),
    min_impressions: zod_1.z.number().default(50).describe("Minimum impressions threshold"),
    row_limit: zod_1.z.number().default(50).describe("Maximum rows to return"),
    order_by: zod_1.z.enum(["impressions", "clicks", "position"]).default("impressions").describe("Sort field"),
}, async ({ days, min_impressions, row_limit, order_by }) => {
    const results = await (0, image_keyword_overview_js_1.imageKeywordOverview)(days, min_impressions, row_limit, order_by);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "image_keyword_overview", { days, min_impressions, row_limit, order_by });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 22. Image Search Quick Wins
server.tool("image_search_quick_wins", "Find image-search queries ranking at positions 4-15 with high impressions, sorted by estimated traffic gain if they reach position 3. Uses an image-search CTR baseline calibrated to the lower CTRs typical of Google Images." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(90).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(500).describe("Minimum impressions threshold"),
    max_position: zod_1.z.number().default(15).describe("Maximum position to include"),
}, async ({ days, min_impressions, max_position }) => {
    const results = await (0, image_search_quick_wins_js_1.imageSearchQuickWins)(days, min_impressions, max_position);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "image_search_quick_wins", { days, min_impressions, max_position });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 23. Compare Web vs Image
server.tool("compare_web_vs_image", "For each query, returns side-by-side performance across web and image search. Two GSC API calls joined on query, with an impressions ratio that surfaces where image search carries disproportionate volume relative to web." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(90).describe("Number of days to analyse"),
    min_combined_impressions: zod_1.z.number().default(100).describe("Minimum combined (web + image) impressions to include the query"),
    row_limit: zod_1.z.number().default(50).describe("Maximum rows to return"),
}, async ({ days, min_combined_impressions, row_limit }) => {
    const results = await (0, compare_web_vs_image_js_1.compareWebVsImage)(days, min_combined_impressions, row_limit);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "compare_web_vs_image", { days, min_combined_impressions, row_limit });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 24. Image Pages Overview
server.tool("image_pages_overview", "Pages on the site ranked by image-search performance. Tells you which pages are actually surfacing in Google Images and which are not. Pairs with image_keyword_overview to map ranking queries back to the pages carrying them." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(90).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(100).describe("Minimum impressions threshold"),
    row_limit: zod_1.z.number().default(50).describe("Maximum rows to return"),
    order_by: zod_1.z.enum(["impressions", "clicks", "position"]).default("clicks").describe("Sort field"),
}, async ({ days, min_impressions, row_limit, order_by }) => {
    const results = await (0, image_pages_overview_js_1.imagePagesOverview)(days, min_impressions, row_limit, order_by);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "image_pages_overview", { days, min_impressions, row_limit, order_by });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 25. Image Keyword Trends
server.tool("image_keyword_trends", "Period-over-period trend for image-search queries. Two equal-length windows joined on query, with impressions and position deltas. Negative position delta means the query improved its average rank." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Length in days of each comparison window (current + prior)"),
    min_combined_impressions: zod_1.z.number().default(100).describe("Minimum combined impressions across both windows"),
    row_limit: zod_1.z.number().default(50).describe("Maximum rows to return"),
    order_by: zod_1.z.enum(["impressions_delta", "position_delta"]).default("impressions_delta").describe("Sort field"),
}, async ({ days, min_combined_impressions, row_limit, order_by }) => {
    const results = await (0, image_keyword_trends_js_1.imageKeywordTrends)(days, min_combined_impressions, row_limit, order_by);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "image_keyword_trends", { days, min_combined_impressions, row_limit, order_by });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 26. Image Impressions No Clicks
server.tool("image_impressions_no_clicks", "Surfaces query and page pairs that earn meaningful image-search impressions but effectively zero clicks. The textbook 'thumbnail is not converting' pattern. Defaults tuned for image search, which runs at much higher impression volumes per page than web." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(90).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(500).describe("Minimum impressions threshold"),
    max_clicks: zod_1.z.number().default(2).describe("Maximum clicks (filter to pages stuck in the impressions-no-clicks pattern)"),
    row_limit: zod_1.z.number().default(50).describe("Maximum rows to return"),
}, async ({ days, min_impressions, max_clicks, row_limit }) => {
    const results = await (0, image_impressions_no_clicks_js_1.imageImpressionsNoClicks)(days, min_impressions, max_clicks, row_limit);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "image_impressions_no_clicks", { days, min_impressions, max_clicks, row_limit });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 27. Image Content Decay
server.tool("image_content_decay", "Image-search version of content_decay. Three 30-day windows, flags pages with a consistent decline across all three. Defaults to a lower minimum click threshold than the web equivalent because image search produces lower click volumes overall." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    min_period3_clicks: zod_1.z.number().default(5).describe("Minimum image-search clicks in the oldest 30-day window required for a page to be considered"),
}, async ({ min_period3_clicks }) => {
    const results = await (0, image_content_decay_js_1.imageContentDecay)(min_period3_clicks);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "image_content_decay", { min_period3_clicks });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("GSC MCP server v2.3.0 running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
