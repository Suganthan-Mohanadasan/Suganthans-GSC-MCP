import { fetchAllRows, getDateRange, getPriorDateRange } from "../analytics.js";

interface SiteSnapshot {
  period: { startDate: string; endDate: string };
  current: { clicks: number; impressions: number; ctr: number; position: number };
  prior: { clicks: number; impressions: number; ctr: number; position: number };
  change: {
    clicks: number;
    clicksPercent: number;
    impressions: number;
    impressionsPercent: number;
    ctr: number;
    position: number;
  };
}

export async function siteSnapshot(days: number = 28): Promise<SiteSnapshot> {
  const current = getDateRange(days);
  const prior = getPriorDateRange(days);

  const [currentRows, priorRows] = await Promise.all([
    fetchAllRows({ startDate: current.startDate, endDate: current.endDate, dimensions: ["date"] }),
    fetchAllRows({ startDate: prior.startDate, endDate: prior.endDate, dimensions: ["date"] }),
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

  return {
    period: current,
    current: c,
    prior: p,
    change: {
      clicks: c.clicks - p.clicks,
      clicksPercent: p.clicks > 0 ? Math.round(((c.clicks - p.clicks) / p.clicks) * 10000) / 100 : 0,
      impressions: c.impressions - p.impressions,
      impressionsPercent: p.impressions > 0 ? Math.round(((c.impressions - p.impressions) / p.impressions) * 10000) / 100 : 0,
      ctr: Math.round((c.ctr - p.ctr) * 100) / 100,
      position: Math.round((c.position - p.position) * 10) / 10,
    },
  };
}
