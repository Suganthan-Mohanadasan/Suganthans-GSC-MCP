"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAlerts = checkAlerts;
const analytics_js_1 = require("../analytics.js");
async function checkAlerts(days = 7, positionDropThreshold = 20, ctrDropThreshold = 50, clickDropThreshold = 30) {
    const current = (0, analytics_js_1.getDateRange)(days);
    const prior = (0, analytics_js_1.getPriorDateRange)(days);
    // Fetch query+page level data for both periods
    const [currentRows, priorRows] = await Promise.all([
        (0, analytics_js_1.fetchAllRows)({ startDate: current.startDate, endDate: current.endDate, dimensions: ["query", "page"] }),
        (0, analytics_js_1.fetchAllRows)({ startDate: prior.startDate, endDate: prior.endDate, dimensions: ["query", "page"] }),
    ]);
    // Build prior period lookup: key = "query|||page"
    const priorMap = new Map();
    for (const row of priorRows) {
        const key = `${row.keys[0]}|||${row.keys[1]}`;
        priorMap.set(key, {
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
        });
    }
    // Build current period lookup
    const currentMap = new Map();
    for (const row of currentRows) {
        const key = `${row.keys[0]}|||${row.keys[1]}`;
        currentMap.set(key, {
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
        });
    }
    const alerts = [];
    // Check current rows against prior
    for (const row of currentRows) {
        const key = `${row.keys[0]}|||${row.keys[1]}`;
        const prior = priorMap.get(key);
        if (!prior)
            continue;
        const query = row.keys[0];
        const page = row.keys[1];
        // Position drop check
        const positionDrop = row.position - prior.position;
        if (positionDrop > positionDropThreshold) {
            const severity = positionDrop > positionDropThreshold * 2 ? "critical" : "warning";
            alerts.push({
                severity,
                type: "position_drop",
                entity: `${query} on ${page}`,
                detail: `Position dropped from ${Math.round(prior.position * 10) / 10} to ${Math.round(row.position * 10) / 10} (${Math.round(positionDrop)} positions)`,
                currentValue: Math.round(row.position * 10) / 10,
                previousValue: Math.round(prior.position * 10) / 10,
                change: Math.round(positionDrop * 10) / 10,
            });
        }
        // CTR drop check (percentage drop relative to prior)
        if (prior.ctr > 0 && prior.impressions >= 10) {
            const ctrDropPercent = ((prior.ctr - row.ctr) / prior.ctr) * 100;
            if (ctrDropPercent > ctrDropThreshold) {
                const severity = ctrDropPercent > ctrDropThreshold * 2 ? "critical" : "warning";
                alerts.push({
                    severity,
                    type: "ctr_drop",
                    entity: `${query} on ${page}`,
                    detail: `CTR dropped from ${Math.round(prior.ctr * 10000) / 100}% to ${Math.round(row.ctr * 10000) / 100}% (${Math.round(ctrDropPercent)}% decline)`,
                    currentValue: Math.round(row.ctr * 10000) / 100,
                    previousValue: Math.round(prior.ctr * 10000) / 100,
                    change: -Math.round(ctrDropPercent),
                });
            }
        }
        // Click drop check (percentage drop relative to prior)
        if (prior.clicks >= 5) {
            const clickDropPercent = ((prior.clicks - row.clicks) / prior.clicks) * 100;
            if (clickDropPercent > clickDropThreshold) {
                const severity = clickDropPercent > clickDropThreshold * 2 ? "critical" : "warning";
                alerts.push({
                    severity,
                    type: "click_drop",
                    entity: `${query} on ${page}`,
                    detail: `Clicks dropped from ${prior.clicks} to ${row.clicks} (${Math.round(clickDropPercent)}% decline)`,
                    currentValue: row.clicks,
                    previousValue: prior.clicks,
                    change: -Math.round(clickDropPercent),
                });
            }
        }
    }
    // Check for disappeared pages (in prior but not in current)
    for (const [key, prior] of priorMap) {
        if (!currentMap.has(key) && prior.clicks >= 5) {
            const [query, page] = key.split("|||");
            alerts.push({
                severity: prior.clicks >= 20 ? "critical" : "warning",
                type: "disappeared",
                entity: `${query} on ${page}`,
                detail: `Had ${prior.clicks} clicks in prior period, zero in current. Page may have dropped out of search results entirely.`,
                currentValue: 0,
                previousValue: prior.clicks,
                change: -prior.clicks,
            });
        }
    }
    // Deduplicate: keep highest severity per entity
    const deduped = new Map();
    for (const alert of alerts) {
        const existing = deduped.get(alert.entity);
        if (!existing || severityRank(alert.severity) > severityRank(existing.severity)) {
            deduped.set(alert.entity, alert);
        }
    }
    const finalAlerts = Array.from(deduped.values());
    finalAlerts.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || Math.abs(b.change) - Math.abs(a.change));
    const summary = {
        critical: finalAlerts.filter((a) => a.severity === "critical").length,
        warning: finalAlerts.filter((a) => a.severity === "warning").length,
        info: finalAlerts.filter((a) => a.severity === "info").length,
        total: finalAlerts.length,
    };
    return {
        alerts: finalAlerts.slice(0, 100),
        summary,
        period: { days, ...current },
        thresholds: {
            positionDrop: positionDropThreshold,
            ctrDrop: ctrDropThreshold,
            clickDrop: clickDropThreshold,
        },
    };
}
function severityRank(severity) {
    switch (severity) {
        case "critical": return 3;
        case "warning": return 2;
        case "info": return 1;
        default: return 0;
    }
}
