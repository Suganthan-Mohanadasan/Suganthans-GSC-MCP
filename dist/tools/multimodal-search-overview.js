"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multimodalSearchOverview = multimodalSearchOverview;
const analytics_js_1 = require("../analytics.js");
function totals(row) {
    return {
        clicks: row?.clicks || 0,
        impressions: row?.impressions || 0,
        ctr: row ? Math.round(row.ctr * 10000) / 100 : 0,
        position: row ? Math.round(row.position * 10) / 10 : 0,
    };
}
function pct(part, whole) {
    return whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0;
}
function changePct(current, prior) {
    return prior > 0 ? Math.round(((current - prior) / prior) * 10000) / 100 : null;
}
/**
 * Performance in multimodal search: Google Lens, Circle to Search on Android
 * and image uploads in Google Search (`type=webMultimodal`, in the Search
 * Analytics API since November 2026).
 *
 * Google does not expose queries for this surface. Grouping or filtering by
 * query or brandedClassification is rejected with a 400, so the breakdowns
 * here are page, country, device and date.
 */
async function multimodalSearchOverview(days = 90, rowLimit = 25, filterLists = [], siteUrl) {
    const period = (0, analytics_js_1.getDateRange)(days);
    const priorPeriod = (0, analytics_js_1.getPriorDateRange)(days);
    const dimensionFilterGroups = (0, analytics_js_1.buildFilterGroups)([], filterLists);
    const multimodal = (range, dimensions) => (0, analytics_js_1.fetchAllRows)({ ...range, dimensions, dimensionFilterGroups, type: "webMultimodal" }, siteUrl);
    const [total, priorTotal, webTotal, pages, countries, devices, daily] = await Promise.all([
        multimodal(period, []),
        multimodal(priorPeriod, []),
        (0, analytics_js_1.fetchAllRows)({ ...period, dimensions: [], dimensionFilterGroups, type: "web" }, siteUrl),
        multimodal(period, ["page"]),
        multimodal(period, ["country"]),
        multimodal(period, ["device"]),
        multimodal(period, ["date"]),
    ]);
    const current = totals(total[0]);
    const prior = totals(priorTotal[0]);
    const web = totals(webTotal[0]);
    const keyed = (rows, limit) => rows
        .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
        .slice(0, limit)
        .map((r) => ({ key: r.keys[0], ...totals(r) }));
    return {
        hasData: current.impressions > 0,
        note: "Multimodal = Google Lens, Circle to Search on Android, and image uploads in Google Search. " +
            "Google does not provide queries for this surface, so there is no keyword breakdown. " +
            "Page rows are aggregated by page and can differ from the property totals.",
        period,
        priorPeriod,
        filterListsApplied: filterLists,
        multimodal: current,
        multimodalPrior: prior,
        clicksChangePct: changePct(current.clicks, prior.clicks),
        impressionsChangePct: changePct(current.impressions, prior.impressions),
        web,
        multimodalVsWebImpressionsPct: pct(current.impressions, web.impressions),
        multimodalVsWebClicksPct: pct(current.clicks, web.clicks),
        topPages: keyed(pages, rowLimit),
        byCountry: keyed(countries, rowLimit),
        byDevice: keyed(devices, 3),
        trend: daily
            .map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions }))
            .sort((a, b) => a.date.localeCompare(b.date)),
    };
}
