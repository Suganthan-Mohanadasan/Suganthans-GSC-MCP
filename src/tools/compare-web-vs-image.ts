import { fetchAllRows, getDateRange, SearchAnalyticsRow } from "../analytics.js";

interface ComparisonRow {
  query: string;
  webClicks: number;
  webImpressions: number;
  webCtr: number;
  webPosition: number | null;
  imageClicks: number;
  imageImpressions: number;
  imageCtr: number;
  imagePosition: number | null;
  imageVsWebImpressionsRatio: number;
}

/**
 * For each query, returns side-by-side performance across the web and image
 * search surfaces. Two API calls (type=web, type=image), joined on query.
 *
 * The `imageVsWebImpressionsRatio` field surfaces queries where image search
 * carries a disproportionate share of impressions vs web search; on
 * image-heavy sites this ratio can exceed 1 across most of the catalogue.
 * `-1` indicates the query has image impressions but zero web impressions.
 */
export async function compareWebVsImage(
  days: number = 90,
  minCombinedImpressions: number = 100,
  rowLimit: number = 50
): Promise<ComparisonRow[]> {
  const { startDate, endDate } = getDateRange(days);

  const [webRows, imageRows] = await Promise.all([
    fetchAllRows({ startDate, endDate, dimensions: ["query"], type: "web" }),
    fetchAllRows({ startDate, endDate, dimensions: ["query"], type: "image" }),
  ]);

  const toMap = (rows: SearchAnalyticsRow[]): Map<string, SearchAnalyticsRow> => {
    const map = new Map<string, SearchAnalyticsRow>();
    for (const r of rows) {
      map.set(r.keys[0], r);
    }
    return map;
  };

  const webMap = toMap(webRows);
  const imageMap = toMap(imageRows);

  const queries = new Set<string>();
  for (const q of webMap.keys()) queries.add(q);
  for (const q of imageMap.keys()) queries.add(q);

  const results: ComparisonRow[] = [];
  for (const query of queries) {
    const web = webMap.get(query);
    const image = imageMap.get(query);

    const webImpr = web?.impressions || 0;
    const imageImpr = image?.impressions || 0;

    if (webImpr + imageImpr < minCombinedImpressions) continue;

    results.push({
      query,
      webClicks: web?.clicks || 0,
      webImpressions: webImpr,
      webCtr: web ? Math.round(web.ctr * 10000) / 100 : 0,
      webPosition: web ? Math.round(web.position * 10) / 10 : null,
      imageClicks: image?.clicks || 0,
      imageImpressions: imageImpr,
      imageCtr: image ? Math.round(image.ctr * 10000) / 100 : 0,
      imagePosition: image ? Math.round(image.position * 10) / 10 : null,
      imageVsWebImpressionsRatio:
        webImpr > 0
          ? Math.round((imageImpr / webImpr) * 100) / 100
          : -1,
    });
  }

  // Sort by combined impressions desc
  results.sort(
    (a, b) =>
      b.webImpressions + b.imageImpressions - (a.webImpressions + a.imageImpressions)
  );
  return results.slice(0, rowLimit);
}
