"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageImpressionsNoClicks = imageImpressionsNoClicks;
const analytics_js_1 = require("../analytics.js");
/**
 * Surfaces query+page pairs that earn meaningful image-search impressions but
 * effectively no clicks. This is the textbook "thumbnail is not converting"
 * pattern: the image is in the SERP but the crop, alt text mismatch, or page
 * authority relative to competitors keeps users from clicking.
 *
 * Defaults are tuned for image search, which runs at much higher impression
 * volumes per page than web search.
 */
async function imageImpressionsNoClicks(days = 90, minImpressions = 500, maxClicks = 2, rowLimit = 50) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["query", "page"],
        type: "image",
    });
    const filtered = rows.filter((r) => r.impressions >= minImpressions && r.clicks <= maxClicks);
    filtered.sort((a, b) => b.impressions - a.impressions);
    return filtered.slice(0, rowLimit).map((r) => ({
        query: r.keys[0],
        page: r.keys[1],
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: Math.round(r.ctr * 10000) / 100,
        position: Math.round(r.position * 10) / 10,
    }));
}
