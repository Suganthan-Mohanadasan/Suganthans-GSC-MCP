"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageKeywordTrends = imageKeywordTrends;
const analytics_js_1 = require("../analytics.js");
/**
 * Two equal-length windows of image-search data joined on query. Reports
 * impression and position deltas so you can spot which image-search queries
 * are gaining or losing visibility. Negative position delta means the query
 * improved its average rank (smaller position number = better rank).
 */
async function imageKeywordTrends(days = 28, minCombinedImpressions = 100, rowLimit = 50, orderBy = "impressions_delta") {
    const current = (0, analytics_js_1.getDateRange)(days);
    const prior = (0, analytics_js_1.getPriorDateRange)(days);
    const [currentRows, priorRows] = await Promise.all([
        (0, analytics_js_1.fetchAllRows)({
            startDate: current.startDate,
            endDate: current.endDate,
            dimensions: ["query"],
            type: "image",
        }),
        (0, analytics_js_1.fetchAllRows)({
            startDate: prior.startDate,
            endDate: prior.endDate,
            dimensions: ["query"],
            type: "image",
        }),
    ]);
    const toMap = (rows) => {
        const map = new Map();
        for (const r of rows) {
            map.set(r.keys[0], r);
        }
        return map;
    };
    const currentMap = toMap(currentRows);
    const priorMap = toMap(priorRows);
    const queries = new Set();
    for (const q of currentMap.keys())
        queries.add(q);
    for (const q of priorMap.keys())
        queries.add(q);
    const results = [];
    for (const query of queries) {
        const c = currentMap.get(query);
        const p = priorMap.get(query);
        const cImpr = c?.impressions || 0;
        const pImpr = p?.impressions || 0;
        if (cImpr + pImpr < minCombinedImpressions)
            continue;
        const cPos = c?.position || 0;
        const pPos = p?.position || 0;
        results.push({
            query,
            currentClicks: c?.clicks || 0,
            priorClicks: p?.clicks || 0,
            currentImpressions: cImpr,
            priorImpressions: pImpr,
            impressionsDelta: cImpr - pImpr,
            currentPosition: Math.round(cPos * 10) / 10,
            priorPosition: Math.round(pPos * 10) / 10,
            positionDelta: Math.round((cPos - pPos) * 10) / 10,
        });
    }
    if (orderBy === "impressions_delta") {
        results.sort((a, b) => b.impressionsDelta - a.impressionsDelta);
    }
    else {
        // position_delta: most-improved first (most negative)
        results.sort((a, b) => a.positionDelta - b.positionDelta);
    }
    return results.slice(0, rowLimit);
}
