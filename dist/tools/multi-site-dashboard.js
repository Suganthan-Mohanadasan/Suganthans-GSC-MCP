"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multiSiteDashboard = multiSiteDashboard;
const analytics_js_1 = require("../analytics.js");
const auth_js_1 = require("../auth.js");
async function siteSnapshotForUrl(siteUrl, days) {
    const current = (0, analytics_js_1.getDateRange)(days);
    const prior = (0, analytics_js_1.getPriorDateRange)(days);
    const [currentRows, priorRows] = await Promise.all([
        (0, analytics_js_1.fetchAllRows)({ startDate: current.startDate, endDate: current.endDate, dimensions: ["date"] }, siteUrl),
        (0, analytics_js_1.fetchAllRows)({ startDate: prior.startDate, endDate: prior.endDate, dimensions: ["date"] }, siteUrl),
    ]);
    const sum = (rows) => {
        let clicks = 0, impressions = 0, posSum = 0, posCount = 0;
        for (const r of rows) {
            clicks += r.clicks;
            impressions += r.impressions;
            posSum += r.position;
            posCount++;
        }
        return {
            clicks,
            impressions,
            ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
            position: posCount > 0 ? Math.round((posSum / posCount) * 10) / 10 : 0,
        };
    };
    const c = sum(currentRows);
    const p = sum(priorRows);
    const clicksPercent = p.clicks > 0
        ? Math.round(((c.clicks - p.clicks) / p.clicks) * 10000) / 100
        : 0;
    let health;
    if (clicksPercent >= 0) {
        health = "healthy";
    }
    else if (clicksPercent > -20) {
        health = "warning";
    }
    else {
        health = "declining";
    }
    return {
        siteUrl,
        current: c,
        change: {
            clicksPercent,
            impressionsPercent: p.impressions > 0
                ? Math.round(((c.impressions - p.impressions) / p.impressions) * 10000) / 100
                : 0,
            ctr: Math.round((c.ctr - p.ctr) * 100) / 100,
            position: Math.round((c.position - p.position) * 10) / 10,
        },
        health,
    };
}
async function multiSiteDashboard(siteUrls, days = 28) {
    const config = (0, auth_js_1.getConfig)();
    const urls = siteUrls && siteUrls.length > 0
        ? siteUrls
        : config.siteUrls.length > 0
            ? config.siteUrls
            : [config.siteUrl];
    if (urls.length === 0) {
        throw new Error("No site URLs provided. Pass site_urls parameter or set GSC_SITE_URLS environment variable.");
    }
    // Run all site snapshots in parallel
    const sites = await Promise.all(urls.map((url) => siteSnapshotForUrl(url, days)));
    const healthyCount = sites.filter((s) => s.health === "healthy").length;
    const warningCount = sites.filter((s) => s.health === "warning").length;
    const decliningCount = sites.filter((s) => s.health === "declining").length;
    const summary = `${sites.length} sites analysed over ${days} days. ` +
        `${healthyCount} healthy, ${warningCount} warning, ${decliningCount} declining.`;
    return {
        periodDays: days,
        sites,
        summary,
    };
}
