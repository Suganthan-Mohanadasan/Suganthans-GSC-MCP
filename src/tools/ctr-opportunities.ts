import {
  fetchAllRows,
  getDateRange,
  buildClickCurve,
  expectedCtr,
  CtrSource,
} from "../analytics.js";

interface CtrOpportunity {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  expectedCtr: number;
  ctrGap: number;
  potentialExtraClicks: number;
  /** Where the expectation came from: this property's own curve, or the study table. */
  expectedCtrSource: CtrSource;
}

export async function ctrOpportunities(
  days: number = 28,
  minImpressions: number = 500
): Promise<CtrOpportunity[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["page"],
  });

  // Build the curve on the unfiltered rows, otherwise it skews high.
  const curve = buildClickCurve(rows, "page rows of this request");

  const opportunities: CtrOpportunity[] = [];

  for (const row of rows) {
    if (row.impressions < minImpressions) continue;
    if (row.position > 20) continue; // only care about pages that rank somewhat

    const expectation = expectedCtr(row.position, curve);
    const expected = expectation.ctr;
    const gap = expected - row.ctr;

    if (gap <= 0.01) continue; // CTR is at or above benchmark

    opportunities.push({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(row.position * 10) / 10,
      expectedCtr: Math.round(expected * 10000) / 100,
      expectedCtrSource: expectation.source,
      ctrGap: Math.round(gap * 10000) / 100,
      potentialExtraClicks: Math.round(row.impressions * gap),
    });
  }

  opportunities.sort((a, b) => b.potentialExtraClicks - a.potentialExtraClicks);
  return opportunities.slice(0, 50);
}
