# Demo video script (OAuth verification)

Requirements the video must satisfy: show the OAuth consent flow with the app name and client ID visible, demonstrate each requested scope actually being used by a feature, and show where data ends up. Unlisted YouTube upload, English captions or narration, under 5 minutes is plenty.

Record at 1080p or higher so the consent screen text is legible. Use a test property, or suganthan.com with nothing sensitive on screen.

## Shot list

**1. Identity (20s).**
Show the GitHub repo page and the npm package page side by side. Say: "Suganthan's GSC MCP is a free, open source MCP server that runs on the user's own computer. It has no backend and the developer receives no data."

**2. Consent flow (60s).**
Terminal: run `npx suganthan-gsc-mcp setup`. Choose full access so all three scopes appear. Browser opens: show the Google account picker, then the consent screen. Pause on the consent screen so the app name "Suganthan's GSC MCP" and the three requested permissions are clearly readable. Approve. Back in the terminal, show the property list appearing and pick one.

**3. Readonly scope in use (60s).**
Open Claude Desktop. Ask: "What are my quick win keywords?" Show the response rendering real Search Console data. Say: "This is the webmasters.readonly scope: search analytics queries for the user's own property, fetched on demand and shown to the user."

**4. Webmasters scope in use (30s).**
Ask: "Submit my sitemap." Show the success response. Say: "This is the webmasters scope: sitemaps.submit for the user's own property, always user initiated."

**5. Indexing scope in use (30s).**
Ask: "Submit this URL for indexing: <URL on the property>." Show the success response. Say: "This is the indexing scope: urlNotifications.publish for the user's own site, always user initiated."

**6. Data locality (30s).**
Terminal: `ls ~/.gsc-mcp/` and show `oauth-token.json`. Say: "The OAuth token is cached here on the user's machine and API responses go straight from Google to this machine. The developer operates no servers and receives nothing. Access can be revoked at any time at myaccount.google.com/permissions", and show that page briefly.

## Upload

YouTube, Unlisted, title "Suganthan's GSC MCP: OAuth verification demo". Paste the URL into the verification form.
