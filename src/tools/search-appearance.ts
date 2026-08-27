import { fetchAllRows, getDateRange, SearchType } from "../analytics.js";

interface AppearanceRow {
  appearance: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface DrillRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchAppearanceResult {
  surface: SearchType;
  mode: "breakdown" | "drilldown";
  period: { startDate: string; endDate: string };
  appearanceBreakdown: AppearanceRow[];
  drilldown?: {
    appearance: string;
    dimension: "page" | "query";
    rows: DrillRow[];
  };
  note: string;
}

/**
 * Search-appearance breakdown (rich-result / feature types). Common values include
 * MERCHANT_LISTINGS (Händlereinträge), PRODUCT_SNIPPETS, REVIEW_SNIPPET,
 * RECIPE_FEATURE, VIDEO, AMP_* and others — the exact set is whatever the property
 * is eligible for. The API requires searchAppearance to be queried alone, so to see
 * which pages/queries drive a given appearance you must filter on it (drilldown).
 *
 * @param appearance Optional. If provided, drills into that appearance type and
 *                   returns the top pages (or queries) driving it.
 */
export async function searchAppearance(
  days: number = 28,
  appearance?: string,
  drillDimension: "page" | "query" = "page",
  searchType: SearchType = "web",
  rowLimit: number = 50,
  siteUrl?: string
): Promise<SearchAppearanceResult> {
  const period = getDateRange(days);

  // Step 1: always fetch the full appearance breakdown (searchAppearance alone).
  const breakdownRows = await fetchAllRows(
    {
      startDate: period.startDate,
      endDate: period.endDate,
      dimensions: ["searchAppearance"],
      type: searchType,
    },
    siteUrl
  );

  const appearanceBreakdown: AppearanceRow[] = breakdownRows
    .sort((a, b) => b.impressions - a.impressions)
    .map((r) => ({
      appearance: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
      position: Math.round(r.position * 10) / 10,
    }));

  let drilldown: SearchAppearanceResult["drilldown"];

  // Step 2: optional drilldown — filter on the appearance, group by page/query.
  if (appearance) {
    const drillRows = await fetchAllRows(
      {
        startDate: period.startDate,
        endDate: period.endDate,
        dimensions: [drillDimension],
        type: searchType,
        dimensionFilterGroups: [
          {
            filters: [
              { dimension: "searchAppearance", operator: "equals", expression: appearance },
            ],
          },
        ],
      },
      siteUrl
    );

    drilldown = {
      appearance,
      dimension: drillDimension,
      rows: drillRows
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, Math.min(rowLimit, 200))
        .map((r) => ({
          key: r.keys[0],
          clicks: r.clicks,
          impressions: r.impressions,
          ctr: Math.round(r.ctr * 10000) / 100,
          position: Math.round(r.position * 10) / 10,
        })),
    };
  }

  return {
    surface: searchType,
    mode: appearance ? "drilldown" : "breakdown",
    period,
    appearanceBreakdown,
    drilldown,
    note: appearance
      ? `Top ${drilldown?.dimension ?? "page"}s for appearance "${appearance}". Filtered via dimensionFilterGroups.`
      : "Appearance-type breakdown. Pass an `appearance` value (e.g. MERCHANT_LISTINGS) to drill into the pages or queries driving it.",
  };
}
