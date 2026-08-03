export type ScopeTier = "readonly" | "full";
/**
 * GSC_SCOPES=readonly requests only webmasters.readonly, which keeps the
 * Google consent screen to a single read-only permission. The default is
 * "full" (read + sitemap submission + Indexing API) so existing installs
 * keep working exactly as before this option existed.
 */
export declare function getScopeTier(): ScopeTier;
export declare function scopesForTier(tier: ScopeTier): string[];
export declare function clearCachedToken(): void;
export declare function tokenPath(): string;
export declare function loadCachedToken(): any | null;
export declare function saveCachedToken(token: any): void;
interface OAuthConfig {
    clientId: string;
    clientSecret: string;
}
export declare function getOAuthConfig(): OAuthConfig;
/**
 * Runs the full OAuth2 flow: open browser, catch redirect, exchange code, cache token.
 * Returns an authenticated OAuth2 client.
 */
export declare function authenticateWithOAuth(): Promise<any>;
export {};
