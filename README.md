# Google Search Console MCP Server

An MCP server for Google Search Console that lets you ask Claude questions about your search data and get real answers. Not raw API rows. Actual analysis.

27 tools. OAuth or service account. Free and open source. Runs on your machine: your data goes straight from this computer to Google, and nothing passes through anyone else's servers.

> **Full setup guide with screenshots:** [suganthan.com/blog/google-search-console-mcp-server/](https://suganthan.com/blog/google-search-console-mcp-server/)

## See it in action

**"How is my site doing?"**

![Site snapshot with period comparison](screenshots/snapshot.jpg)

**"What are my quick win keywords?"**

![Quick wins analysis showing positions 4-15 with opportunity scores](screenshots/quick%20wins2.jpg)

**"Which pages are cannibalising each other?"**

![Cannibalisation detection across the site](screenshots/canni.jpg)

**"What content is slowly dying?"**

![Content decay detection over three consecutive periods](screenshots/dying.jpg)

**"Which pages lost traffic and why?"**

![Traffic drop diagnosis: ranking loss vs CTR collapse vs demand decline](screenshots/lost.jpg)

**"How does my CTR compare to benchmarks?"**

![CTR vs industry benchmarks by position](screenshots/CTR.jpg)

**"How is my blog cluster performing?"**

![Topic cluster performance for a URL path pattern](screenshots/topics.jpg)

## What you can ask

```
"What are my quick win keywords?"
"Which pages lost traffic this month and why?"
"What content is decaying?"
"Which pages are cannibalising each other?"
"Check for any SEO alerts in the last 7 days"
"Give me content recommendations"
"How does my CTR compare to benchmarks?"
"How is my /blog/ cluster performing?"
"Show me US mobile traffic for the last 90 days"
"Is /blog/my-post/ indexed? If not, why?"
"Generate a full performance report and save it"
"Show me a dashboard across all my sites"
"Submit this URL for indexing: https://mysite.com/new-post/"
"Batch submit all my new blog posts for indexing"
"List my sitemaps and their status"
"Verify that claim about my homepage clicks"
```

## Quick start

### One command setup (new in v2.3)

```bash
npx -y suganthan-gsc-mcp setup
```

The wizard signs you in with Google, verifies the connection with a live API call, lets you pick your property from a list, and writes the config for Claude Desktop and Claude Code. No config files to edit.

Read only by default: the standard consent screen asks for a single view permission. Choose full access during setup if you want the sitemap and URL submission tools.

For now you still need your own Google OAuth client JSON one time (steps 1 to 3 under Manual OAuth below); the wizard takes it from there. Built in Google sign in, with no Google Cloud steps at all, ships the moment Google finishes verifying the shared client.

Useful flags: `--client desktop|code|both|print`, `--scopes readonly|full`, `--site <property>`, `--secrets <path>`, `--reauth`, `--force`, `--dry-run`, `--help`.

### One click desktop install

Prefer no terminal at all? Download the `.mcpb` bundle from the [releases page](https://github.com/Suganthan-Mohanadasan/Suganthans-GSC-MCP/releases) and double click it. Claude Desktop installs the server with a small settings screen.

### Option A: OAuth (manual)

1. Create a Google Cloud project and enable the **Search Console API**
2. Go to **Credentials > Create Credentials > OAuth client ID**, choose **Desktop app**
3. Download the client secrets JSON
4. Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "suganthan-gsc-mcp"],
      "env": {
        "GSC_AUTH_MODE": "oauth",
        "GSC_OAUTH_SECRETS_FILE": "/path/to/client_secrets.json",
        "GSC_SITE_URL": "sc-domain:yoursite.com",
        "GSC_SCOPES": "readonly"
      }
    }
  }
}
```

First use opens a browser for Google sign in. Token is cached after that (locally, at `~/.gsc-mcp/`). Set `GSC_SCOPES` to `full` if you want the submission tools; omit it and you get full access, matching pre 2.3 behaviour. Running from a git checkout instead of npm? Use `"command": "node", "args": ["/path/to/Suganthans-GSC-MCP/dist/index.js"]`.

### Option B: Service Account

1. Create a Google Cloud project and enable the **Search Console API**
2. Go to **IAM & Admin > Service Accounts**, create one, download the JSON key
3. Add the service account email to your GSC property (Settings > Users and permissions > Full access)
4. Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "gsc": {
      "command": "node",
      "args": ["/path/to/Suganthans-GSC-MCP/dist/index.js"],
      "env": {
        "GSC_KEY_FILE": "/path/to/service-account.json",
        "GSC_SITE_URL": "sc-domain:yoursite.com"
      }
    }
  }
}
```

