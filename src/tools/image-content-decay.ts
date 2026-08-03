import { fetchAllRows } from "../analytics.js";

interface DecayingImagePage {
  page: string;
  period1Clicks: number;
  period2Clicks: number;
  period3Clicks: number;
  totalClickLoss: number;
  period1Impressions: number;
  period2Impressions: number;
  period3Impressions: number;
  period1Position: number;
  period2Position: number;
  period3Position: number;
  positionTrend: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Image-search version of content-decay. Three 30-day windows running
 * back from yesterday. Pages with a consistent decline across all three
 * periods (clicks p3 > p2 > p1) are flagged, sorted by total click loss.
 *
 * Default minimum p3 clicks is lower than the web equivalent because image
 * search produces lower click volumes overall.
 */
export async function imageContentDecay(
  minPeriod3Clicks: number = 5
): Promise<DecayingImagePage[]> {
  const now = new Date();
  now.setDate(now.getDate() - 1);

  // Period 1: 0-30 days ago (most recent)
  const p1End = new Date(now);
  const p1Start = new Date(now);
  p1Start.setDate(p1Start.getDate() - 29);

  // Period 2: 31-60 days ago
  const p2End = new Date(p1Start);
  p2End.setDate(p2End.getDate() - 1);
  const p2Start = new Date(p2End);
  p2Start.setDate(p2Start.getDate() - 29);

  // Period 3: 61-90 days ago (oldest)
  const p3End = new Date(p2Start);
  p3End.setDate(p3End.getDate() - 1);
  const p3Start = new Date(p3End);
  p3Start.setDate(p3Start.getDate() - 29);

  const [rows1, rows2, rows3] = await Promise.all([
    fetchAllRows({
      startDate: formatDate(p1Start),
      endDate: formatDate(p1End),
      dimensions: ["page"],
      type: "image",
    }),
    fetchAllRows({
      startDate: formatDate(p2Start),
      endDate: formatDate(p2End),
      dimensions: ["page"],
      type: "image",
    }),
    fetchAllRows({
      startDate: formatDate(p3Start),
      endDate: formatDate(p3End),
      dimensions: ["page"],
      type: "image",
    }),
  ]);

  interface PageStats {
    clicks: number;
    impressions: number;
    position: number;
  }

  const toMap = (rows: typeof rows1): Map<string, PageStats> => {
    const map = new Map<string, PageStats>();
    for (const r of rows) {
      map.set(r.keys[0], {
        clicks: r.clicks,
        impressions: r.impressions,
        position: r.position,
      });
    }
    return map;
  };

  const map1 = toMap(rows1);
  const map2 = toMap(rows2);
  const map3 = toMap(rows3);

  const decaying: DecayingImagePage[] = [];

  for (const [page, p3] of map3) {
    const p2 = map2.get(page);
    const p1 = map1.get(page);

    if (!p2 || !p1) continue;

    // Consistent downward trend in image-search clicks
    if (p3.clicks <= p2.clicks || p2.clicks <= p1.clicks) continue;
    if (p3.clicks < minPeriod3Clicks) continue;

    const totalClickLoss = p3.clicks - p1.clicks;

    let positionTrend: string;
    if (p1.position > p3.position + 2) {
      positionTrend = "Image-search rankings declining";
    } else if (p1.position < p3.position - 2) {
      positionTrend =
        "Rankings improved but image-search clicks still dropped (thumbnail or CTR issue)";
    } else {
      positionTrend =
        "Rankings stable (likely thumbnail performance or query demand decline)";
    }

    decaying.push({
      page,
      period1Clicks: p1.clicks,
      period2Clicks: p2.clicks,
      period3Clicks: p3.clicks,
      totalClickLoss,
      period1Impressions: p1.impressions,
      period2Impressions: p2.impressions,
      period3Impressions: p3.impressions,
      period1Position: Math.round(p1.position * 10) / 10,
      period2Position: Math.round(p2.position * 10) / 10,
      period3Position: Math.round(p3.position * 10) / 10,
      positionTrend,
    });
  }

  decaying.sort((a, b) => b.totalClickLoss - a.totalClickLoss);
  return decaying.slice(0, 50);
}
