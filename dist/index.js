#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
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
const server = new mcp_js_1.McpServer({
    name: "gsc-mcp",
    version: "1.0.0",
});
// 1. Quick Wins
server.tool("quick_wins", "Find keywords you're almost ranking for that could be pushed to page one. Returns queries at positions 4-15 with high impressions, sorted by traffic opportunity.", {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(100).describe("Minimum impressions threshold"),
    max_position: zod_1.z.number().default(15).describe("Maximum position to include"),
}, async ({ days, min_impressions, max_position }) => {
    const results = await (0, quick_wins_js_1.quickWins)(days, min_impressions, max_position);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 2. CTR Opportunities
server.tool("ctr_opportunities", "Find pages with high impressions but CTR significantly below expected for their position. These are title/meta description optimisation candidates.", {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(500).describe("Minimum impressions threshold"),
}, async ({ days, min_impressions }) => {
    const results = await (0, ctr_opportunities_js_1.ctrOpportunities)(days, min_impressions);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 3. Traffic Drops
server.tool("traffic_drops", "Find pages that lost the most traffic recently. Compares current period vs prior period and diagnoses whether each drop is a ranking loss, CTR collapse, or demand decline.", {
    days: zod_1.z.number().default(28).describe("Number of days per period to compare"),
}, async ({ days }) => {
    const results = await (0, traffic_drops_js_1.trafficDrops)(days);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 4. Content Gaps
server.tool("content_gaps", "Find topics you should create content for. Returns queries where you get impressions but rank beyond position 20, meaning there is search demand but no real content targeting it.", {
    days: zod_1.z.number().default(90).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(50).describe("Minimum impressions threshold"),
    min_position: zod_1.z.number().default(20).describe("Minimum position (queries ranking worse than this)"),
}, async ({ days, min_impressions, min_position }) => {
    const results = await (0, content_gaps_js_1.contentGaps)(days, min_impressions, min_position);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 5. Site Snapshot
server.tool("site_snapshot", "Get a quick overview of how the site is performing. Returns total clicks, impressions, CTR, and position with a comparison to the prior period.", {
    days: zod_1.z.number().default(28).describe("Number of days per period"),
}, async ({ days }) => {
    const results = await (0, site_snapshot_js_1.siteSnapshot)(days);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 6. Inspect URL
server.tool("inspect_url", "Check if a URL is indexed and why or why not. Returns indexing status, last crawl date, canonical info, robots/noindex issues, and mobile usability in one answer.", {
    url: zod_1.z.string().describe("The full URL to inspect"),
}, async ({ url }) => {
    const results = await (0, inspect_url_js_1.inspectUrlTool)(url);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 7. Cannibalization Check
server.tool("cannibalization_check", "Find keywords where multiple pages from your site compete against each other. Shows which page ranks higher, the position gap, and combined impressions being split.", {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(50).describe("Minimum combined impressions for a query"),
}, async ({ days, min_impressions }) => {
    const results = await (0, cannibalization_check_js_1.cannibalizationCheck)(days, min_impressions);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 8. Content Decay
server.tool("content_decay", "Find pages that are slowly dying with consistent traffic decline over three consecutive 30-day periods. One bad month is noise; three consecutive bad months is a problem.", {}, async () => {
    const results = await (0, content_decay_js_1.contentDecay)();
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 9. Topic Cluster Performance
server.tool("topic_cluster_performance", "See how a group of pages performs as a whole. Aggregates clicks, impressions, CTR, and position for all pages matching a URL path pattern, plus top 5 pages and queries.", {
    path_pattern: zod_1.z.string().describe("URL path pattern to match (e.g. /blog/seo)"),
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
}, async ({ path_pattern, days }) => {
    const results = await (0, topic_cluster_performance_js_1.topicClusterPerformance)(path_pattern, days);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
// 10. CTR vs Benchmark
server.tool("ctr_vs_benchmark", "Compare your actual CTR per page against industry benchmarks by position. Flags pages significantly underperforming for their ranking position.", {
    days: zod_1.z.number().default(28).describe("Number of days to analyse"),
    min_impressions: zod_1.z.number().default(200).describe("Minimum impressions threshold"),
}, async ({ days, min_impressions }) => {
    const results = await (0, ctr_vs_benchmark_js_1.ctrVsBenchmark)(days, min_impressions);
    return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("GSC MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
