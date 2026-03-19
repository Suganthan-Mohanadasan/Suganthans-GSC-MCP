"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentGaps = contentGaps;
const analytics_js_1 = require("../analytics.js");
async function contentGaps(days = 90, minImpressions = 50, minPosition = 20) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["query"],
    });
    const gaps = [];
    for (const row of rows) {
        if (row.impressions < minImpressions)
            continue;
        if (row.position < minPosition)
            continue;
        gaps.push({
            query: row.keys[0],
            impressions: row.impressions,
            clicks: row.clicks,
            position: Math.round(row.position * 10) / 10,
        });
    }
    gaps.sort((a, b) => b.impressions - a.impressions);
    return gaps.slice(0, 50);
}
