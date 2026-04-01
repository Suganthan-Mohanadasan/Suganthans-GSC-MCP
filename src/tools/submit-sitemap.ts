import { getSearchConsoleClient, getConfig } from "../auth.js";

interface SitemapSubmitResult {
  siteUrl: string;
  sitemapUrl: string;
  success: boolean;
  error: string | null;
  note?: string;
}

interface SitemapListResult {
  siteUrl: string;
  sitemaps: Array<{
    path: string;
    lastSubmitted: string | null;
    isPending: boolean;
    lastDownloaded: string | null;
    warnings: number;
    errors: number;
    contents: Array<{ type: string; submitted: number; indexed: number }>;
  }>;
  note?: string;
}

/**
 * Google's Sitemaps API does not support sc-domain: properties via service accounts.
 * This converts domain properties to URL-prefix format for sitemaps calls only.
 * Tries https:// first, then falls back to https://www. if the first attempt fails.
 */
function getSitemapSiteUrl(siteUrl: string): string {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.replace("sc-domain:", "");
    return `https://${domain}/`;
  }
  return siteUrl;
}

function getSitemapSiteUrlFallback(siteUrl: string): string | null {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.replace("sc-domain:", "");
    return `https://www.${domain}/`;
  }
  return null;
}

export async function submitSitemap(sitemapUrl?: string): Promise<SitemapSubmitResult> {
  const client = await getSearchConsoleClient();
  const { siteUrl: configSiteUrl } = getConfig();
  const sitemapSiteUrl = getSitemapSiteUrl(configSiteUrl);
  const usedFallback = sitemapSiteUrl !== configSiteUrl;

  const url = sitemapUrl || `${sitemapSiteUrl}sitemap.xml`;

  try {
    await client.sitemaps.submit({
      siteUrl: sitemapSiteUrl,
      feedpath: url,
    });

    return {
      siteUrl: sitemapSiteUrl,
      sitemapUrl: url,
      success: true,
      error: null,
      ...(usedFallback && {
        note: `Used URL-prefix property (${sitemapSiteUrl}) because Google's Sitemaps API does not support domain properties (${configSiteUrl}) with service accounts.`,
      }),
    };
  } catch (firstErr: any) {
    // If the primary URL-prefix failed, try the www variant
    const fallbackUrl = getSitemapSiteUrlFallback(configSiteUrl);
    if (fallbackUrl) {
      const fallbackSitemapUrl = sitemapUrl || `${fallbackUrl}sitemap.xml`;
      try {
        await client.sitemaps.submit({
          siteUrl: fallbackUrl,
          feedpath: fallbackSitemapUrl,
        });

        return {
          siteUrl: fallbackUrl,
          sitemapUrl: fallbackSitemapUrl,
          success: true,
          error: null,
          note: `Used URL-prefix property (${fallbackUrl}) because Google's Sitemaps API does not support domain properties (${configSiteUrl}) with service accounts.`,
        };
      } catch (_fallbackErr: any) {
        // Both failed, return helpful error
      }
    }

    const domain = configSiteUrl.startsWith("sc-domain:")
      ? configSiteUrl.replace("sc-domain:", "")
      : null;

    const hint = domain
      ? ` The Sitemaps API does not support domain properties (${configSiteUrl}) with service accounts. ` +
        `Add https://${domain}/ as a URL-prefix property in GSC and grant your service account Owner access.`
      : "";

    return {
      siteUrl: sitemapSiteUrl,
      sitemapUrl: url,
      success: false,
      error: (firstErr.message || String(firstErr)) + hint,
    };
  }
}

export async function listSitemaps(): Promise<SitemapListResult> {
  const client = await getSearchConsoleClient();
  const { siteUrl: configSiteUrl } = getConfig();
  const sitemapSiteUrl = getSitemapSiteUrl(configSiteUrl);
  const usedFallback = sitemapSiteUrl !== configSiteUrl;

  try {
    const response = await client.sitemaps.list({ siteUrl: sitemapSiteUrl });

    const sitemaps = (response.data.sitemap || []).map((s) => ({
      path: s.path || "",
      lastSubmitted: s.lastSubmitted || null,
      isPending: s.isPending || false,
      lastDownloaded: s.lastDownloaded || null,
      warnings: Number(s.warnings) || 0,
      errors: Number(s.errors) || 0,
      contents: (s.contents || []).map((c) => ({
        type: c.type || "unknown",
        submitted: Number(c.submitted) || 0,
        indexed: Number(c.indexed) || 0,
      })),
    }));

    return {
      siteUrl: sitemapSiteUrl,
      sitemaps,
      ...(usedFallback && {
        note: `Used URL-prefix property (${sitemapSiteUrl}) because Google's Sitemaps API does not support domain properties (${configSiteUrl}) with service accounts.`,
      }),
    };
  } catch (firstErr: any) {
    // If the primary URL-prefix failed, try the www variant
    const fallbackUrl = getSitemapSiteUrlFallback(configSiteUrl);
    if (fallbackUrl) {
      try {
        const response = await client.sitemaps.list({ siteUrl: fallbackUrl });

        const sitemaps = (response.data.sitemap || []).map((s) => ({
          path: s.path || "",
          lastSubmitted: s.lastSubmitted || null,
          isPending: s.isPending || false,
          lastDownloaded: s.lastDownloaded || null,
          warnings: Number(s.warnings) || 0,
          errors: Number(s.errors) || 0,
          contents: (s.contents || []).map((c) => ({
            type: c.type || "unknown",
            submitted: Number(c.submitted) || 0,
            indexed: Number(c.indexed) || 0,
          })),
        }));

        return {
          siteUrl: fallbackUrl,
          sitemaps,
          note: `Used URL-prefix property (${fallbackUrl}) because Google's Sitemaps API does not support domain properties (${configSiteUrl}) with service accounts.`,
        };
      } catch (_fallbackErr: any) {
        // Both failed, throw with helpful message
      }
    }

    const domain = configSiteUrl.startsWith("sc-domain:")
      ? configSiteUrl.replace("sc-domain:", "")
      : null;

    const hint = domain
      ? ` The Sitemaps API does not support domain properties (${configSiteUrl}) with service accounts. ` +
        `Add https://${domain}/ as a URL-prefix property in GSC and grant your service account Owner access.`
      : "";

    throw new Error((firstErr.message || String(firstErr)) + hint);
  }
}
