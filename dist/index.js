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
const discover_analysis_js_1 = require("./tools/discover-analysis.js");
const image_analysis_js_1 = require("./tools/image-analysis.js");
const search_appearance_js_1 = require("./tools/search-appearance.js");
const query_count_js_1 = require("./tools/query-count.js");
const server = new mcp_js_1.McpServer({
    name: "gsc-mcp",
    version: "2.4.0",
});
// Shared GSC surface (search type) parameter. "web" is the API default and keeps
// every tool backwards-compatible. Page-based tools also accept "discover";
// query-based tools accept image/video/news but not discover (no query dimension).
const SURFACES = ["web", "image", "video", "news", "discover", "googleNews"];
const surfaceParam = (note) => zod_1.z.enum(SURFACES).default("web").describe(note);
// 1. Quick Wins
server.tool("quick_wins", "Find keywords you're almost ranking for that could be pushed to page one. Returns queries at positions 4-15 with high impressions, sorted by traffic opportunity." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(100).describe("Minimum impressions threshold"),
    max_position: zod_1.z.number().default(15).describe("Maximum position to include"),
    surface: surfaceParam("Surface to query: web (default), image, video, news. Discover is NOT supported here (no query dimension)."),
}, async ({ days, min_impressions, max_position, surface }) => {
    const results = await (0, quick_wins_js_1.quickWins)(days, min_impressions, max_position, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "quick_wins", { days, min_impressions, max_position, surface });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 2. CTR Opportunities
server.tool("ctr_opportunities", "Find pages with high impressions but CTR significantly below expected for their position. These are title/meta description optimisation candidates." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(500).describe("Minimum impressions threshold"),
    surface: surfaceParam("Surface to query: web (default), image, video, news, discover. Discover is page-based and supported."),
}, async ({ days, min_impressions, surface }) => {
    const results = await (0, ctr_opportunities_js_1.ctrOpportunities)(days, min_impressions, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "ctr_opportunities", { days, min_impressions, surface });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 3. Traffic Drops
server.tool("traffic_drops", "Find pages that lost the most traffic recently. Compares current period vs prior period and diagnoses whether each drop is a ranking loss, CTR collapse, or demand decline." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days per period to compare"),
    surface: surfaceParam("Surface to query: web (default), image, video, news, discover. Discover is page-based and supported."),
}, async ({ days, surface }) => {
    const results = await (0, traffic_drops_js_1.trafficDrops)(days, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "traffic_drops", { days, surface });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 4. Content Gaps
server.tool("content_gaps", "Find topics you should create content for. Returns queries where you get impressions but rank beyond position 20, meaning there is search demand but no real content targeting it." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(90).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(50).describe("Minimum impressions threshold"),
    min_position: zod_1.z.number().default(20).describe("Minimum position (queries ranking worse than this)"),
    surface: surfaceParam("Surface to query: web (default), image, video, news. Discover is NOT supported here (no query dimension)."),
}, async ({ days, min_impressions, min_position, surface }) => {
    const results = await (0, content_gaps_js_1.contentGaps)(days, min_impressions, min_position, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "content_gaps", { days, min_impressions, min_position, surface });
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
    surface: surfaceParam("Surface to query: web (default), image, video, news. Discover is NOT supported here (no query dimension)."),
}, async ({ days, min_impressions, surface }) => {
    const results = await (0, cannibalization_check_js_1.cannibalizationCheck)(days, min_impressions, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "cannibalization_check", { days, min_impressions, surface });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 8. Content Decay
server.tool("content_decay", "Find pages that are slowly dying with consistent traffic decline over three consecutive 30-day periods. One bad month is noise; three consecutive bad months is a problem." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    surface: surfaceParam("Surface to query: web (default), image, video, news, discover. Discover is page-based and supported."),
}, async ({ surface }) => {
    const results = await (0, content_decay_js_1.contentDecay)(surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "content_decay", { surface });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 9. Topic Cluster Performance
server.tool("topic_cluster_performance", "See how a group of pages performs as a whole. Aggregates clicks, impressions, CTR, and position for all pages matching a URL path pattern, plus top 5 pages and queries." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    path_pattern: zod_1.z.string().describe("URL path pattern to match (e.g. /blog/seo)"),
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    surface: surfaceParam("Surface to query: web (default), image, video, news, discover. On Discover only page-level data is returned (no queries)."),
}, async ({ path_pattern, days, surface }) => {
    const results = await (0, topic_cluster_performance_js_1.topicClusterPerformance)(path_pattern, days, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "topic_cluster_performance", { path_pattern, days, surface });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 10. CTR vs Benchmark
server.tool("ctr_vs_benchmark", "Compare your actual CTR per page against industry benchmarks by position. Flags pages significantly underperforming for their ranking position." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(200).describe("Minimum impressions threshold"),
    surface: surfaceParam("Surface to query: web (default), image, video, news, discover. Discover is page-based and supported."),
}, async ({ days, min_impressions, surface }) => {
    const results = await (0, ctr_vs_benchmark_js_1.ctrVsBenchmark)(days, min_impressions, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "ctr_vs_benchmark", { days, min_impressions, surface });
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
    surface: surfaceParam("Surface to query: web (default), image, video, news, discover. On Discover only page-level data is returned (no queries)."),
}, async ({ claim, metric, expected_value, url, query, days, surface }) => {
    const results = await (0, verify_claim_js_1.verifyClaim)(claim, metric, expected_value, url, query, days, surface);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 12. Advanced Search Analytics
server.tool("advanced_search_analytics", "Run a custom search analytics query with flexible dimensions and filters. Supports country, device, query, and page filtering. For power users who need specific data cuts." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
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
    surface: surfaceParam("Surface to query: web (default), image, video, news, discover, googleNews. Dimensions must be valid for the chosen surface."),
}, async ({ days, dimensions, filters, row_limit, order_by, order_direction, site_url, surface }) => {
    const results = await (0, advanced_search_analytics_js_1.advancedSearchAnalytics)(days, dimensions, filters, row_limit, order_by, order_direction, site_url, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "advanced_search_analytics", { days, dimensions, filters, row_limit, order_by, surface });
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
    surface: surfaceParam("Surface to query: web (default), image, video, news. Discover is NOT supported here (no query dimension)."),
}, async ({ days, position_drop_threshold, ctr_drop_threshold, click_drop_threshold, surface }) => {
    const results = await (0, check_alerts_js_1.checkAlerts)(days, position_drop_threshold, ctr_drop_threshold, click_drop_threshold, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "check_alerts", { days, position_drop_threshold, ctr_drop_threshold, click_drop_threshold, surface });
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
// 21. Discover Analysis (isolated)
server.tool("discover_analysis", "Analyse Google Discover performance in isolation (type=discover). Discover is feed-based, not query-based, so this returns top pages, country split and a daily clicks/impressions trend with a prior-period comparison. No query-level data or position exists for Discover." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days per period to compare"),
    row_limit: zod_1.z.number().default(50).describe("Max number of top pages to return"),
    site_url: zod_1.z.string().optional().describe("Override the configured property"),
}, async ({ days, row_limit, site_url }) => {
    const results = await (0, discover_analysis_js_1.discoverAnalysis)(days, row_limit, site_url);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "discover_analysis", { days, row_limit, site_url });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 22. Image Analysis (isolated)
server.tool("image_analysis", "Analyse Google Image search performance in isolation (type=image). Returns top image queries, top pages and a prior-period comparison. Separate from web search data." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days per period to compare"),
    row_limit: zod_1.z.number().default(50).describe("Max number of top queries/pages to return"),
    site_url: zod_1.z.string().optional().describe("Override the configured property"),
}, async ({ days, row_limit, site_url }) => {
    const results = await (0, image_analysis_js_1.imageAnalysis)(days, row_limit, site_url);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "image_analysis", { days, row_limit, site_url });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 23. Search Appearance / Merchant Listings (isolated)
server.tool("search_appearance", "Break down performance by search-appearance / rich-result type (the searchAppearance dimension), e.g. MERCHANT_LISTINGS (Händlereinträge), PRODUCT_SNIPPETS, REVIEW_SNIPPET, RECIPE_FEATURE. Without an appearance argument it lists all appearance types with their metrics. Pass an appearance value to drill into the pages or queries driving that specific type." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    appearance: zod_1.z.string().optional().describe("Appearance type to drill into, e.g. MERCHANT_LISTINGS. Omit for the full breakdown."),
    drill_dimension: zod_1.z.enum(["page", "query"]).default("page").describe("When drilling into an appearance, group by page or query"),
    search_type: zod_1.z.enum(["web", "image", "video", "news", "discover", "googleNews"]).default("web").describe("Surface to query the appearance breakdown for"),
    row_limit: zod_1.z.number().default(50).describe("Max number of drilldown rows to return"),
    site_url: zod_1.z.string().optional().describe("Override the configured property"),
}, async ({ days, appearance, drill_dimension, search_type, row_limit, site_url }) => {
    const results = await (0, search_appearance_js_1.searchAppearance)(days, appearance, drill_dimension, search_type, row_limit, site_url);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "search_appearance", { days, appearance, drill_dimension, search_type, row_limit, site_url });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
// 24. Query Counting
server.tool("query_count", "Count how many distinct queries the property is visible for, split by position group (1-3, 4-10, 11-20, 21-50, 51+), with a comparison to the previous period. Also reports the anonymized-click gap: clicks the site total contains but no query row explains, because those queries fall below Google's privacy threshold. Treat the query count as a floor, never as the complete keyword set." + guardrails_js_1.GUARDRAIL_SUFFIX + guardrails_js_1.VISUAL_SUFFIX, {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    compare_previous: zod_1.z.boolean().default(true).describe("Also count the immediately preceding period of the same length"),
    include_pages: zod_1.z.boolean().default(false).describe("Also count queries per page. Expensive on large sites: needs the page+query dimension pair, capped at 100k rows."),
    top_pages: zod_1.z.number().default(25).describe("How many pages to return when include_pages is true"),
    surface: surfaceParam("Surface to query: web (default), image, video, news. Discover is NOT supported here (no query dimension)."),
}, async ({ days, compare_previous, include_pages, top_pages, surface }) => {
    const results = await (0, query_count_js_1.queryCount)(days, compare_previous, include_pages, top_pages, surface);
    const wrapped = (0, guardrails_js_1.withMeta)(results, "query_count", { days, compare_previous, include_pages, top_pages, surface });
    return {
        content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("GSC MCP server v2.4.0 running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
