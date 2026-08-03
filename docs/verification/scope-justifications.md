# Scope justifications for the verification form

Paste ready. Keep the app description consistent with the consent screen name and the privacy page.

## App description (used across the form)

Suganthan's GSC MCP is a free, open source MCP (Model Context Protocol) server that runs entirely on the user's own computer. It lets the user's AI assistant (such as Claude) answer questions about the user's own Google Search Console data: quick win keywords, traffic drops, content decay, cannibalisation, CTR benchmarks, image search performance, and similar analyses. The software is a local command line process. It has no backend: the developer operates no servers, receives no user data, and stores nothing. OAuth tokens are cached only on the user's machine, and every API call goes directly from the user's machine to Google's APIs. Source code: https://github.com/Suganthan-Mohanadasan/Suganthans-GSC-MCP

By default the app requests only the read only scope. The two write scopes are requested solely when the user explicitly selects the full access option during setup, which enables the sitemap submission and URL submission features.

## https://www.googleapis.com/auth/webmasters.readonly

Requested by default for every user. Powers all 25 read only analysis tools: search analytics queries (Search Console `searchanalytics.query`) for keyword, page, device, country, and image search reports; `sites.list` to let the user choose which verified property to analyse; `sitemaps.list` to report sitemap status; and the URL Inspection API (`urlInspection.index.inspect`) to check whether specific pages are indexed. Data is fetched on demand in response to a question the user asks their AI assistant, displayed to the user, and not stored by the app beyond the current response.

## https://www.googleapis.com/auth/webmasters

Requested only when the user chooses full access during setup. Required by exactly one feature pair: `submit_sitemap`, which calls `sitemaps.submit` so the user can submit or resubmit their own sitemap from the assistant, and richer sitemap management the readonly scope does not permit. The action is always user initiated for the user's own verified property. Nothing is stored.

## https://www.googleapis.com/auth/indexing

Requested only when the user chooses full access during setup. Required by the `submit_url` and `submit_batch` features, which call the Web Search Indexing API's `urlNotifications.publish` so the user can notify Google about new or updated URLs on their own verified sites. The action is always explicit and user initiated. Nothing is stored.

## Why narrower scopes are insufficient

- The readonly scope cannot call `sitemaps.submit` or the Indexing API, so the two write scopes are the minimum for the submission features.
- The write scopes are not requested by default; users on the read only tier never see them on a consent screen.

## Limited Use statement (also on the privacy page)

The app's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. In practice the app exceeds those requirements: Google user data is processed only on the user's own device, is never transmitted to the developer or any third party by the app, is never used for advertising, and is never stored beyond the local OAuth token cache the user can delete at any time.
