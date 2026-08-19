"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryCount = queryCount;
const analytics_js_1 = require("../analytics.js");
const POSITION_GROUPS = ["1-3", "4-10", "11-20", "21-50", "51+"];
function positionGroup(position) {
    if (position <= 3)
        return "1-3";
    if (position <= 10)
        return "4-10";
    if (position <= 20)
        return "11-20";
    if (position <= 50)
        return "21-50";
    return "51+";
}
async function queryCount(days = 28, comparePrevious = true, includePages = false, topPages = 25, searchType = "web") {
    (0, analytics_js_1.assertValidDimensions)(searchType, ["query"]);
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const queryRows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["query"],
        searchType,
    });
    // Site totals without the query dimension. Grouping by date keeps the request
    // small while still summing to the same figure the GSC dashboard shows.
    const dateRows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["date"],
        searchType,
    });
    const clicksFromVisibleQueries = queryRows.reduce((sum, r) => sum + r.clicks, 0);
    const totalClicks = dateRows.reduce((sum, r) => sum + r.clicks, 0);
    const anonymizedClicks = Math.max(0, totalClicks - clicksFromVisibleQueries);
    const buckets = new Map();
    for (const group of POSITION_GROUPS) {
        buckets.set(group, { queries: 0, clicks: 0, impressions: 0 });
    }
    for (const row of queryRows) {
        const bucket = buckets.get(positionGroup(row.position));
        bucket.queries += 1;
        bucket.clicks += row.clicks;
        bucket.impressions += row.impressions;
    }
    const visibleQueries = queryRows.length;
    const byPositionGroup = POSITION_GROUPS.map((group) => {
        const bucket = buckets.get(group);
        return {
            group,
            queries: bucket.queries,
            clicks: bucket.clicks,
            impressions: bucket.impressions,
            queryShare: visibleQueries > 0 ? Math.round((bucket.queries / visibleQueries) * 10000) / 100 : 0,
        };
    });
    let previousPeriod = null;
    if (comparePrevious) {
        const prior = (0, analytics_js_1.getPriorDateRange)(days);
        const priorRows = await (0, analytics_js_1.fetchAllRows)({
            startDate: prior.startDate,
            endDate: prior.endDate,
            dimensions: ["query"],
            searchType,
        });
        const change = visibleQueries - priorRows.length;
        previousPeriod = {
            startDate: prior.startDate,
            endDate: prior.endDate,
            visibleQueries: priorRows.length,
            change,
            changePercent: priorRows.length > 0 ? Math.round((change / priorRows.length) * 10000) / 100 : 0,
        };
    }
    let topPagesByQueryCount = null;
    if (includePages) {
        (0, analytics_js_1.assertValidDimensions)(searchType, ["page", "query"]);
        const pageQueryRows = await (0, analytics_js_1.fetchAllRows)({
            startDate,
            endDate,
            dimensions: ["page", "query"],
            searchType,
            maxRows: 100000,
        });
        const pages = new Map();
        for (const row of pageQueryRows) {
            const page = row.keys[0];
            const entry = pages.get(page) || { queries: 0, clicks: 0, impressions: 0 };
            entry.queries += 1;
            entry.clicks += row.clicks;
            entry.impressions += row.impressions;
            pages.set(page, entry);
        }
        topPagesByQueryCount = [...pages.entries()]
            .map(([page, entry]) => ({ page, ...entry }))
            .sort((a, b) => b.queries - a.queries)
            .slice(0, topPages);
    }
    return {
        period: { startDate, endDate, days },
        totals: {
            visibleQueries,
            clicksFromVisibleQueries,
            totalClicks,
            anonymizedClicks,
            anonymizedClicksShare: totalClicks > 0 ? Math.round((anonymizedClicks / totalClicks) * 10000) / 100 : 0,
        },
        byPositionGroup,
        previousPeriod,
        topPagesByQueryCount,
    };
}
