"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cannibalizationCheck = cannibalizationCheck;
const analytics_js_1 = require("../analytics.js");
async function cannibalizationCheck(days = 28, minImpressions = 50) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["query", "page"],
    });
    // Group by query
    const queryMap = new Map();
    for (const row of rows) {
        const query = row.keys[0];
        const page = row.keys[1];
        if (!queryMap.has(query)) {
            queryMap.set(query, []);
        }
        queryMap.get(query).push({
            page,
            clicks: row.clicks,
            impressions: row.impressions,
            position: Math.round(row.position * 10) / 10,
        });
    }
    const issues = [];
    for (const [query, pages] of queryMap) {
        if (pages.length < 2)
            continue;
        const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);
        if (totalImpressions < minImpressions)
            continue;
        pages.sort((a, b) => a.position - b.position);
        issues.push({
            query,
            totalImpressions,
            pages,
        });
    }
    issues.sort((a, b) => b.totalImpressions - a.totalImpressions);
    return issues.slice(0, 50);
}
