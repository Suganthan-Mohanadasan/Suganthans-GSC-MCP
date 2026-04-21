# Build Spec: GSC MCP Server

## Project Overview

A Model Context Protocol server for Google Search Console that gives Claude the ability to answer real SEO questions directly, without digging through GSC tabs. The design principle: every tool is named after the question it answers, not the API endpoint it calls. Ten focused tools, zero bloat.

This is not another GSC API wrapper. It solves three things existing servers get wrong: data is always fresh (most servers serve data 2 to 3 days stale by default because they miss one API parameter), tools answer compound questions instead of returning raw rows, and setup is fast enough that a non-developer can do it in under 5 minutes.

Tools like SEOGets charge monthly subscriptions for cannibalization reports, content decay analysis, and CTR benchmarking. This makes all of that available by just asking Claude, for free, on your own data.

**The post writes itself:** you built it because you were tired of logging into GSC to answer the same questions every week.

---

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Google API:** `googleapis` npm package (official Google client)
- **Auth:** Google service account (JSON key file — no browser OAuth flow)
- **Distribution:** Published to npm so anyone can run it via `npx`

No database. No server to host. Runs locally as a process that Claude Desktop talks to.

---

## Environment / Setup

Users need to do three things once:

1. Create a service account in Google Cloud Console and download the JSON key file
2. Add the service account email as a user on their GSC property (30 seconds in the GSC settings UI)
3. Add one block to their `claude_desktop_config.json` pointing at the key file and their site URL

That is the entire setup. No tokens to refresh, no OAuth dance, no `.env` files.

**Claude Desktop config block (what the user adds):**
```json
"gsc": {
  "command": "npx",
  "args": ["-y", "@suganthan/gsc-mcp"],
  "env": {
    "GSC_KEY_FILE": "/path/to/service-account.json",
    "GSC_SITE_URL": "https://yoursite.com/"
  }
}
```

---

## The Eleven Tools

All tools call the GSC API with `dataState: 'all'` so data matches the dashboard exactly (not 2 to 3 days stale like most servers). Pagination is handled automatically to get past the 25,000 row API default.

---

### 1. `quick_wins`
**The question:** "Which keywords am I almost ranking for that I could push to page one?"

Returns queries where average position is between 4 and 15, impressions are above a threshold, and clicks are low relative to impressions. Sorted by traffic opportunity (impressions × expected CTR improvement at target position). The report most SEOs run manually every week.

Parameters: `days` (default 28), `min_impressions` (default 100), `max_position` (default 15)

---

### 2. `ctr_opportunities`
**The question:** "Which pages have people seeing them but not clicking?"

Returns pages with high impressions and CTR significantly below the expected rate for their mean position. Sorted by impressions so biggest opportunities surface first. These are title and meta description optimisation candidates.

Parameters: `days` (default 28), `min_impressions` (default 500)

---

### 3. `traffic_drops`
**The question:** "What has lost the most traffic recently?"

Compares current period vs the equivalent prior period per page. Returns pages with the largest absolute click drops and their position change. Flags whether each drop is a ranking loss or a CTR collapse, since the fix is different for each.

Parameters: `days` (default 28)

---

### 4. `content_gaps`
**The question:** "What topics should I be creating content for?"

Returns queries where you get impressions but average position is above 20 — meaning people are searching for something, your domain has some signal, but you have no real content targeting it. Confirmed gaps, not guesses.

Parameters: `days` (default 90), `min_impressions` (default 50), `min_position` (default 20)

---

### 5. `site_snapshot`
**The question:** "How is the site doing overall?"

Returns total clicks, impressions, average CTR, and average position for the period with a comparison to the equivalent prior period. Clean summary, no noise.

Parameters: `days` (default 28)

---

### 6. `inspect_url`
**The question:** "Is this URL indexed, and if not, why?"

