"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickWins = quickWins;
const analytics_js_1 = require("../analytics.js");
// Expected CTR by position (used to estimate traffic gain if position improves)
const EXPECTED_CTR = [0.285, 0.157, 0.110, 0.080, 0.072, 0.051, 0.040, 0.032, 0.028, 0.025];
function expectedCtrAtPosition(pos) {
    if (pos <= 0)
        return 0.285;
    if (pos <= 10)
        return EXPECTED_CTR[Math.floor(pos) - 1];
    return Math.max(0.005, 0.025 - (pos - 10) * 0.002);
}
async function quickWins(days = 28, minImpressions = 100, maxPosition = 15) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["query"],
    });
    const wins = [];
    for (const row of rows) {
        const position = row.position;
        const impressions = row.impressions;
        if (position < 4 || position > maxPosition)
            continue;
        if (impressions < minImpressions)
            continue;
        // Opportunity = impressions * (CTR at position 3 - current CTR)
        const targetCtr = expectedCtrAtPosition(3);
        const currentCtr = row.ctr;
        const opportunity = Math.round(impressions * Math.max(0, targetCtr - currentCtr));
        wins.push({
            query: row.keys[0],
            clicks: row.clicks,
            impressions,
            ctr: Math.round(row.ctr * 10000) / 100,
            position: Math.round(position * 10) / 10,
            opportunity,
        });
    }
    wins.sort((a, b) => b.opportunity - a.opportunity);
    return wins.slice(0, 50);
}
