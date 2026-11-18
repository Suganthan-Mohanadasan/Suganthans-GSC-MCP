"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRANDED_DATA_START = void 0;
exports.buildFilterGroups = buildFilterGroups;
exports.getDateRange = getDateRange;
exports.getPriorDateRange = getPriorDateRange;
exports.fetchAllRows = fetchAllRows;
const auth_js_1 = require("./auth.js");
// First date with branded / non-branded data in the API.
exports.BRANDED_DATA_START = "2026-02-21";
/**
 * Builds the single AND filter group the API supports from single-value
 * filters and multi-value filter lists. Country codes are lower-cased and
 * device names upper-cased in filter lists, which is the form the API matches.
 */
function buildFilterGroups(filters = [], filterLists = []) {
    if (filters.length === 0 && filterLists.length === 0)
        return undefined;
    return [
        {
            ...(filters.length > 0
                ? {
                    filters: filters.map((f) => ({
                        dimension: f.dimension,
                        operator: f.operator,
                        expression: f.expression,
                    })),
                }
                : {}),
            ...(filterLists.length > 0
                ? {
                    filterLists: filterLists.map((l) => ({
                        dimension: l.dimension,
                        expressions: l.expressions.map((e) => l.dimension === "device" ? e.toUpperCase() : e.toLowerCase()),
                    })),
                }
                : {}),
        },
    ];
}
function formatDate(date) {
    return date.toISOString().split("T")[0];
}
function getDateRange(days) {
    const end = new Date();
    end.setDate(end.getDate() - 1); // yesterday (latest available)
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    return {
        startDate: formatDate(start),
        endDate: formatDate(end),
    };
}
function getPriorDateRange(days) {
    const currentEnd = new Date();
    currentEnd.setDate(currentEnd.getDate() - 1);
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - days + 1);
    const priorEnd = new Date(currentStart);
    priorEnd.setDate(priorEnd.getDate() - 1);
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - days + 1);
    return {
        startDate: formatDate(priorStart),
        endDate: formatDate(priorEnd),
    };
}
/**
 * Fetches all rows from the Search Analytics API with automatic pagination.
 * Uses dataState: 'all' so data matches the GSC dashboard exactly.
 */
async function fetchAllRows(params, siteUrlOverride) {
    const client = await (0, auth_js_1.getSearchConsoleClient)();
    const siteUrl = siteUrlOverride || (0, auth_js_1.getConfig)().siteUrl;
    const allRows = [];
    const pageSize = params.rowLimit || 25000;
    let startRow = 0;
    while (true) {
        const response = await client.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate: params.startDate,
                endDate: params.endDate,
                dimensions: params.dimensions,
                dimensionFilterGroups: params.dimensionFilterGroups,
                rowLimit: pageSize,
                startRow,
                dataState: "all",
                // Pass through the type filter when provided. Defaults server-side to
                // `web` when omitted, matching prior behaviour.
                ...(params.type ? { type: params.type } : {}),
            },
        });
        const rows = response.data.rows;
        if (!rows || rows.length === 0)
            break;
        for (const row of rows) {
            allRows.push({
                keys: row.keys || [],
                clicks: row.clicks || 0,
                impressions: row.impressions || 0,
                ctr: row.ctr || 0,
                position: row.position || 0,
            });
        }
        if (rows.length < pageSize)
            break;
        startRow += pageSize;
    }
    return allRows;
}