### Indexing API (optional)

To use `submit_url`, `submit_batch`, and `submit_sitemap`:

1. Enable the **Web Search Indexing API** in your [Google Cloud console](https://console.cloud.google.com/apis/library/indexing.googleapis.com)
2. Your service account (or OAuth credentials) need owner-level access in Search Console

Note: Google officially says the Indexing API is for JobPosting and BroadcastEvent schema types. In practice, it processes requests for all page types.

### Multi-site

For multiple properties, add `GSC_SITE_URLS`:

```json
"env": {
  "GSC_SITE_URL": "sc-domain:primarysite.com",
  "GSC_SITE_URLS": "sc-domain:primarysite.com,sc-domain:secondsite.com"
}
```

## All 27 tools

### Analysis

| Tool | What it answers |
|---|---|
| `site_snapshot` | How is the site doing overall? Clicks, impressions, CTR, position with period comparison |
| `quick_wins` | Keywords at positions 4-15 with high impressions, scored by opportunity |
| `ctr_opportunities` | Pages with high impressions but CTR below expected for their position |
| `traffic_drops` | What lost traffic, and whether it's a ranking loss, CTR collapse, or demand decline |
| `content_gaps` | Topics with search demand but no real content targeting them |
| `cannibalization_check` | Keywords where multiple pages compete against each other |
| `content_decay` | Pages declining across three consecutive 30-day periods |
| `topic_cluster_performance` | Aggregated performance for all pages matching a URL path pattern |
| `ctr_vs_benchmark` | Your actual CTR per position vs industry benchmarks |
| `inspect_url` | Is this URL indexed? Last crawl date, canonical, robots/noindex issues |
| `check_alerts` | Position drops, CTR collapses, click losses, disappeared pages. Severity-rated |
| `content_recommendations` | Prioritised actions: pages to update, content to create, pages to consolidate |
| `advanced_search_analytics` | Custom queries with flexible dimensions and filters |
| `generate_report` | Full markdown report saved to disk |
| `multi_site_dashboard` | Health check across all properties in one command |

### Image SEO (v2.3)

These tools pass `type=image` to the GSC Search Analytics API, which most third-party tools never expose. They cover the visual-search surface end-to-end.

| Tool | What it answers |
|---|---|
| `image_keyword_overview` | Top image-search queries on the site, sorted by impressions, clicks, or position |
| `image_search_quick_wins` | Image queries at positions 4-15 with high impressions, scored by image-CTR opportunity. The CTR baseline is calibrated for image search, which runs roughly 5-6x lower than web at equivalent positions |
| `compare_web_vs_image` | Same query, side-by-side performance across web and image surfaces, with an impressions ratio that surfaces where image search carries disproportionate volume |
| `image_pages_overview` | Pages on the site ranked by image-search performance. Pairs with `image_keyword_overview` to map queries back to the pages carrying them |
| `image_keyword_trends` | Period-over-period deltas for image-search queries. Impressions delta and position delta (negative position delta means the query improved its average rank) |
| `image_impressions_no_clicks` | Query and page pairs earning meaningful image impressions but near-zero clicks. The textbook thumbnail-not-converting pattern |
| `image_content_decay` | Image-search version of `content_decay`. Pages losing image-search traffic across 3 consecutive 30-day periods, sorted by total click loss |

### Indexing

| Tool | What it does |
|---|---|
| `submit_url` | Submit a URL to Google's Indexing API for crawling |
| `submit_batch` | Batch submit up to 200 URLs (daily quota) |
| `submit_sitemap` | Notify Google of a new or updated sitemap |
| `list_sitemaps` | All submitted sitemaps with status, errors, and indexed counts |

### Safety

| Tool | What it does |
|---|---|
| `verify_claim` | Self-check: re-queries GSC data to verify a numeric claim before presenting it |

## What makes this different from other Google Search Console MCP servers

**Analysis, not just API access.** Most Google Search Console MCP servers wrap the raw API. This one ships with pre-built analysis: opportunity scoring, cannibalisation detection, decay tracking, CTR benchmarking, traffic drop diagnosis. You ask a question, it runs the analysis and tells you what to do.

**Local and private.** No hosted middleman, no account, no plan. The server runs on your machine, tokens are cached on your machine, and your Search Console data travels directly between your machine and Google. The developer operates no servers and receives nothing. Read only scope by default.

**Hallucination guardrails.** Every tool instructs Claude to base analysis only on returned data. Provenance metadata in every response. The `verify_claim` tool lets Claude fact-check its own numbers. Credit to [Krinal Mehta](https://www.linkedin.com/in/krinal/) for pushing this.

**Visual dashboards.** Results render as rich, interactive visualisations in Claude Desktop. Summary cards, colour coded indicators, bar charts, and tabbed sections. Not plain text dumps.

**Fresh data.** Uses `dataState: 'all'` so data matches the GSC dashboard, not 2-3 days stale.

**Proactive, not reactive.** Alerting, content recommendations, and scheduled reports catch problems before you think to look.

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
| `GSC_SCOPES` | No | `readonly` or `full` (default: `full`). Read only keeps the Google consent to a single view permission; submission tools then explain how to upgrade |

## Full guide

Step-by-step setup with screenshots, use cases, and examples:

**[suganthan.com/blog/google-search-console-mcp-server/](https://suganthan.com/blog/google-search-console-mcp-server/)**

## Changelog

**v2.3.0** Image SEO suite and one command setup. 7 new tools that pass `type=image` to the GSC Search Analytics API, plus a `type` parameter on `advanced_search_analytics` covering all 6 GSC search surfaces (web, image, video, news, discover, googleNews). The image-search surface was invisible to most third-party SEO tools because they default to `type=web` and never expose the others; v2.3 makes it queryable end-to-end. Also new: `npx suganthan-gsc-mcp setup`, a wizard that signs you in, verifies the connection with a live call, and writes your Claude Desktop and Claude Code configs; a read only scope tier (`GSC_SCOPES=readonly`, now the setup default) so the standard consent asks for one view permission; and a one click Claude Desktop bundle (`.mcpb`) on the releases page.

**v2.2.2** Published to npm as `suganthan-gsc-mcp`. Config can now use `npx` instead of a local checkout path.

**v2.2.1** Fixed OAuth EADDRINUSE crash when multiple tool calls triggered concurrent authentication flows. The server now reuses the active auth session instead of spawning duplicate listeners. Thanks to [Rushabh Rathod](https://github.com/rushabhhh) for finding and reporting this.

**v2.2.0** Visual dashboard rendering. All analysis tools now produce rich, interactive visualisations in Claude Desktop with summary cards, colour coded indicators, bar charts, and tabbed sections instead of plain text output. No reinstall needed, just restart Claude Desktop.

![Visual dashboard rendering in Claude Desktop](screenshots/visual-dashboard.jpg)

**v2.1.0** Added Indexing API tools: submit\_url, submit\_batch, submit\_sitemap, list\_sitemaps. Request Google to crawl and index pages directly from Claude.

**v2.0.0** Added OAuth authentication, advanced search analytics, check\_alerts, content\_recommendations, generate\_report, multi\_site\_dashboard, verify\_claim. Server grew from 10 to 16 tools.

**v1.1.0** Added hallucination guardrails: explicit prompts in tool descriptions, data provenance metadata in responses, and verify\_claim self-checking tool. Thanks to [Krinal Mehta](https://www.linkedin.com/in/krinal/) for the feedback.

**v1.0.0** Initial release with 10 analysis tools and service account authentication.

## Licence

Apache 2.0

Built by [Suganthan Mohanadasan](https://suganthan.com). If you find it useful, star it.
