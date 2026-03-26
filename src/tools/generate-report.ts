import * as fs from "fs";
import { siteSnapshot } from "./site-snapshot.js";
import { quickWins } from "./quick-wins.js";
import { trafficDrops } from "./traffic-drops.js";
import { contentDecay } from "./content-decay.js";
import { checkAlerts } from "./check-alerts.js";
import { contentRecommendations } from "./content-recommendations.js";
import { getConfig } from "../auth.js";

interface ReportResult {
  filePath: string;
  sectionsIncluded: string[];
  summary: string;
}

const ALL_SECTIONS = [
  "snapshot",
  "alerts",
  "quick_wins",
  "traffic_drops",
  "content_decay",
  "recommendations",
];

export async function generateReport(
  outputPath?: string,
  days: number = 28,
  includeSections?: string[]
): Promise<ReportResult> {
  const sections = includeSections && includeSections.length > 0
    ? includeSections.filter((s) => ALL_SECTIONS.includes(s))
    : ALL_SECTIONS;

  const { siteUrl } = getConfig();
  const date = new Date().toISOString().split("T")[0];
  const filePath = outputPath || `./gsc-report-${date}.md`;

  // Run all requested tools in parallel
  const promises: Record<string, Promise<any>> = {};
  if (sections.includes("snapshot")) promises.snapshot = siteSnapshot(days);
  if (sections.includes("alerts")) promises.alerts = checkAlerts(7);
  if (sections.includes("quick_wins")) promises.quick_wins = quickWins(days, 50, 15);
  if (sections.includes("traffic_drops")) promises.traffic_drops = trafficDrops(days);
  if (sections.includes("content_decay")) promises.content_decay = contentDecay();
  if (sections.includes("recommendations")) promises.recommendations = contentRecommendations(days, 10);

  const results: Record<string, any> = {};
  const keys = Object.keys(promises);
  const values = await Promise.all(Object.values(promises));
  keys.forEach((key, i) => { results[key] = values[i]; });

  // Build markdown
  const lines: string[] = [];
  lines.push(`# GSC Performance Report`);
  lines.push(`**Site:** ${siteUrl}`);
  lines.push(`**Date:** ${date}`);
  lines.push(`**Period:** ${days} days`);
  lines.push("");

  // Snapshot
  if (results.snapshot) {
    const s = results.snapshot;
    lines.push(`## Site Snapshot`);
    lines.push("");
    lines.push(`| Metric | Current | Prior | Change |`);
    lines.push(`|--------|---------|-------|--------|`);
    lines.push(`| Clicks | ${s.current.clicks} | ${s.prior.clicks} | ${s.change.clicksPercent > 0 ? "+" : ""}${s.change.clicksPercent}% |`);
    lines.push(`| Impressions | ${s.current.impressions} | ${s.prior.impressions} | ${s.change.impressionsPercent > 0 ? "+" : ""}${s.change.impressionsPercent}% |`);
    lines.push(`| CTR | ${s.current.ctr}% | ${s.prior.ctr}% | ${s.change.ctr > 0 ? "+" : ""}${s.change.ctr} |`);
    lines.push(`| Position | ${s.current.position} | ${s.prior.position} | ${s.change.position > 0 ? "+" : ""}${s.change.position} |`);
    lines.push("");
  }

  // Alerts
  if (results.alerts) {
    const a = results.alerts;
    lines.push(`## Alerts (${a.summary.total} total: ${a.summary.critical} critical, ${a.summary.warning} warning)`);
    lines.push("");
    if (a.alerts.length === 0) {
      lines.push("No alerts triggered. Everything looks healthy.");
    } else {
      for (const alert of a.alerts.slice(0, 20)) {
        const icon = alert.severity === "critical" ? "!!!" : alert.severity === "warning" ? "!!" : "!";
        lines.push(`- **[${alert.severity.toUpperCase()}]** ${alert.entity}: ${alert.detail}`);
      }
    }
    lines.push("");
  }

  // Quick Wins
  if (results.quick_wins) {
    const wins = results.quick_wins;
    lines.push(`## Quick Wins (${wins.length} opportunities)`);
    lines.push("");
    if (wins.length > 0) {
      lines.push(`| Keyword | Position | Impressions | CTR | Opportunity |`);
      lines.push(`|---------|----------|-------------|-----|-------------|`);
      for (const w of wins.slice(0, 15)) {
        lines.push(`| ${w.query} | ${w.position} | ${w.impressions} | ${w.ctr}% | +${w.opportunity} clicks |`);
      }
    }
    lines.push("");
  }

  // Traffic Drops
  if (results.traffic_drops) {
    const drops = results.traffic_drops;
    lines.push(`## Traffic Drops (${drops.length} pages declining)`);
    lines.push("");
    if (drops.length > 0) {
      lines.push(`| Page | Current | Prior | Change | Diagnosis |`);
      lines.push(`|------|---------|-------|--------|-----------|`);
      for (const d of drops.slice(0, 15)) {
        lines.push(`| ${d.page} | ${d.currentClicks} | ${d.priorClicks} | ${d.clickChange} | ${d.diagnosis} |`);
      }
    }
    lines.push("");
  }

  // Content Decay
  if (results.content_decay) {
    const decay = results.content_decay;
    lines.push(`## Content Decay (${decay.length} pages with 3-month decline)`);
    lines.push("");
    if (decay.length > 0) {
      lines.push(`| Page | Month 1 | Month 2 | Month 3 | Total Loss | Trend |`);
      lines.push(`|------|---------|---------|---------|------------|-------|`);
      for (const d of decay.slice(0, 15)) {
        lines.push(`| ${d.page} | ${d.period3Clicks} | ${d.period2Clicks} | ${d.period1Clicks} | -${d.totalClickLoss} | ${d.positionTrend} |`);
      }
    }
    lines.push("");
  }

  // Recommendations
  if (results.recommendations) {
    const recs = results.recommendations;
    lines.push(`## Content Recommendations (${recs.recommendations.length} actions, ~${recs.summary.totalOpportunity} potential clicks)`);
    lines.push("");
    for (const rec of recs.recommendations) {
      lines.push(`### ${rec.priority}. [${rec.action.toUpperCase()}] ${rec.targetKeyword || rec.targetPage}`);
      lines.push(rec.reasoning);
      if (rec.secondaryPages) {
        lines.push(`Consolidate: ${rec.secondaryPages.join(", ")}`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`*Generated by GSC MCP Server v2.0.0*`);

  const markdown = lines.join("\n");
  fs.writeFileSync(filePath, markdown, "utf8");

  return {
    filePath,
    sectionsIncluded: sections,
    summary: `Report saved to ${filePath} with ${sections.length} sections. ` +
      (results.alerts ? `${results.alerts.summary.total} alerts. ` : "") +
      (results.quick_wins ? `${results.quick_wins.length} quick wins. ` : "") +
      (results.recommendations ? `${results.recommendations.recommendations.length} recommendations.` : ""),
  };
}
