"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCachedToken = loadCachedToken;
exports.saveCachedToken = saveCachedToken;
exports.getOAuthConfig = getOAuthConfig;
exports.authenticateWithOAuth = authenticateWithOAuth;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const TOKEN_DIR = path.join(os.homedir(), ".gsc-mcp");
const TOKEN_PATH = path.join(TOKEN_DIR, "oauth-token.json");
function ensureTokenDir() {
    if (!fs.existsSync(TOKEN_DIR)) {
        fs.mkdirSync(TOKEN_DIR, { recursive: true });
    }
}
function loadCachedToken() {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            const raw = fs.readFileSync(TOKEN_PATH, "utf8");
            return JSON.parse(raw);
        }
    }
    catch {
        // corrupted token file, will re-auth
    }
    return null;
}
function saveCachedToken(token) {
    ensureTokenDir();
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), "utf8");
}
function getOAuthConfig() {
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
    throw new Error("OAuth credentials not found. Set GSC_OAUTH_CLIENT_ID and GSC_OAUTH_CLIENT_SECRET, " +
        "or set GSC_OAUTH_SECRETS_FILE to a Google OAuth client secrets JSON file.");
}
/**
 * Starts a one-shot local HTTP server to capture the OAuth redirect.
 * Returns the authorization code.
 */
function startLocalCallbackServer(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url || "/", `http://localhost:${port}`);
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");
            if (error) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<html><body><h2>Authentication failed.</h2><p>You can close this tab.</p></body></html>");
                server.close();
                reject(new Error(`OAuth error: ${error}`));
                return;
            }
            if (code) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<html><body><h2>Authentication successful!</h2><p>You can close this tab and return to your MCP client.</p></body></html>");
                server.close();
                resolve(code);
                return;
            }
            res.writeHead(400);
            res.end("Missing code parameter");
        });
        server.listen(port, "127.0.0.1", () => {
            console.error(`OAuth callback server listening on http://127.0.0.1:${port}`);
        });
        server.on("error", reject);
        // Timeout after 2 minutes
        setTimeout(() => {
            server.close();
            reject(new Error("OAuth authentication timed out after 2 minutes"));
        }, 120000);
    });
}
/**
 * Runs the full OAuth2 flow: open browser, catch redirect, exchange code, cache token.
 * Returns an authenticated OAuth2 client.
 */
async function authenticateWithOAuth() {
    const { clientId, clientSecret } = getOAuthConfig();
    const callbackPort = 3847;
    const redirectUri = `http://127.0.0.1:${callbackPort}`;
    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
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
            }
            catch {
                console.error("Token refresh failed, re-authenticating...");
                return await runBrowserAuth(oauth2Client, callbackPort, redirectUri);
            }
        }
        else {
            console.error("Using cached OAuth token");
        }
        return oauth2Client;
    }
    return await runBrowserAuth(oauth2Client, callbackPort, redirectUri);
}
async function runBrowserAuth(oauth2Client, callbackPort, redirectUri) {
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
    }
    catch {
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
}
