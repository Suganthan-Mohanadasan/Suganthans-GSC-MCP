import { google } from "googleapis";
import { searchconsole_v1 } from "googleapis";
import * as fs from "fs";

let cachedClient: searchconsole_v1.Searchconsole | null = null;

export function getConfig() {
  const keyFile = process.env.GSC_KEY_FILE;
  const siteUrl = process.env.GSC_SITE_URL;

  if (!keyFile) {
    throw new Error(
      "GSC_KEY_FILE environment variable is required. Set it to the path of your service account JSON key file."
    );
  }
  if (!siteUrl) {
    throw new Error(
      "GSC_SITE_URL environment variable is required. Set it to your GSC property URL (e.g. https://yoursite.com/)."
    );
  }
  if (!fs.existsSync(keyFile)) {
    throw new Error(`Service account key file not found at: ${keyFile}`);
  }

  return { keyFile, siteUrl };
}

export async function getSearchConsoleClient(): Promise<searchconsole_v1.Searchconsole> {
  if (cachedClient) return cachedClient;

  const { keyFile } = getConfig();

  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/webmasters",
    ],
  });

  google.options({ auth });

  cachedClient = google.searchconsole("v1");
  return cachedClient;
}
