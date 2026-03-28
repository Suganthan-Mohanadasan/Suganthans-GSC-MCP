import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as os from "os";

let isAuthRunning = false;
let oauthServer: http.Server | null = null;
let currentAuthPromise: Promise<any> | null = null;

const TOKEN_DIR = path.join(os.homedir(), ".gsc-mcp");
const TOKEN_PATH = path.join(TOKEN_DIR, "oauth-token.json");

function ensureTokenDir(): void {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true });
  }
}

export function loadCachedToken(): any | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const raw = fs.readFileSync(TOKEN_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch {
    // corrupted token file, will re-auth
  }
  return null;
}

export function saveCachedToken(token: any): void {
  ensureTokenDir();
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), "utf8");
}

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function getOAuthConfig(): OAuthConfig {
  // Option 1: direct env vars
  const clientId = process.env.GSC_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return { clientId, clientSecret };
  }

  // Option 2: secrets file
  const secretsFile = process.env.GSC_OAUTH_SECRETS_FILE;
  if (secretsFile && fs.existsSync(secretsFile)) {
    const raw = JSON.parse(fs.readFileSync(secretsFile, "utf8"));
    const creds = raw.installed || raw.web;
    if (creds) {
      return {
        clientId: creds.client_id,
        clientSecret: creds.client_secret,
      };
    }
  }

  throw new Error(
    "OAuth credentials not found. Set GSC_OAUTH_CLIENT_ID and GSC_OAUTH_CLIENT_SECRET, " +
    "or set GSC_OAUTH_SECRETS_FILE to a Google OAuth client secrets JSON file."
  );
}

/**
 * Starts a one-shot local HTTP server to capture the OAuth redirect.
 * Returns the authorization code.
 */
function startLocalCallbackServer(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Before starting a new server:
    // If oauthServer exists, close it safely.
    if (oauthServer) {
      console.error("Closing existing OAuth server safely before starting a new one.");
      oauthServer.close();
      oauthServer = null;
    }

    // Only start server if not already listening
    if (!oauthServer || !(oauthServer as any).listening) {
      console.error("Starting new OAuth callback server...");
      oauthServer = http.createServer((req, res) => {
        const url = new URL(req.url || "/", `http://localhost:${port}`);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><body><h2>Authentication failed.</h2><p>You can close this tab.</p></body></html>");
          if (oauthServer) {
            oauthServer.close(() => console.error("OAuth server closed on error."));
            oauthServer = null;
          }
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><body><h2>Authentication successful!</h2><p>You can close this tab and return to your MCP client.</p></body></html>");
          if (oauthServer) {
            oauthServer.close(() => console.error("OAuth server closed on success."));
            oauthServer = null;
          }
          resolve(code);
          return;
        }

        res.writeHead(400);
        res.end("Missing code parameter");
      });

      oauthServer.listen(port, "127.0.0.1", () => {
        console.error(`OAuth callback server listening on http://127.0.0.1:${port}`);
      });

      oauthServer.on("error", (err: any) => {
        console.error(`OAuth server error: ${err.message}`);
        reject(err);
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        if (oauthServer) {
          oauthServer.close(() => console.error("OAuth server closed due to timeout."));
          oauthServer = null;
        }
        reject(new Error("OAuth authentication timed out after 2 minutes"));
      }, 120000);
    } else {
      console.error("OAuth server is already listening, reusing existing server.");
    }
  });
}

/**
 * Runs the full OAuth2 flow: open browser, catch redirect, exchange code, cache token.
 * Returns an authenticated OAuth2 client.
 */
export async function authenticateWithOAuth(): Promise<any> {
  const { clientId, clientSecret } = getOAuthConfig();
  const callbackPort = parseInt(process.env.OAUTH_PORT || "4010", 10);
  const redirectUri = `http://127.0.0.1:${callbackPort}`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Check for cached token
  const cachedToken = loadCachedToken();
  if (cachedToken) {
    oauth2Client.setCredentials(cachedToken);

    // Check if token needs refresh
    if (cachedToken.expiry_date && cachedToken.expiry_date < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        saveCachedToken(credentials);
        console.error("OAuth token refreshed successfully");
      } catch {
        console.error("Token refresh failed, re-authenticating...");
        return await runBrowserAuth(oauth2Client, callbackPort, redirectUri);
      }
    } else {
      console.error("Using cached OAuth token");
    }

    return oauth2Client;
  }

  return await runBrowserAuth(oauth2Client, callbackPort, redirectUri);
}

async function runBrowserAuth(
  oauth2Client: any,
  callbackPort: number,
  redirectUri: string
): Promise<any> {
  if (isAuthRunning && currentAuthPromise) {
    console.error("Authentication is already running. Preventing duplicate browser opening.");
    return currentAuthPromise;
  }

  isAuthRunning = true;
  console.error("--- Auth Start ---");

  currentAuthPromise = (async () => {
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/webmasters.readonly",
          "https://www.googleapis.com/auth/webmasters",
        ],
        prompt: "consent",
      });

      // Start callback server before opening browser
      const codePromise = startLocalCallbackServer(callbackPort);

      // Open browser
      console.error(`\nOpening browser for Google authentication...\nIf the browser doesn't open, visit this URL:\n${authUrl}\n`);
      try {
        const open = (await import("open")).default;
        await open(authUrl);
      } catch {
        console.error("Could not open browser automatically. Please visit the URL above.");
      }

      // Wait for the code
      const code = await codePromise;

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      saveCachedToken(tokens);
      console.error("OAuth authentication successful, token cached");

      return oauth2Client;
    } finally {
      isAuthRunning = false;
      currentAuthPromise = null;
      console.error("--- Auth End ---");
      // Ensure server shuts down after OAuth completes
      if (oauthServer) {
        console.error("Closing OAuth server after OAuth completes...");
        oauthServer.close();
        oauthServer = null;
      }
    }
  })();

  return currentAuthPromise;
}
