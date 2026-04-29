import { google } from "googleapis";
import { searchconsole_v1 } from "googleapis";
import * as fs from "fs";
import { authenticateWithOAuth } from "./oauth.js";

let cachedClient: searchconsole_v1.Searchconsole | null = null;

export type AuthMode = "service_account" | "oauth";

export function getAuthMode(): AuthMode {
  const mode = process.env.GSC_AUTH_MODE?.toLowerCase();
  if (mode === "oauth") return "oauth";
  return "service_account";
}

export function getConfig() {
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
      throw new Error(
        "GSC_KEY_FILE environment variable is required in service_account mode. " +
        "Set it to the path of your service account JSON key file, " +
        "or switch to OAuth by setting GSC_AUTH_MODE=oauth."
      );
    }
    if (!siteUrl && siteUrls.length === 0) {
      throw new Error(
        "GSC_SITE_URL environment variable is required. " +
        "Set it to your GSC property URL (e.g. https://yoursite.com/ or sc-domain:yoursite.com)."
      );
    }
    if (!fs.existsSync(keyFile)) {
      throw new Error(`Service account key file not found at: ${keyFile}`);
    }
    return { keyFile, siteUrl: siteUrl || siteUrls[0], siteUrls };
  }

  // OAuth mode
  if (!siteUrl && siteUrls.length === 0) {
    throw new Error(
      "GSC_SITE_URL environment variable is required. " +
      "Set it to your GSC property URL (e.g. https://yoursite.com/ or sc-domain:yoursite.com)."
    );
  }
  return { keyFile: undefined, siteUrl: siteUrl || siteUrls[0], siteUrls };
}

async function getServiceAccountClient(): Promise<searchconsole_v1.Searchconsole> {
  const { keyFile } = getConfig();

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/webmasters",
      "https://www.googleapis.com/auth/indexing",
    ],
  });

  google.options({ auth });
  return google.searchconsole("v1");
}

async function getOAuthClient(): Promise<searchconsole_v1.Searchconsole> {
  const oauth2Client = await authenticateWithOAuth();
  google.options({ auth: oauth2Client });
  return google.searchconsole("v1");
}

export async function getSearchConsoleClient(): Promise<searchconsole_v1.Searchconsole> {
  if (cachedClient) return cachedClient;

  const mode = getAuthMode();

  if (mode === "oauth") {
    cachedClient = await getOAuthClient();
  } else {
    cachedClient = await getServiceAccountClient();
  }

  return cachedClient;
}
