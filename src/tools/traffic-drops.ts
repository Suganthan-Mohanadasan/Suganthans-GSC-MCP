import { fetchAllRows, getDateRange, getPriorDateRange } from "../analytics.js";

interface TrafficDrop {
  page: string;
  currentClicks: number;
  priorClicks: number;
  clickChange: number;
  currentPosition: number;
  priorPosition: number;
  positionChange: number;
  diagnosis: string;
}

export async function trafficDrops(days: number = 28): Promise<TrafficDrop[]> {
  const current = getDateRange(days);
  const prior = getPriorDateRange(days);

  const [currentRows, priorRows] = await Promise.all([
    fetchAllRows({ startDate: current.startDate, endDate: current.endDate, dimensions: ["page"] }),
    fetchAllRows({ startDate: prior.startDate, endDate: prior.endDate, dimensions: ["page"] }),
  ]);

  const priorMap = new Map<string, { clicks: number; position: number; ctr: number }>();
  for (const row of priorRows) {
    priorMap.set(row.keys[0], {
      clicks: row.clicks,
      position: row.position,
      ctr: row.ctr,
    });
  }

  const drops: TrafficDrop[] = [];

  for (const row of currentRows) {
    const page = row.keys[0];
    const prior = priorMap.get(page);
    if (!prior) continue;

    const clickChange = row.clicks - prior.clicks;
    if (clickChange >= 0) continue; // only care about drops

    const positionChange = row.position - prior.position;

    let diagnosis: string;
    if (positionChange > 2) {
      diagnosis = "Ranking loss";
    } else if (row.ctr < prior.ctr * 0.7) {
      diagnosis = "CTR collapse (rankings stable, fewer clicks)";
    } else {
      diagnosis = "Impression decline (possible search demand drop)";
    }

    drops.push({
      page,
      currentClicks: row.clicks,
      priorClicks: prior.clicks,
      clickChange,
      currentPosition: Math.round(row.position * 10) / 10,
      priorPosition: Math.round(prior.position * 10) / 10,
      positionChange: Math.round(positionChange * 10) / 10,
      diagnosis,
    });
  }

  // Also flag pages that existed in prior but have zero/no data in current
  for (const [page, prior] of priorMap) {
    if (!currentRows.find((r) => r.keys[0] === page) && prior.clicks > 5) {
      drops.push({
        page,
        currentClicks: 0,
        priorClicks: prior.clicks,
        clickChange: -prior.clicks,
        currentPosition: 0,
        priorPosition: Math.round(prior.position * 10) / 10,
        positionChange: 0,
        diagnosis: "Page disappeared from search results",
      });
    }
  }

  drops.sort((a, b) => a.clickChange - b.clickChange); // most negative first
  return drops.slice(0, 50);
}
