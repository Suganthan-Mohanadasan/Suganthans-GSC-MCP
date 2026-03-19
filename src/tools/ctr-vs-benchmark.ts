import { fetchAllRows, getDateRange } from "../analytics.js";

const BENCHMARK_CTR = [0.285, 0.157, 0.110, 0.080, 0.072, 0.051, 0.040, 0.032, 0.028, 0.025];

function benchmarkCtr(pos: number): number {
  if (pos <= 0) return 0.285;
  if (pos <= 10) return BENCHMARK_CTR[Math.floor(pos) - 1];
  return Math.max(0.005, 0.025 - (pos - 10) * 0.002);
}

interface CtrBenchmarkResult {
  page: string;
  clicks: number;
  impressions: number;
  actualCtr: number;
  position: number;
  benchmarkCtr: number;
  gap: number;
  verdict: string;
}

export async function ctrVsBenchmark(
  days: number = 28,
  minImpressions: number = 200
): Promise<CtrBenchmarkResult[]> {
  const { startDate, endDate } = getDateRange(days);

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: ["page"],
  });

  const results: CtrBenchmarkResult[] = [];

  for (const row of rows) {
    if (row.impressions < minImpressions) continue;
    if (row.position > 20) continue;

    const benchmark = benchmarkCtr(row.position);
    const gap = row.ctr - benchmark;
    const gapPercent = Math.round(gap * 10000) / 100;

    let verdict: string;
    if (gap >= 0.02) {
      verdict = "Above benchmark";
    } else if (gap >= -0.02) {
      verdict = "At benchmark";
    } else if (gap >= -0.05) {
      verdict = "Below benchmark — review title and meta description";
    } else {
      verdict = "Significantly below benchmark — likely needs title/description rewrite or rich snippet work";
    }

    results.push({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      actualCtr: Math.round(row.ctr * 10000) / 100,
      position: Math.round(row.position * 10) / 10,
      benchmarkCtr: Math.round(benchmark * 10000) / 100,
      gap: gapPercent,
      verdict,
    });
  }

  // Sort by gap ascending (worst performers first)
  results.sort((a, b) => a.gap - b.gap);
  return results.slice(0, 50);
}
