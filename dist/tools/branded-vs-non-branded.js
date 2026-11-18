"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandedVsNonBranded = brandedVsNonBranded;
const analytics_js_1 = require("../analytics.js");
const BRANDED = "BRANDED";
const NON_BRANDED = "NON_BRANDED";
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
 * Branded vs non-branded performance, using Google's own classification
 * (`brandedClassification`, in the Search Analytics API since November 2026).
 *
 * Google only classifies top-level properties with enough query volume, and
 * only from 2026-02-21. An ineligible property gets an empty response rather
 * than an error, which is reported here as `eligible: false`.
 */
async function brandedVsNonBranded(days = 28, rowLimit = 25, filterLists = [], includeTrend = true, siteUrl, searchType) {
    const period = (0, analytics_js_1.getDateRange)(days);
    const notes = [];
    if (period.startDate < analytics_js_1.BRANDED_DATA_START) {
        period.startDate = analytics_js_1.BRANDED_DATA_START;
        notes.push(`Branded classification starts on ${analytics_js_1.BRANDED_DATA_START}; the period was shortened to begin there.`);
    }
    // A prior period that reaches back before the data starts would understate
    // the baseline, so the comparison is dropped rather than shown partial.
    const prior = (0, analytics_js_1.getPriorDateRange)(days);
    const priorPeriod = prior.startDate >= analytics_js_1.BRANDED_DATA_START && notes.length === 0 ? prior : null;
    if (!priorPeriod) {
        notes.push(`No prior-period comparison: the previous ${days} days start before ${analytics_js_1.BRANDED_DATA_START}.`);
    }
    const dimensionFilterGroups = (0, analytics_js_1.buildFilterGroups)([], filterLists);
    const query = (range, dimensions) => (0, analytics_js_1.fetchAllRows)({ ...range, dimensions, dimensionFilterGroups, type: searchType }, siteUrl);
    const [split, priorSplit, daily, byQuery, byPage] = await Promise.all([
        query(period, ["brandedClassification"]),
        priorPeriod ? query(priorPeriod, ["brandedClassification"]) : Promise.resolve([]),
        includeTrend ? query(period, ["date", "brandedClassification"]) : Promise.resolve([]),
        query(period, ["brandedClassification", "query"]),
        query(period, ["brandedClassification", "page"]),
    ]);
    const base = {
        searchType: searchType || "web",
        period,
        priorPeriod,
        filterListsApplied: filterLists,
    };
    if (split.length === 0) {
        return {
            eligible: false,
            note: "Google returned no branded classification rows for this property and period. " +
                "The split exists only for top-level properties with sufficient query and impression volume, from " +
                `${analytics_js_1.BRANDED_DATA_START} onward. This is not a zero: the data is unavailable.`,
            ...base,
            branded: null,
            nonBranded: null,
            trend: [],
            topBrandedQueries: [],
            topNonBrandedQueries: [],
            topBrandedPages: [],
            topNonBrandedPages: [],
        };
    }
    const find = (rows, cls) => rows.find((r) => r.keys[0] === cls);
    const totalClicks = split.reduce((n, r) => n + r.clicks, 0);
    const totalImpressions = split.reduce((n, r) => n + r.impressions, 0);
    const summarise = (cls) => {
        const current = totals(find(split, cls));
        const before = priorPeriod ? totals(find(priorSplit, cls)) : null;
        return {
            ...current,
            clickShare: pct(current.clicks, totalClicks),
            impressionShare: pct(current.impressions, totalImpressions),
            prior: before,
            clicksChangePct: before ? changePct(current.clicks, before.clicks) : null,
            impressionsChangePct: before ? changePct(current.impressions, before.impressions) : null,
        };
    };
    const top = (rows, cls) => rows
        .filter((r) => r.keys[0] === cls)
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
        .slice(0, rowLimit)
        .map((r) => ({ key: r.keys[1], ...totals(r) }));
    const byDate = new Map();
    for (const r of daily) {
        const [date, cls] = r.keys;
        const day = byDate.get(date) ||
            { date, brandedClicks: 0, brandedImpressions: 0, nonBrandedClicks: 0, nonBrandedImpressions: 0 };
        if (cls === BRANDED) {
            day.brandedClicks = r.clicks;
            day.brandedImpressions = r.impressions;
        }
        else if (cls === NON_BRANDED) {
            day.nonBrandedClicks = r.clicks;
            day.nonBrandedImpressions = r.impressions;
        }
        byDate.set(date, day);
    }
    notes.push("Query lists omit anonymised queries, and page rows are aggregated by page, so neither list sums to the property totals above.");
    return {
        eligible: true,
        note: notes.join(" "),
        ...base,
        branded: summarise(BRANDED),
        nonBranded: summarise(NON_BRANDED),
        trend: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
        topBrandedQueries: top(byQuery, BRANDED),
        topNonBrandedQueries: top(byQuery, NON_BRANDED),
        topBrandedPages: top(byPage, BRANDED),
        topNonBrandedPages: top(byPage, NON_BRANDED),
    };
}
