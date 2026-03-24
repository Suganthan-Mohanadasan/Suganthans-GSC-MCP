import { fetchAllRows, getDateRange } from "../analytics.js";

interface VerificationResult {
  claim: string;
  metric: string;
  url?: string;
  query?: string;
  expected_value: number;
  actual_value: number | null;
  period: { startDate: string; endDate: string };
  verified: boolean;
  discrepancy: string | null;
}

/**
 * Verify a specific numeric claim against live GSC data.
 * Use this to self-check before presenting findings to the user.
 */
export async function verifyClaim(
  claim: string,
  metric: "clicks" | "impressions" | "ctr" | "position",
  expectedValue: number,
  url?: string,
  query?: string,
  days: number = 28
): Promise<VerificationResult> {
  const { startDate, endDate } = getDateRange(days);

  const dimensions: string[] = [];
  const filters: Array<{
    filters: Array<{ dimension: string; operator: string; expression: string }>;
  }> = [];

  if (url && query) {
    dimensions.push("page", "query");
    filters.push({
      filters: [
        { dimension: "page", operator: "equals", expression: url },
        { dimension: "query", operator: "equals", expression: query },
      ],
    });
  } else if (url) {
    dimensions.push("page");
    filters.push({
      filters: [{ dimension: "page", operator: "equals", expression: url }],
    });
  } else if (query) {
    dimensions.push("query");
    filters.push({
      filters: [{ dimension: "query", operator: "equals", expression: query }],
    });
  }

  const rows = await fetchAllRows({
    startDate,
    endDate,
    dimensions: dimensions.length > 0 ? dimensions : ["date"],
    dimensionFilterGroups: filters.length > 0 ? filters : undefined,
  });

  let actualValue: number | null = null;

  if (rows.length > 0) {
    if (metric === "clicks") {
      actualValue = rows.reduce((sum, r) => sum + r.clicks, 0);
    } else if (metric === "impressions") {
      actualValue = rows.reduce((sum, r) => sum + r.impressions, 0);
    } else if (metric === "ctr") {
      const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
      const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
      actualValue =
        totalImpressions > 0
          ? Math.round((totalClicks / totalImpressions) * 10000) / 100
          : 0;
    } else if (metric === "position") {
      actualValue =
        Math.round(
          (rows.reduce((sum, r) => sum + r.position, 0) / rows.length) * 10
        ) / 10;
    }
  }

  const tolerance = metric === "position" ? 0.5 : expectedValue * 0.05;
  const verified =
    actualValue !== null && Math.abs(actualValue - expectedValue) <= tolerance;

  let discrepancy: string | null = null;
  if (actualValue === null) {
    discrepancy = "No data found for the specified filters.";
  } else if (!verified) {
    discrepancy = `Expected ${expectedValue}, actual ${actualValue} (difference: ${Math.abs(actualValue - expectedValue).toFixed(2)}).`;
  }

  return {
    claim,
    metric,
    url,
    query,
    expected_value: expectedValue,
    actual_value: actualValue,
    period: { startDate, endDate },
    verified,
    discrepancy,
  };
}
