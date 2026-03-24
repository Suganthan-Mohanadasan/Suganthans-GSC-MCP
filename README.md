# Google Search Console MCP Server

An MCP server that connects Claude to your Google Search Console data. Ask questions about your traffic, rankings, and content performance in plain English.

No subscriptions. No API costs. Your data stays on your machine.

**Full setup guide and walkthrough:** [suganthan.com/blog/google-search-console-mcp-server/](https://suganthan.com/blog/google-search-console-mcp-server/)

## What it does

11 built in tools that cover the things you actually check:

| Tool | What it does |
|---|---|
| `site_snapshot` | Overall performance vs previous period with percentage changes |
| `quick_wins` | Keywords at positions 4 to 15 with high impressions you could push to page one |
| `content_gaps` | Queries where you get impressions but rank beyond position 20 |
| `traffic_drops` | Pages that lost traffic, diagnosed as ranking loss, CTR collapse, or demand decline |
| `ctr_opportunities` | Pages with CTR below benchmark for their position (title/meta candidates) |
| `cannibalization_check` | Keywords where multiple pages from your site compete against each other |
| `content_decay` | Pages with three consecutive months of traffic decline |
| `inspect_url` | Indexing status, crawl info, canonical issues, mobile usability |
| `topic_cluster_performance` | Aggregate performance for all pages under a URL path |
| `ctr_vs_benchmark` | Your actual CTR compared to industry averages by position |
| `verify_claim` | Self-check: verifies a specific numeric claim against live GSC data |

Because it runs through Claude, you can ask follow up questions, combine analyses, and get recommendations, not just raw data.

## Hallucination guardrails

MCP servers return real data from real APIs. But the AI model interpreting that data can still make mistakes: rounding numbers, inventing explanations, or filling gaps with assumptions from its training data.

This server has three layers of protection against that, added after feedback from [Krinal Mehta](https://www.linkedin.com/in/krinal/):

**1. Guardrail prompts.** Every tool description includes an explicit instruction telling the model to base its analysis only on the returned data, report exact numbers, and say "I don't know" rather than speculate about causes the data doesn't support.

**2. Data provenance metadata.** Every response includes a `_meta` field confirming the data source (Google Search Console API), the tool that produced it, and the parameters used. This anchors the model to the actual numbers rather than its training data.

**3. Verify claim tool.** A dedicated `verify_claim` tool that lets the model self-check before presenting findings. Pass a claim ("homepage gets 500 clicks"), the metric, and the expected value. The tool re-queries the API and returns whether the claim is verified, with any discrepancy noted.

These don't eliminate the possibility of misinterpretation, but they significantly reduce it. The data itself is always exact (it comes directly from Google's API), and the model is explicitly told to treat it as such.

## Requirements

- Node.js 18 or later
- A Google Cloud project (free)
- Google Search Console API enabled (free)
- A service account with access to your Search Console property
- Claude Desktop or Claude Code

## Quick start

### 1. Google Cloud setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a new project
2. Search for **Google Search Console API** and enable it
3. Go to **IAM & Admin > Service Accounts** and create a service account
4. Create a JSON key for the service account and download it
5. In [Google Search Console](https://search.google.com/search-console), go to **Settings > Users and permissions** and add the service account email with **Full** permission

### 2. Configure Claude Desktop

Add this to your Claude Desktop MCP config (`Settings > Developer > Edit Config`):

```json
{
  "mcpServers": {
    "gsc": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/gsc-mcp"],
      "env": {
        "GSC_KEY_FILE": "/path/to/your/service-account-key.json",
        "GSC_SITE_URL": "sc-domain:yourdomain.com"
      }
    }
  }
}
```

### Or with Claude Code

```bash
claude mcp add gsc -- npx -y @anthropic-ai/gsc-mcp
```

Then set the environment variables in your config.

### 3. Restart Claude and ask a question

```
"Give me a snapshot of how my site is performing"
"What are my quick win keywords?"
"Which pages lost traffic this month?"
```

## Important: Domain property format

If your Search Console property is a **Domain property** (most are), set `GSC_SITE_URL` to:

```
sc-domain:yourdomain.com
```

Not `https://yourdomain.com/`. This is the most common setup issue.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GSC_KEY_FILE` | Yes | Absolute path to your service account JSON key file |
| `GSC_SITE_URL` | Yes | Your Search Console property URL. Use `sc-domain:example.com` for Domain properties or `https://example.com/` for URL prefix properties |

## Running from source

```bash
git clone https://github.com/Suganthan-Mohanadasan/Suganthans-GSC-MCP.git
cd Suganthans-GSC-MCP
npm install
npm run build
```

Then point your MCP config to the local build:

```json
{
  "mcpServers": {
    "gsc": {
      "command": "node",
      "args": ["/path/to/Suganthans-GSC-MCP/dist/index.js"],
      "env": {
        "GSC_KEY_FILE": "/path/to/your/service-account-key.json",
        "GSC_SITE_URL": "sc-domain:yourdomain.com"
      }
    }
  }
}
```

## Privacy and security

- Runs entirely on your machine
- Connects directly to Google's API using your own credentials
- No data sent to third party services
- No analytics, tracking, or telemetry
- Open source: read every line of code yourself

## Licence

MIT

## Author

Built by [Suganthan Mohanadasan](https://suganthan.com). If you find it useful, give it a star.
