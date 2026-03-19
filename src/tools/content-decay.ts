import { fetchAllRows } from "../analytics.js";

interface DecayingPage {
  page: string;
  period1Clicks: number;
  period2Clicks: number;
  period3Clicks: number;
  totalClickLoss: number;
  period1Position: number;
  period2Position: number;
  period3Position: number;
  positionTrend: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function contentDecay(): Promise<DecayingPage[]> {
  const now = new Date();
  now.setDate(now.getDate() - 1); // yesterday

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
    fetchAllRows({ startDate: formatDate(p1Start), endDate: formatDate(p1End), dimensions: ["page"] }),
    fetchAllRows({ startDate: formatDate(p2Start), endDate: formatDate(p2End), dimensions: ["page"] }),
    fetchAllRows({ startDate: formatDate(p3Start), endDate: formatDate(p3End), dimensions: ["page"] }),
  ]);

  const toMap = (rows: typeof rows1) => {
    const map = new Map<string, { clicks: number; position: number }>();
    for (const r of rows) {
      map.set(r.keys[0], { clicks: r.clicks, position: r.position });
    }
    return map;
  };

  const map1 = toMap(rows1);
  const map2 = toMap(rows2);
  const map3 = toMap(rows3);

  const decaying: DecayingPage[] = [];

  // Check all pages that exist in the oldest period
  for (const [page, p3] of map3) {
    const p2 = map2.get(page);
    const p1 = map1.get(page);

    if (!p2 || !p1) continue;

    // Consistent downward trend: p3 > p2 > p1 in clicks
    if (p3.clicks <= p2.clicks || p2.clicks <= p1.clicks) continue;

    // Must have had meaningful traffic in the oldest period
    if (p3.clicks < 10) continue;

    const totalClickLoss = p3.clicks - p1.clicks;

    let positionTrend: string;
    if (p1.position > p3.position + 2) {
      positionTrend = "Rankings declining";
    } else if (p1.position < p3.position - 2) {
      positionTrend = "Rankings improved but traffic still dropped (possible search demand decline)";
    } else {
      positionTrend = "Rankings stable (possible CTR or demand decline)";
    }

    decaying.push({
      page,
      period1Clicks: p1.clicks,
      period2Clicks: p2.clicks,
      period3Clicks: p3.clicks,
      totalClickLoss,
      period1Position: Math.round(p1.position * 10) / 10,
      period2Position: Math.round(p2.position * 10) / 10,
      period3Position: Math.round(p3.position * 10) / 10,
      positionTrend,
    });
  }

  decaying.sort((a, b) => b.totalClickLoss - a.totalClickLoss);
  return decaying.slice(0, 50);
}