Returns a plain-English summary of the URL Inspection API result: indexed or not, last crawl date, canonical match (Google's vs declared), any blocking issue (robots, noindex, 4xx, server error), and mobile usability verdict. Combines what would take three GSC UI tabs into one answer.

Parameters: `url` (required)

---

### 7. `cannibalization_check`
**The question:** "Which pages are competing against each other for the same keywords?"

Queries all keyword rankings, groups by query, and surfaces any keyword where two or more pages from the same site appear. For each conflict, shows which page ranks higher, the position gap, and the combined impressions being split. Lets you see exactly where your own content is working against itself.

Parameters: `days` (default 28), `min_impressions` (default 50)

---

### 8. `content_decay`
**The question:** "Which pages are slowly dying that I haven't noticed yet?"

Compares three consecutive 30-day periods (0 to 30 days, 31 to 60, 61 to 90) per page. Flags pages with a consistent downward trend in both clicks and position across all three periods. A single bad month is noise. Three consecutive bad months is a problem. Returns the worst offenders sorted by total traffic lost.

Parameters: none (always uses 90-day window for reliable trend signal)

---

### 9. `topic_cluster_performance`
**The question:** "How is this group of pages performing as a whole?"

Takes a URL path pattern and aggregates clicks, impressions, CTR, and average position across all matching pages. So you can ask "how is my /blog/ai-seo/ content performing overall?" instead of checking each post individually. Also shows the top 5 pages and top 5 queries within the cluster.

Parameters: `path_pattern` (required — e.g. `/blog/seo`), `days` (default 28)

---

### 10. `ctr_vs_benchmark`
**The question:** "Where is my CTR underperforming for my ranking position?"

Compares actual CTR per page against established industry benchmarks by position (position 1 ≈ 28%, position 2 ≈ 15%, position 3 ≈ 11%, declining from there). Pages significantly below benchmark are flagged with the gap. More precise than raw CTR analysis because it accounts for the fact that position 5 should have lower CTR than position 1.

Benchmark curve used: `[28.5, 15.7, 11.0, 8.0, 7.2, 5.1, 4.0, 3.2, 2.8, 2.5]` for positions 1 to 10, then linear decay below.

Parameters: `days` (default 28), `min_impressions` (default 200)

---

## What Makes This Different From Existing Servers

| Thing | Existing servers | This one |
|---|---|---|
| Data freshness | 2 to 3 days stale | Matches GSC dashboard exactly |
| Tool naming | `get_search_analytics`, `query_data` | `quick_wins`, `cannibalization_check` |
| Compound analysis | Raw rows, LLM figures it out | Pre-aggregated with period comparisons |
| Cannibalization | Not available | Built in |
| Content decay | Not available | Built in |
| CTR benchmarking | Not available | Built in |
| Install | Clone repo, configure env, run node | `npx`, one config block |
| Tools exposed | 12 to 19 generic wrappers | 10, each answering a specific question |

---

## Repo Structure

```
gsc-mcp/
├── src/
│   ├── index.ts                       # MCP server entry point, tool registration
│   ├── auth.ts                        # Service account auth setup
│   ├── analytics.ts                   # Shared Search Analytics API calls with pagination
│   ├── inspection.ts                  # URL Inspection API calls
│   └── tools/
│       ├── quick-wins.ts
│       ├── ctr-opportunities.ts
│       ├── traffic-drops.ts
│       ├── content-gaps.ts
│       ├── site-snapshot.ts
│       ├── inspect-url.ts
│       ├── cannibalization-check.ts
│       ├── content-decay.ts
│       ├── topic-cluster-performance.ts
│       └── ctr-vs-benchmark.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## README Structure

The README is the product for an open source tool. Structure it as:

1. **What it does** — one paragraph, question-led. "Ask Claude 'what are my quick wins this week?' and get an answer based on your actual GSC data."
2. **Setup** — numbered, under 5 steps, with screenshots of the GSC service account creation
3. **Example prompts** — copy-paste questions users can immediately ask Claude once installed
4. **The ten tools** — one-line description of each
5. **Why I built this** — links to the companion blog post

---

## Example Prompts to Include in README

```
"What are my quick wins this week?"
"Which pages are cannibalising each other?"
"What content is decaying on my site?"
"Which pages have the worst CTR for their ranking position?"
"How is my /blog/seo/ topic cluster performing?"
"What traffic have I lost in the last month and why?"
"Is /blog/my-post/ indexed? When did Google last crawl it?"
"What topics am I missing content for?"
"Give me a site snapshot for the last 28 days vs the prior period"
```

---

## Deployment Notes

- Publish to npm as `@suganthan/gsc-mcp`
- Submit to the MCP registry and Smithery for discoverability
- The companion blog post on suganthan.com is the primary distribution channel
- Write the post as soon as the core tools are working — don't wait for polish

---

## The Blog Post Angle

Not "here is how to set up a GSC MCP server."

The angle: "Tools like SEOGets charge you monthly for cannibalization reports, content decay analysis, and CTR benchmarking. I built an open source MCP server that does all of that for free, inside Claude. Here's what I built, here's why, and here's how to use it yourself."

The repo is the proof. The post is the story.
