"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagePagesOverview = imagePagesOverview;
const analytics_js_1 = require("../analytics.js");
/**
 * Pages on the site ranked by image-search performance. Tells you which pages
 * are actually showing up in Google Images and which are not. Useful when
 * paired with image-keyword-overview to map "what queries are we ranking on"
 * back to "which pages carry that ranking".
 */
async function imagePagesOverview(days = 90, minImpressions = 100, rowLimit = 50, orderBy = "clicks") {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["page"],
        type: "image",
    });
    const filtered = rows.filter((r) => r.impressions >= minImpressions);
    if (orderBy === "impressions") {
        filtered.sort((a, b) => b.impressions - a.impressions);
    }
    else if (orderBy === "clicks") {
        filtered.sort((a, b) => b.clicks - a.clicks);
    }
    else {
        filtered.sort((a, b) => a.position - b.position);
    }
    return filtered.slice(0, rowLimit).map((r) => ({
        page: r.keys[0],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: Math.round(r.ctr * 10000) / 100,
        position: Math.round(r.position * 10) / 10,
    }));
}
