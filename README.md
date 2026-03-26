# GSC MCP Server

Ask Claude questions about your Google Search Console data and get real answers. Not raw API rows. Actual analysis.

"What are my quick wins?" "Which pages are cannibalising each other?" "What content is decaying?" "Check for any alerts." "Give me content recommendations." Just ask, and the server runs the analysis on your live GSC data.

**v2.1:** Indexing API (submit URLs for crawling, batch submit, sitemap management). Plus OAuth, alerting, scheduled reports, content recommendations, multi-site dashboards, advanced filtering.

Full walkthrough: [suganthan.com/blog/google-search-console-mcp-server/](https://suganthan.com/blog/google-search-console-mcp-server/)

## Setup

Two auth options. Pick one.

### Option A: OAuth (recommended)

1. Create a Google Cloud project and enable the **Search Console API**
2. Go to **Credentials > Create Credentials > OAuth client ID**, choose **Desktop app**
3. Download the client secrets JSON
4. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/gsc-mcp"],
      "env": {
        "GSC_AUTH_MODE": "oauth",
        "GSC_OAUTH_SECRETS_FILE": "/path/to/client_secrets.json",
        "GSC_SITE_URL": "sc-domain:yoursite.com"
      }
    }
  }
}
```

First use opens a browser for Google sign in. Token is cached after that.

### Option B: Service Account

1. Create a Google Cloud project and enable the **Search Console API**
2. Go to **IAM & Admin > Service Accounts**, create one, download the JSON key
3. Add the service account email to your GSC property (Settings > Users and permissions > Full access)
4. Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/gsc-mcp"],
      "env": {
        "GSC_KEY_FILE": "/path/to/service-account.json",
        "GSC_SITE_URL": "sc-domain:yoursite.com"
      }
    }
  }
}
```

### Indexing API setup (for submit_url, submit_batch)

To use the indexing tools, enable the **Indexing API** in your Google Cloud project:

1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library/indexing.googleapis.com)
2. Search for "Web Search Indexing API" and enable it
3. Your service account (or OAuth credentials) need owner-level access in Search Console

Note: Google officially says the Indexing API is for JobPosting and BroadcastEvent schema types. In practice, it processes requests for all page types. Priority is not guaranteed for non-job pages.

### Multi-site setup

For multiple properties, add `GSC_SITE_URLS`:

```json
"env": {
  "GSC_KEY_FILE": "/path/to/service-account.json",
  "GSC_SITE_URL": "sc-domain:primarysite.com",
  "GSC_SITE_URLS": "sc-domain:primarysite.com,sc-domain:secondsite.com,https://thirdsite.com/"
}
```

## Example prompts

```
"What are my quick win keywords?"
"Check for any SEO alerts in the last 7 days"
"Give me content recommendations"
"Generate a full performance report and save it"
"Show me a dashboard across all my sites"
"Show me US mobile traffic for the last 90 days"
"Which pages are cannibalising each other?"
"What content is decaying?"
"Is /blog/my-post/ indexed?"
"Submit this URL for indexing: https://mysite.com/new-post/"
"Batch submit all my new blog posts for indexing"
"List my sitemaps and their status"
```

## Tools (20 total)

### Analysis tools

| Tool | What it answers |
|---|---|
| `site_snapshot` | How is the site doing overall? |
| `quick_wins` | Which keywords could I push to page one? |
| `ctr_opportunities` | Which pages are people seeing but not clicking? |
| `traffic_drops` | What lost traffic recently, and why? |
| `content_gaps` | What topics should I create content for? |
| `cannibalization_check` | Which pages compete against each other? |
| `content_decay` | Which pages are slowly dying? |
| `topic_cluster_performance` | How is this group of pages performing? |
| `ctr_vs_benchmark` | Where is my CTR underperforming for my position? |
| `inspect_url` | Is this URL indexed, and if not, why? |

### New in v2.0

| Tool | What it answers |
|---|---|
| `advanced_search_analytics` | Custom queries with flexible dimensions and filters (country, device, query, page) |
| `check_alerts` | What needs attention right now? Position drops, CTR collapses, disappearing pages |
| `content_recommendations` | What should I update, create, or consolidate, and in what order? |
| `generate_report` | Save a full markdown report to disk (snapshot + alerts + wins + drops + decay + recommendations) |
| `multi_site_dashboard` | Health check across all my properties in one view |

### Indexing (new in v2.1)

| Tool | What it does |
|---|---|
| `submit_url` | Submit a URL to Google's Indexing API for crawling/indexing |
| `submit_batch` | Batch submit up to 200 URLs in one go (daily quota) |
| `submit_sitemap` | Notify Google of a new or updated sitemap |
| `list_sitemaps` | List all submitted sitemaps with status, errors, and indexed counts |

### Safety

| Tool | What it does |
|---|---|
| `verify_claim` | Self-check: verifies a numeric claim against live GSC data before presenting it |

## What makes this different

**Fresh data.** Uses `dataState: 'all'` so data matches the GSC dashboard, not 2 to 3 days stale.

**Question-shaped tools.** Named after the question they answer, not the API endpoint they call.

**Compound analysis.** Cannibalization detection, decay trends, CTR benchmarking, traffic drop diagnosis, content recommendations, and alerting are all pre-built.

**Hallucination guardrails.** Tool descriptions instruct Claude to stick to the data. Provenance metadata anchors responses. The `verify_claim` tool lets Claude self-check numbers. Credit to [Krinal Mehta](https://www.linkedin.com/in/krinal/) for pushing this.

**Scheduled reports.** Generate a full markdown report with one command. Designed for weekly reviews.

**Multi-site dashboards.** One command to check the health of every property you manage.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GSC_AUTH_MODE` | No | `oauth` or `service_account` (default: `service_account`) |
| `GSC_KEY_FILE` | Service account mode | Path to service account JSON key |
| `GSC_OAUTH_SECRETS_FILE` | OAuth mode | Path to OAuth client secrets JSON |
| `GSC_OAUTH_CLIENT_ID` | OAuth mode (alt) | OAuth client ID |
| `GSC_OAUTH_CLIENT_SECRET` | OAuth mode (alt) | OAuth client secret |
| `GSC_SITE_URL` | Yes | Primary GSC property URL |
| `GSC_SITE_URLS` | No | Comma-separated list for multi-site |

## Licence

MIT

Built by [Suganthan Mohanadasan](https://suganthan.com). If you find it useful, give it a star.
