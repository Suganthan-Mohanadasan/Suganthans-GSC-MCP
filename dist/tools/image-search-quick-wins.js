"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageSearchQuickWins = imageSearchQuickWins;
const analytics_js_1 = require("../analytics.js");
/*
 * Expected CTR by position for image search.
 *
 * Image-search CTRs run roughly 5-6x lower than web at equivalent positions
 * (anchor-site data referenced in the paired blog post: 0.14% image vs 0.78%
 * web overall, with most image-search impressions sitting at positions 30+
 * where CTR collapses further). Treat these absolute numbers as directional;
 * the relative ranking across positions is what matters for opportunity
 * scoring.
 */
const IMAGE_EXPECTED_CTR = [0.050, 0.028, 0.020, 0.014, 0.012, 0.009, 0.007, 0.006, 0.005, 0.004];
function expectedImageCtrAtPosition(pos) {
    if (pos <= 0)
        return 0.050;
    if (pos <= 10)
        return IMAGE_EXPECTED_CTR[Math.floor(pos) - 1];
    return Math.max(0.001, 0.004 - (pos - 10) * 0.0002);
}
/**
 * Image-search variant of the quick-wins tool. Surfaces queries that rank in
 * the image SERP at positions 4-15 with high impressions. Opportunity is the
 * estimated extra clicks if the query reached position 3, using the
 * image-search CTR baseline above.
 */
async function imageSearchQuickWins(days = 90, minImpressions = 500, maxPosition = 15) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["query"],
        type: "image",
    });
    const wins = [];
    for (const row of rows) {
        const position = row.position;
        const impressions = row.impressions;
        if (position < 4 || position > maxPosition)
            continue;
        if (impressions < minImpressions)
            continue;
        const targetCtr = expectedImageCtrAtPosition(3);
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
