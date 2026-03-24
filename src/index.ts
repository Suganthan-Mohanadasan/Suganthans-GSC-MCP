#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { GUARDRAIL_SUFFIX, withMeta } from "./guardrails.js";
import { quickWins } from "./tools/quick-wins.js";
import { ctrOpportunities } from "./tools/ctr-opportunities.js";
import { trafficDrops } from "./tools/traffic-drops.js";
import { contentGaps } from "./tools/content-gaps.js";
import { siteSnapshot } from "./tools/site-snapshot.js";
import { inspectUrlTool } from "./tools/inspect-url.js";
import { cannibalizationCheck } from "./tools/cannibalization-check.js";
import { contentDecay } from "./tools/content-decay.js";
import { topicClusterPerformance } from "./tools/topic-cluster-performance.js";
import { ctrVsBenchmark } from "./tools/ctr-vs-benchmark.js";
import { verifyClaim } from "./tools/verify-claim.js";

const server = new McpServer({
  name: "gsc-mcp",
  version: "1.1.0",
});

// 1. Quick Wins
server.tool(
  "quick_wins",
  "Find keywords you're almost ranking for that could be pushed to page one. Returns queries at positions 4-15 with high impressions, sorted by traffic opportunity." + GUARDRAIL_SUFFIX,
  {
    days: z.number().default(28).describe("Number of days to analyse"),
    min_impressions: z.number().default(100).describe("Minimum impressions threshold"),
    max_position: z.number().default(15).describe("Maximum position to include"),
  },
  async ({ days, min_impressions, max_position }) => {
    const results = await quickWins(days, min_impressions, max_position);
    const wrapped = withMeta(results, "quick_wins", { days, min_impressions, max_position });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 2. CTR Opportunities
server.tool(
  "ctr_opportunities",
  "Find pages with high impressions but CTR significantly below expected for their position. These are title/meta description optimisation candidates." + GUARDRAIL_SUFFIX,
  {
    days: z.number().default(28).describe("Number of days to analyse"),
    min_impressions: z.number().default(500).describe("Minimum impressions threshold"),
  },
  async ({ days, min_impressions }) => {
    const results = await ctrOpportunities(days, min_impressions);
    const wrapped = withMeta(results, "ctr_opportunities", { days, min_impressions });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 3. Traffic Drops
server.tool(
  "traffic_drops",
  "Find pages that lost the most traffic recently. Compares current period vs prior period and diagnoses whether each drop is a ranking loss, CTR collapse, or demand decline." + GUARDRAIL_SUFFIX,
  {
    days: z.number().default(28).describe("Number of days per period to compare"),
  },
  async ({ days }) => {
    const results = await trafficDrops(days);
    const wrapped = withMeta(results, "traffic_drops", { days });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 4. Content Gaps
server.tool(
  "content_gaps",
  "Find topics you should create content for. Returns queries where you get impressions but rank beyond position 20, meaning there is search demand but no real content targeting it." + GUARDRAIL_SUFFIX,
  {
    days: z.number().default(90).describe("Number of days to analyse"),
    min_impressions: z.number().default(50).describe("Minimum impressions threshold"),
    min_position: z.number().default(20).describe("Minimum position (queries ranking worse than this)"),
  },
  async ({ days, min_impressions, min_position }) => {
    const results = await contentGaps(days, min_impressions, min_position);
    const wrapped = withMeta(results, "content_gaps", { days, min_impressions, min_position });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 5. Site Snapshot
server.tool(
  "site_snapshot",
  "Get a quick overview of how the site is performing. Returns total clicks, impressions, CTR, and position with a comparison to the prior period." + GUARDRAIL_SUFFIX,
  {
    days: z.number().default(28).describe("Number of days per period"),
  },
  async ({ days }) => {
    const results = await siteSnapshot(days);
    const wrapped = withMeta(results, "site_snapshot", { days });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 6. Inspect URL
server.tool(
  "inspect_url",
  "Check if a URL is indexed and why or why not. Returns indexing status, last crawl date, canonical info, robots/noindex issues, and mobile usability in one answer." + GUARDRAIL_SUFFIX,
  {
    url: z.string().describe("The full URL to inspect"),
  },
  async ({ url }) => {
    const results = await inspectUrlTool(url);
    const wrapped = withMeta(results, "inspect_url", { url });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 7. Cannibalization Check
server.tool(
  "cannibalization_check",
  "Find keywords where multiple pages from your site compete against each other. Shows which page ranks higher, the position gap, and combined impressions being split." + GUARDRAIL_SUFFIX,
  {
    days: z.number().default(28).describe("Number of days to analyse"),
    min_impressions: z.number().default(50).describe("Minimum combined impressions for a query"),
  },
  async ({ days, min_impressions }) => {
    const results = await cannibalizationCheck(days, min_impressions);
    const wrapped = withMeta(results, "cannibalization_check", { days, min_impressions });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 8. Content Decay
server.tool(
  "content_decay",
  "Find pages that are slowly dying with consistent traffic decline over three consecutive 30-day periods. One bad month is noise; three consecutive bad months is a problem." + GUARDRAIL_SUFFIX,
  {},
  async () => {
    const results = await contentDecay();
    const wrapped = withMeta(results, "content_decay", {});
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 9. Topic Cluster Performance
server.tool(
  "topic_cluster_performance",
  "See how a group of pages performs as a whole. Aggregates clicks, impressions, CTR, and position for all pages matching a URL path pattern, plus top 5 pages and queries." + GUARDRAIL_SUFFIX,
  {
    path_pattern: z.string().describe("URL path pattern to match (e.g. /blog/seo)"),
    days: z.number().default(28).describe("Number of days to analyse"),
  },
  async ({ path_pattern, days }) => {
    const results = await topicClusterPerformance(path_pattern, days);
    const wrapped = withMeta(results, "topic_cluster_performance", { path_pattern, days });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 10. CTR vs Benchmark
server.tool(
  "ctr_vs_benchmark",
  "Compare your actual CTR per page against industry benchmarks by position. Flags pages significantly underperforming for their ranking position." + GUARDRAIL_SUFFIX,
  {
    days: z.number().default(28).describe("Number of days to analyse"),
    min_impressions: z.number().default(200).describe("Minimum impressions threshold"),
  },
  async ({ days, min_impressions }) => {
    const results = await ctrVsBenchmark(days, min_impressions);
    const wrapped = withMeta(results, "ctr_vs_benchmark", { days, min_impressions });
    return {
      content: [{ type: "text", text: JSON.stringify(wrapped, null, 2) }],
    };
  }
);

// 11. Verify Claim
server.tool(
  "verify_claim",
  "Verify a specific numeric claim against live GSC data. Use this to self-check your analysis before presenting findings. Pass the claim text, the metric to check, the expected value, and optionally a URL or query to filter by. Returns whether the claim is verified and any discrepancy found.",
  {
    claim: z.string().describe("The claim to verify, e.g. 'Homepage gets 500 clicks per month'"),
    metric: z.enum(["clicks", "impressions", "ctr", "position"]).describe("Which metric to check"),
    expected_value: z.number().describe("The numeric value you claimed"),
    url: z.string().optional().describe("Filter to a specific URL"),
    query: z.string().optional().describe("Filter to a specific search query"),
    days: z.number().default(28).describe("Number of days to check"),
  },
  async ({ claim, metric, expected_value, url, query, days }) => {
    const results = await verifyClaim(claim, metric, expected_value, url, query, days);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GSC MCP server v1.1.0 running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
