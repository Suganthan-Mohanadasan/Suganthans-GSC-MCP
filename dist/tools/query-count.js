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
function parseISO(date) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}
function toISO(date) {
    return date.toISOString().split("T")[0];
}
/** Splits a date range into day, ISO-week (Mon-Sun) or calendar-month buckets. */
function buildBuckets(startDate, endDate, granularity) {
    const end = parseISO(endDate);
    const out = [];
    let cursor = parseISO(startDate);
    while (cursor <= end) {
        let bucketEnd;
        if (granularity === "day") {
            bucketEnd = new Date(cursor);
        }
        else if (granularity === "week") {
            const mondayOffset = (cursor.getUTCDay() + 6) % 7; // 0 = Monday
            bucketEnd = new Date(cursor);
            bucketEnd.setUTCDate(bucketEnd.getUTCDate() + (6 - mondayOffset));
        }
        else {
            bucketEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
        }
        if (bucketEnd > end)
            bucketEnd = new Date(end);
        out.push({ startDate: toISO(cursor), endDate: toISO(bucketEnd) });
        cursor = new Date(bucketEnd);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
}
async function queryCount(days = 28, comparePrevious = true, includePages = false, topPages = 25, surface = "web", url, urlContains, granularity = "none", minPosition, maxPosition) {
    (0, analytics_js_1.assertValidDimensions)(surface, ["query"]);
    if (granularity === "day" && days > 90) {
        throw new Error(`granularity "day" over ${days} days would need ${days}+ API requests. ` +
            `Use "week" or "month" for ranges beyond 90 days.`);
    }
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const pageFilters = [];
    if (url)
        pageFilters.push({ dimension: "page", operator: "equals", expression: url });
    if (urlContains)
        pageFilters.push({ dimension: "page", operator: "contains", expression: urlContains });
    const dimensionFilterGroups = pageFilters.length ? [{ filters: pageFilters }] : undefined;
    const scoped = (params) => ({
        ...params,
        dimensionFilterGroups,
    });
    const queryRows = await (0, analytics_js_1.fetchAllRows)(scoped({ startDate, endDate, dimensions: ["query"], searchType: surface }));
    // Totals without the query dimension: same scope, but including the clicks
    // that no visible query row accounts for.
    const dateRows = await (0, analytics_js_1.fetchAllRows)(scoped({ startDate, endDate, dimensions: ["date"], searchType: surface }));
    const clicksFromVisibleQueries = queryRows.reduce((sum, r) => sum + r.clicks, 0);
    const totalClicks = dateRows.reduce((sum, r) => sum + r.clicks, 0);
    const anonymizedClicks = Math.max(0, totalClicks - clicksFromVisibleQueries);
    // The position filter narrows what gets counted, but never the gap above:
    // that one only makes sense against the unfiltered scope.
    const inPositionFilter = (position) => (minPosition === undefined || position >= minPosition) &&
        (maxPosition === undefined || position <= maxPosition);
    const hasPositionFilter = minPosition !== undefined || maxPosition !== undefined;
    const countedRows = hasPositionFilter
        ? queryRows.filter((r) => inPositionFilter(r.position))
        : queryRows;
    const groups = new Map();
    for (const group of POSITION_GROUPS) {
        groups.set(group, { queries: 0, clicks: 0, impressions: 0 });
    }
    for (const row of countedRows) {
        const entry = groups.get(positionGroup(row.position));
        entry.queries += 1;
        entry.clicks += row.clicks;
        entry.impressions += row.impressions;
    }
    const countedTotal = countedRows.length;
    const byPositionGroup = POSITION_GROUPS.map((group) => {
        const entry = groups.get(group);
        return {
            group,
            queries: entry.queries,
            clicks: entry.clicks,
            impressions: entry.impressions,
            queryShare: countedTotal > 0 ? Math.round((entry.queries / countedTotal) * 10000) / 100 : 0,
        };
    });
    let timeSeries = null;
    if (granularity !== "none") {
        timeSeries = [];
        for (const bucket of buildBuckets(startDate, endDate, granularity)) {
            const rows = await (0, analytics_js_1.fetchAllRows)(scoped({
                startDate: bucket.startDate,
                endDate: bucket.endDate,
                dimensions: ["query"],
                searchType: surface,
            }));
            const counted = hasPositionFilter ? rows.filter((r) => inPositionFilter(r.position)) : rows;
            timeSeries.push({
                startDate: bucket.startDate,
                endDate: bucket.endDate,
                visibleQueries: counted.length,
                clicks: counted.reduce((sum, r) => sum + r.clicks, 0),
                impressions: counted.reduce((sum, r) => sum + r.impressions, 0),
            });
        }
    }
    let previousPeriod = null;
    if (comparePrevious) {
        const prior = (0, analytics_js_1.getPriorDateRange)(days);
        const priorRows = await (0, analytics_js_1.fetchAllRows)(scoped({
            startDate: prior.startDate,
            endDate: prior.endDate,
            dimensions: ["query"],
            searchType: surface,
        }));
        const priorCount = (hasPositionFilter ? priorRows.filter((r) => inPositionFilter(r.position)) : priorRows).length;
        const change = countedTotal - priorCount;
        previousPeriod = {
            startDate: prior.startDate,
            endDate: prior.endDate,
            visibleQueries: priorCount,
            change,
            changePercent: priorCount > 0 ? Math.round((change / priorCount) * 10000) / 100 : 0,
        };
    }
    let topPagesByQueryCount = null;
    if (includePages) {
        (0, analytics_js_1.assertValidDimensions)(surface, ["page", "query"]);
        const pageQueryRows = await (0, analytics_js_1.fetchAllRows)(scoped({
            startDate,
            endDate,
            dimensions: ["page", "query"],
            searchType: surface,
            maxRows: 100000,
        }));
        const pages = new Map();
        for (const row of pageQueryRows) {
            if (hasPositionFilter && !inPositionFilter(row.position))
                continue;
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
        scope: {
            url: url ?? null,
            urlContains: urlContains ?? null,
            surface,
            minPosition: minPosition ?? null,
            maxPosition: maxPosition ?? null,
        },
        totals: {
            visibleQueries: queryRows.length,
            clicksFromVisibleQueries,
            totalClicks,
            anonymizedClicks,
            anonymizedClicksShare: totalClicks > 0 ? Math.round((anonymizedClicks / totalClicks) * 10000) / 100 : 0,
        },
        filtered: hasPositionFilter
            ? {
                visibleQueries: countedTotal,
                clicks: countedRows.reduce((sum, r) => sum + r.clicks, 0),
                impressions: countedRows.reduce((sum, r) => sum + r.impressions, 0),
            }
            : null,
        byPositionGroup,
        timeSeries,
        previousPeriod,
        topPagesByQueryCount,
    };
}
