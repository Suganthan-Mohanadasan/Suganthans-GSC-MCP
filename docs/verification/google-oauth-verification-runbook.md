# Google OAuth verification runbook

Goal: a verified public OAuth client whose ID and secret ship inside this package (`src/embedded-client.ts`), so users sign in with Google and never open Google Cloud Console. Until verification clears, the embedded constants stay empty and setup falls back to bring your own client.

Status tracker

| Step | State |
|---|---|
| 1. Create dedicated project | not started |
| 2. Enable APIs | not started |
| 3. Consent screen + branding | not started |
| 4. Add scopes | not started |
| 5. Create desktop OAuth client | not started |
| 6. Deploy privacy page | drafted, awaiting review (site repo, `/gsc-mcp/privacy/`) |
| 7. Record demo video | script ready (`demo-video-script.md`) |
| 8. Submit for verification | blocked on 1 to 7 |
| 9. Fill embedded-client.ts, publish 2.3.1 | blocked on 8 |

## 1. Create a dedicated project

console.cloud.google.com > project picker > New project.

- Name: `GSC MCP Public`
- No organisation

Why dedicated: verification, quota, and any future incident stay isolated from the personal `suganthans-gsc-mcp` project that holds the BigQuery export and service accounts.

## 2. Enable APIs

APIs & Services > Library, enable both:

- **Google Search Console API**
- **Web Search Indexing API** (powers `submit_url` / `submit_batch`)

## 3. OAuth consent screen (Google Auth Platform > Branding)

- App name: `Suganthan's GSC MCP` (do not include the word Google, it fails branding review)
- User support email: an address you check, ideally on suganthan.com
- App logo: optional. Uploading one adds a branding review pass; we are verifying anyway, so a logo is fine but not required for launch
- App home page: `https://suganthan.com/blog/google-search-console-mcp-server/`
- Privacy policy: `https://suganthan.com/gsc-mcp/privacy/` (must be live before submission)
- Authorised domain: `suganthan.com` (already verified via Search Console, so this passes instantly)
- Developer contact email: same support address
- Audience: External. Start in Testing with your own account as a test user, switch to In production when submitting

## 4. Scopes

Google Auth Platform > Data access > Add or remove scopes. Add all three:

| Scope | Classification |
|---|---|
| `https://www.googleapis.com/auth/webmasters.readonly` | sensitive |
| `https://www.googleapis.com/auth/webmasters` | sensitive |
| `https://www.googleapis.com/auth/indexing` | sensitive |

All sensitive, none restricted, so verification is the standard review. No CASA security assessment is required.

Note for the form: the app defaults to requesting only `webmasters.readonly` (the read only tier). The other two are requested only when the user explicitly chooses full access during setup. Say this in the justification, reviewers look favourably on minimal default scope requests.

## 5. Create the OAuth client

APIs & Services > Credentials > Create credentials > OAuth client ID.

- Application type: **Desktop app**
- Name: `gsc-mcp-desktop`

Download the JSON. The `client_id` and `client_secret` go into `src/embedded-client.ts` ONLY after verification clears (step 9). Keep the JSON somewhere safe meanwhile; it is not confidential in the installed app flow, but there is no reason to publish it early and burn the 100 user pre-verification cap.

## 6. Privacy page

Deploy `/gsc-mcp/privacy/` on suganthan.com (drafted in the site repo). Google's reviewers check that the page:

- is reachable from the app's home page domain
- names the app as it appears on the consent screen
- states what data is accessed and that it stays on the user's machine
- contains the Limited Use disclosure verbatim (see the draft)

## 7. Demo video

Record per `demo-video-script.md`, upload to YouTube as Unlisted, keep the URL for the form.

## 8. Submit

Google Auth Platform > Verification Centre (appears once the app is In production with sensitive scopes). Provide:

- Scope justifications: paste from `scope-justifications.md`
- Demo video URL
- Confirmation of Limited Use compliance

Then watch the developer contact inbox. Reviewers reply by email, sometimes with clarifying questions, and the clock resets if replies sit unanswered. Expect days to a few weeks end to end.

## 9. After approval

1. Fill `EMBEDDED_CLIENT_ID` and `EMBEDDED_CLIENT_SECRET` in `src/embedded-client.ts`
2. `npm run build`, bump to 2.3.1, `npm publish`
3. Flip the README quick start to lead with `npx suganthan-gsc-mcp setup` and no Google Cloud steps
4. Update the .mcpb bundle so the one click desktop install also carries the embedded client
5. Announce: the one command setup is the story

## Constraints to remember

- **Before verification**: any user of the embedded client sees the "Google hasn't verified this app" interstitial, and the client is capped at 100 users total. This is why the constants ship empty until approval.
- **Quota**: Search Console API quotas are partly per project. Every embedded client user draws from the `GSC MCP Public` project's pool. At current adoption (~7,900 npm downloads a month) this should hold for a long while, but watch APIs & Services > Quotas, request an increase early if usage climbs, and keep the bring your own client path documented as the escape hatch.
- **Annual reverification**: Google re-reviews sensitive scope apps yearly and whenever scopes change. Adding a scope later restarts review, so the three above are submitted together even though the default tier only uses one.
