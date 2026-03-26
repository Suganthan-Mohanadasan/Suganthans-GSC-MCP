import { getSearchConsoleClient, getConfig } from "../auth.js";

interface SitemapSubmitResult {
  siteUrl: string;
  sitemapUrl: string;
  success: boolean;
  error: string | null;
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
}

export async function submitSitemap(sitemapUrl?: string): Promise<SitemapSubmitResult> {
  const client = await getSearchConsoleClient();
  const { siteUrl } = getConfig();

  const url = sitemapUrl || `${siteUrl}sitemap.xml`;

  try {
    await client.sitemaps.submit({
      siteUrl,
      feedpath: url,
    });

    return {
      siteUrl,
      sitemapUrl: url,
      success: true,
      error: null,
    };
  } catch (err: any) {
    return {
      siteUrl,
      sitemapUrl: url,
      success: false,
      error: err.message || String(err),
    };
  }
}

export async function listSitemaps(): Promise<SitemapListResult> {
  const client = await getSearchConsoleClient();
  const { siteUrl } = getConfig();

  const response = await client.sitemaps.list({ siteUrl });

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
    siteUrl,
    sitemaps,
  };
}
