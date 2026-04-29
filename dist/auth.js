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
exports.getAuthMode = getAuthMode;
exports.getConfig = getConfig;
exports.getSearchConsoleClient = getSearchConsoleClient;
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const oauth_js_1 = require("./oauth.js");
let cachedClient = null;
function getAuthMode() {
    const mode = process.env.GSC_AUTH_MODE?.toLowerCase();
    if (mode === "oauth")
        return "oauth";
    return "service_account";
}
function getConfig() {
    const mode = getAuthMode();
    const siteUrl = process.env.GSC_SITE_URL;
    const siteUrls = process.env.GSC_SITE_URLS
        ? process.env.GSC_SITE_URLS.split(",").map((s) => s.trim()).filter(Boolean)
        : siteUrl
            ? [siteUrl]
            : [];
    if (mode === "service_account") {
        const keyFile = process.env.GSC_KEY_FILE;
        if (!keyFile) {
            throw new Error("GSC_KEY_FILE environment variable is required in service_account mode. " +
                "Set it to the path of your service account JSON key file, " +
                "or switch to OAuth by setting GSC_AUTH_MODE=oauth.");
        }
        if (!siteUrl && siteUrls.length === 0) {
            throw new Error("GSC_SITE_URL environment variable is required. " +
                "Set it to your GSC property URL (e.g. https://yoursite.com/ or sc-domain:yoursite.com).");
        }
        if (!fs.existsSync(keyFile)) {
            throw new Error(`Service account key file not found at: ${keyFile}`);
        }
        return { keyFile, siteUrl: siteUrl || siteUrls[0], siteUrls };
    }
    // OAuth mode
    if (!siteUrl && siteUrls.length === 0) {
        throw new Error("GSC_SITE_URL environment variable is required. " +
            "Set it to your GSC property URL (e.g. https://yoursite.com/ or sc-domain:yoursite.com).");
    }
    return { keyFile: undefined, siteUrl: siteUrl || siteUrls[0], siteUrls };
}
async function getServiceAccountClient() {
    const { keyFile } = getConfig();
    const auth = new googleapis_1.google.auth.GoogleAuth({
        keyFile,
        scopes: [
            "https://www.googleapis.com/auth/webmasters.readonly",
            "https://www.googleapis.com/auth/webmasters",
            "https://www.googleapis.com/auth/indexing",
        ],
    });
    googleapis_1.google.options({ auth });
    return googleapis_1.google.searchconsole("v1");
}
async function getOAuthClient() {
    const oauth2Client = await (0, oauth_js_1.authenticateWithOAuth)();
    googleapis_1.google.options({ auth: oauth2Client });
    return googleapis_1.google.searchconsole("v1");
}
async function getSearchConsoleClient() {
    if (cachedClient)
        return cachedClient;
    const mode = getAuthMode();
    if (mode === "oauth") {
        cachedClient = await getOAuthClient();
    }
    else {
        cachedClient = await getServiceAccountClient();
    }
    return cachedClient;
}
