"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ctrOpportunities = ctrOpportunities;
const analytics_js_1 = require("../analytics.js");
const EXPECTED_CTR = [0.285, 0.157, 0.110, 0.080, 0.072, 0.051, 0.040, 0.032, 0.028, 0.025];
function expectedCtrAtPosition(pos) {
    if (pos <= 0)
        return 0.285;
    if (pos <= 10)
        return EXPECTED_CTR[Math.floor(pos) - 1];
    return Math.max(0.005, 0.025 - (pos - 10) * 0.002);
}
async function ctrOpportunities(days = 28, minImpressions = 500) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["page"],
    });
    const opportunities = [];
    for (const row of rows) {
        if (row.impressions < minImpressions)
            continue;
        if (row.position > 20)
            continue; // only care about pages that rank somewhat
        const expected = expectedCtrAtPosition(row.position);
        const gap = expected - row.ctr;
        if (gap <= 0.01)
            continue; // CTR is at or above benchmark
        opportunities.push({
            page: row.keys[0],
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: Math.round(row.ctr * 10000) / 100,
            position: Math.round(row.position * 10) / 10,
            expectedCtr: Math.round(expected * 10000) / 100,
            ctrGap: Math.round(gap * 10000) / 100,
            potentialExtraClicks: Math.round(row.impressions * gap),
        });
    }
    opportunities.sort((a, b) => b.potentialExtraClicks - a.potentialExtraClicks);
    return opportunities.slice(0, 50);
}
