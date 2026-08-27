import {
  fetchAllRows,
  getDateRange,
  buildClickCurve,
  expectedCtr,
  CtrSource,
} from "../analytics.js";

interface QuickWin {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  opportunity: number;
  /** Where the target CTR came from: this property's own curve, or the study table. */
  targetCtrSource: CtrSource;
}

export async function quickWins(
  days: number = 28,
  minImpressions: number = 100,
  maxPosition: number = 15
): Promise<QuickWin[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["query"],
  });

  // Build the curve on the unfiltered rows, otherwise it skews high.
  const curve = buildClickCurve(rows, "query rows of this request");

  const wins: QuickWin[] = [];

  for (const row of rows) {
    const position = row.position;
    const impressions = row.impressions;

    if (position < 4 || position > maxPosition) continue;
    if (impressions < minImpressions) continue;

    // Opportunity = impressions * (CTR at position 3 - current CTR)
    const target = expectedCtr(3, curve);
    const currentCtr = row.ctr;
    const opportunity = Math.round(impressions * Math.max(0, target.ctr - currentCtr));

    wins.push({
      query: row.keys[0],
      clicks: row.clicks,
      impressions,
      ctr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(position * 10) / 10,
      opportunity,
      targetCtrSource: target.source,
    });
  }

  wins.sort((a, b) => b.opportunity - a.opportunity);
  return wins.slice(0, 50);
}
