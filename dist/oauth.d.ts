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
