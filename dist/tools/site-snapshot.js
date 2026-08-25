"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteSnapshot = siteSnapshot;
const analytics_js_1 = require("../analytics.js");
async function siteSnapshot(days = 28) {
    const current = (0, analytics_js_1.getDateRange)(days);
    const prior = (0, analytics_js_1.getPriorDateRange)(days);
    const [currentRows, priorRows] = await Promise.all([
        (0, analytics_js_1.fetchAllRows)({ startDate: current.startDate, endDate: current.endDate, dimensions: ["date"] }),
        (0, analytics_js_1.fetchAllRows)({ startDate: prior.startDate, endDate: prior.endDate, dimensions: ["date"] }),
    ]);
    const sum = (rows) => {
        let clicks = 0, impressions = 0, posWeight = 0;
        for (const r of rows) {
            clicks += r.clicks;
            impressions += r.impressions;
            // Each row's position is already impression-weighted within the row, so
            // weighting by impressions here reproduces the true period-wide average
            posWeight += r.position * r.impressions;
        }
        return {
            clicks,
            impressions,
            ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
            position: impressions > 0 ? Math.round((posWeight / impressions) * 10) / 10 : 0,
        };
    };
    const c = sum(currentRows);
    const p = sum(priorRows);
    return {
        period: current,
        current: c,
        prior: p,
        change: {
            clicks: c.clicks - p.clicks,
            clicksPercent: p.clicks > 0 ? Math.round(((c.clicks - p.clicks) / p.clicks) * 10000) / 100 : 0,
            impressions: c.impressions - p.impressions,
            impressionsPercent: p.impressions > 0 ? Math.round(((c.impressions - p.impressions) / p.impressions) * 10000) / 100 : 0,
            ctr: Math.round((c.ctr - p.ctr) * 100) / 100,
            position: Math.round((c.position - p.position) * 10) / 10,
        },
    };
}
