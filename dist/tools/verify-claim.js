"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyClaim = verifyClaim;
const analytics_js_1 = require("../analytics.js");
/**
 * Verify a specific numeric claim against live GSC data.
 * Use this to self-check before presenting findings to the user.
 */
async function verifyClaim(claim, metric, expectedValue, url, query, days = 28) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const dimensions = [];
    const filters = [];
    if (url && query) {
        dimensions.push("page", "query");
        filters.push({
            filters: [
                { dimension: "page", operator: "equals", expression: url },
                { dimension: "query", operator: "equals", expression: query },
            ],
        });
    }
    else if (url) {
        dimensions.push("page");
        filters.push({
            filters: [{ dimension: "page", operator: "equals", expression: url }],
        });
    }
    else if (query) {
        dimensions.push("query");
        filters.push({
            filters: [{ dimension: "query", operator: "equals", expression: query }],
        });
    }
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: dimensions.length > 0 ? dimensions : ["date"],
        dimensionFilterGroups: filters.length > 0 ? filters : undefined,
    });
    let actualValue = null;
    if (rows.length > 0) {
        if (metric === "clicks") {
            actualValue = rows.reduce((sum, r) => sum + r.clicks, 0);
        }
        else if (metric === "impressions") {
            actualValue = rows.reduce((sum, r) => sum + r.impressions, 0);
        }
        else if (metric === "ctr") {
            const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
            const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
            actualValue =
                totalImpressions > 0
                    ? Math.round((totalClicks / totalImpressions) * 10000) / 100
                    : 0;
        }
        else if (metric === "position") {
            actualValue =
                Math.round((rows.reduce((sum, r) => sum + r.position, 0) / rows.length) * 10) / 10;
        }
    }
    const tolerance = metric === "position" ? 0.5 : expectedValue * 0.05;
    const verified = actualValue !== null && Math.abs(actualValue - expectedValue) <= tolerance;
    let discrepancy = null;
    if (actualValue === null) {
        discrepancy = "No data found for the specified filters.";
    }
    else if (!verified) {
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
