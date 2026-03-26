import { fetchAllRows, getDateRange, getPriorDateRange } from "../analytics.js";
import { getConfig } from "../auth.js";

interface SiteHealth {
  siteUrl: string;
  current: { clicks: number; impressions: number; ctr: number; position: number };
  change: {
    clicksPercent: number;
    impressionsPercent: number;
    ctr: number;
    position: number;
  };
  health: "healthy" | "warning" | "declining";
}

interface MultiSiteDashboardResult {
  periodDays: number;
  sites: SiteHealth[];
  summary: string;
}

async function siteSnapshotForUrl(
  siteUrl: string,
  days: number
): Promise<SiteHealth> {
  const current = getDateRange(days);
  const prior = getPriorDateRange(days);

  const [currentRows, priorRows] = await Promise.all([
    fetchAllRows({ startDate: current.startDate, endDate: current.endDate, dimensions: ["date"] }, siteUrl),
    fetchAllRows({ startDate: prior.startDate, endDate: prior.endDate, dimensions: ["date"] }, siteUrl),
  ]);

  const sum = (rows: typeof currentRows) => {
    let clicks = 0, impressions = 0, posSum = 0, posCount = 0;
    for (const r of rows) {
      clicks += r.clicks;
      impressions += r.impressions;
      posSum += r.position;
      posCount++;
    }
    return {
      clicks,
      impressions,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      position: posCount > 0 ? Math.round((posSum / posCount) * 10) / 10 : 0,
    };
  };

  const c = sum(currentRows);
  const p = sum(priorRows);

  const clicksPercent = p.clicks > 0
    ? Math.round(((c.clicks - p.clicks) / p.clicks) * 10000) / 100
    : 0;

  let health: "healthy" | "warning" | "declining";
  if (clicksPercent >= 0) {
    health = "healthy";
  } else if (clicksPercent > -20) {
    health = "warning";
  } else {
    health = "declining";
  }

  return {
    siteUrl,
    current: c,
    change: {
      clicksPercent,
      impressionsPercent: p.impressions > 0
        ? Math.round(((c.impressions - p.impressions) / p.impressions) * 10000) / 100
        : 0,
      ctr: Math.round((c.ctr - p.ctr) * 100) / 100,
      position: Math.round((c.position - p.position) * 10) / 10,
    },
    health,
  };
}

export async function multiSiteDashboard(
  siteUrls?: string[],
  days: number = 28
): Promise<MultiSiteDashboardResult> {
  const config = getConfig();

  const urls = siteUrls && siteUrls.length > 0
    ? siteUrls
    : config.siteUrls.length > 0
      ? config.siteUrls
      : [config.siteUrl];

  if (urls.length === 0) {
    throw new Error(
      "No site URLs provided. Pass site_urls parameter or set GSC_SITE_URLS environment variable."
    );
  }

  // Run all site snapshots in parallel
  const sites = await Promise.all(urls.map((url) => siteSnapshotForUrl(url, days)));

  const healthyCount = sites.filter((s) => s.health === "healthy").length;
  const warningCount = sites.filter((s) => s.health === "warning").length;
  const decliningCount = sites.filter((s) => s.health === "declining").length;

  const summary =
    `${sites.length} sites analysed over ${days} days. ` +
    `${healthyCount} healthy, ${warningCount} warning, ${decliningCount} declining.`;

  return {
    periodDays: days,
    sites,
    summary,
  };
}
