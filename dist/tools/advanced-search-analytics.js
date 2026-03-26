"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advancedSearchAnalytics = advancedSearchAnalytics;
const analytics_js_1 = require("../analytics.js");
async function advancedSearchAnalytics(days = 28, dimensions = ["query"], filters = [], rowLimit = 100, orderBy = "clicks", orderDirection = "descending", siteUrl) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    // Build dimension filter groups from user-provided filters
    const dimensionFilterGroups = filters.length > 0
        ? [{
                filters: filters.map((f) => ({
                    dimension: f.dimension,
                    operator: f.operator,
                    expression: f.expression,
                })),
            }]
        : undefined;
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions,
        dimensionFilterGroups,
    }, siteUrl);
    // Sort
    const sortKey = orderBy;
    const multiplier = orderDirection === "ascending" ? 1 : -1;
    rows.sort((a, b) => {
        const aVal = typeof a[sortKey] === "number" ? a[sortKey] : 0;
        const bVal = typeof b[sortKey] === "number" ? b[sortKey] : 0;
        return (aVal - bVal) * multiplier;
    });
    const limited = rows.slice(0, Math.min(rowLimit, 500));
    return {
        rows: limited.map((r) => ({
            keys: r.keys,
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: Math.round(r.ctr * 10000) / 100,
            position: Math.round(r.position * 10) / 10,
        })),
        totalRows: rows.length,
        dimensions,
        period: { startDate, endDate },
        filtersApplied: filters,
    };
}
