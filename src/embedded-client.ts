/**
 * Embedded OAuth client for one-command setup.
 *
 * These are the credentials of a public Google OAuth "Desktop app" client owned
 * by the project maintainer. Shipping a desktop client ID and secret in an open
 * source package is standard practice (rclone and gcloud both do it): Google's
 * installed-app flow explicitly treats desktop client secrets as
 * non-confidential, because a binary on the user's machine can never keep a
 * secret. The client identifies the APP to Google's consent screen. It grants
 * no access by itself: every user still signs in with their own Google account
 * and their tokens are stored only on their own machine (~/.gsc-mcp/).
 *
 * Users who prefer their own client can set GSC_OAUTH_CLIENT_ID and
 * GSC_OAUTH_CLIENT_SECRET, or GSC_OAUTH_SECRETS_FILE, which always take
 * precedence (see getOAuthConfig in oauth.ts).
 *
 * Both constants stay empty until the public client passes Google's OAuth
 * verification for the Search Console scopes. While they are empty, setup
 * requires a bring-your-own client and says so.
 */
export const EMBEDDED_CLIENT_ID = "";
export const EMBEDDED_CLIENT_SECRET = "";

export function embeddedClientAvailable(): boolean {
  return EMBEDDED_CLIENT_ID.length > 0 && EMBEDDED_CLIENT_SECRET.length > 0;
}
