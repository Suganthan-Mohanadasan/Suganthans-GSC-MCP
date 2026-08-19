"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVICES = exports.ALLOWED_DIMENSIONS = void 0;
exports.assertValidDimensions = assertValidDimensions;
exports.deviceCountryFilters = deviceCountryFilters;
exports.getDateRange = getDateRange;
exports.getPriorDateRange = getPriorDateRange;
exports.fetchAllRows = fetchAllRows;
const auth_js_1 = require("./auth.js");
/**
 * Dimensions the API actually allows per surface. Used for a friendly guard so
 * an invalid combination fails with a clear message instead of an opaque 400.
 * (searchAppearance is special: it must be the ONLY grouping dimension.)
 */
exports.ALLOWED_DIMENSIONS = {
    web: ["query", "page", "country", "device", "date", "searchAppearance"],
    image: ["query", "page", "country", "device", "date", "searchAppearance"],
    video: ["query", "page", "country", "device", "date", "searchAppearance"],
    news: ["query", "page", "country", "device", "date"],
    // Discover is not query-based: no "query", no "device".
    discover: ["page", "country", "date", "searchAppearance"],
    googleNews: ["page", "country", "date"],
};
/**
 * Validates that the requested dimensions are legal for the chosen surface.
 * Throws a descriptive error instead of letting the API return a generic 400.
 */
function assertValidDimensions(searchType, dimensions) {
    const allowed = exports.ALLOWED_DIMENSIONS[searchType];
    const invalid = dimensions.filter((d) => !allowed.includes(d));
    if (invalid.length > 0) {
        throw new Error(`Dimension(s) [${invalid.join(", ")}] are not supported for searchType "${searchType}". ` +
            `Allowed: [${allowed.join(", ")}].`);
    }
    if (dimensions.includes("searchAppearance") && dimensions.length > 1) {
        throw new Error(`"searchAppearance" must be the only grouping dimension. ` +
            `To break a single appearance down by page/query, filter on searchAppearance instead.`);
    }
}
/** Devices as the API spells them in dimension filters. */
exports.DEVICES = ["MOBILE", "DESKTOP", "TABLET"];
/**
 * Dimension filters for device and country.
 *
 * Both are optional, and unset means unfiltered - every tool keeps returning
 * all devices and all countries unless asked otherwise.
 *
 * Discover has no device dimension (see ALLOWED_DIMENSIONS), so filtering by
 * device there is impossible rather than merely empty. That fails loudly.
 */
function deviceCountryFilters(device, country, searchType = "web") {
    const filters = [];
    if (device) {
        if (!exports.ALLOWED_DIMENSIONS[searchType].includes("device")) {
            throw new Error(`searchType "${searchType}" has no device dimension, so it cannot be filtered by device. ` +
                `Allowed dimensions: [${exports.ALLOWED_DIMENSIONS[searchType].join(", ")}].`);
        }
        const upper = device.toUpperCase();
        if (!exports.DEVICES.includes(upper)) {
            throw new Error(`Unknown device "${device}". Allowed: ${exports.DEVICES.join(", ")}.`);
        }
        filters.push({ dimension: "device", operator: "equals", expression: upper });
    }
    if (country) {
        const lower = country.toLowerCase();
        if (!/^[a-z]{3}$/.test(lower)) {
            throw new Error(`Country must be an ISO-3166-1 alpha-3 code such as deu, aut, che or usa - got "${country}".`);
        }
        filters.push({ dimension: "country", operator: "equals", expression: lower });
    }
    return filters;
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
                type: params.searchType, // undefined => API default "web"
                dimensionFilterGroups: params.dimensionFilterGroups,
                rowLimit: pageSize,
                startRow,
                dataState: "all",
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
        if (params.maxRows && allRows.length >= params.maxRows)
            break;
        startRow += pageSize;
    }
    return params.maxRows ? allRows.slice(0, params.maxRows) : allRows;
}
