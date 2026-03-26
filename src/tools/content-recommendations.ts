import { quickWins } from "./quick-wins.js";
import { contentGaps } from "./content-gaps.js";
import { cannibalizationCheck } from "./cannibalization-check.js";

interface Recommendation {
  priority: number;
  action: "update" | "create" | "consolidate";
  targetPage?: string;
  targetKeyword?: string;
  secondaryPages?: string[];
  keywords?: string[];
  estimatedOpportunity: number;
  reasoning: string;
}

interface RecommendationResult {
  recommendations: Recommendation[];
  summary: {
    update: number;
    create: number;
    consolidate: number;
    totalOpportunity: number;
  };
}

export async function contentRecommendations(
  days: number = 28,
  maxRecommendations: number = 10
): Promise<RecommendationResult> {
  const [wins, gaps, cannibalization] = await Promise.all([
    quickWins(days, 50, 15),
    contentGaps(90, 30, 20),
    cannibalizationCheck(days, 30),
  ]);

  const recs: Recommendation[] = [];

  // Category A: Update existing pages (group quick wins by their ranking page)
  // Need query+page data to know which page ranks for each query
  // Quick wins only return queries, so we group by opportunity
  const pageQuickWins = new Map<string, { keywords: string[]; totalOpportunity: number }>();

  // Since quick wins don't include page data, we create update recommendations per keyword
  // with high opportunity
  for (const win of wins.slice(0, 20)) {
    recs.push({
      priority: 0,
      action: "update",
      targetKeyword: win.query,
      estimatedOpportunity: win.opportunity,
      reasoning: `Ranking at position ${win.position} with ${win.impressions} impressions. ` +
        `Moving to position 3 could gain ~${win.opportunity} extra clicks. ` +
        `Current CTR: ${win.ctr}%. Optimise content, internal links, and on-page SEO.`,
    });
  }

  // Category B: Create new content for content gaps
  for (const gap of gaps.slice(0, 20)) {
    // Estimate opportunity: if we could rank at position 5, what would traffic look like?
    const estimatedCtr = 0.072; // position 5 benchmark
    const estimatedClicks = Math.round(gap.impressions * estimatedCtr);

    recs.push({
      priority: 0,
      action: "create",
      targetKeyword: gap.query,
      estimatedOpportunity: estimatedClicks,
      reasoning: `${gap.impressions} impressions but ranking at position ${gap.position}. ` +
        `No page properly targets this query. Creating dedicated content could capture ` +
        `~${estimatedClicks} clicks/month.`,
    });
  }

  // Category C: Consolidate cannibalising pages
  for (const issue of cannibalization.slice(0, 20)) {
    const pages = issue.pages;
    const bestPage = pages[0]; // already sorted by position
    const otherPages = pages.slice(1);
    // Opportunity: combine all impressions under one page
    const totalClicks = pages.reduce((sum, p) => sum + p.clicks, 0);
    const estimatedGain = Math.round(issue.totalImpressions * 0.05); // conservative 5% CTR uplift

    recs.push({
      priority: 0,
      action: "consolidate",
      targetPage: bestPage.page,
      targetKeyword: issue.query,
      secondaryPages: otherPages.map((p) => p.page),
      estimatedOpportunity: estimatedGain,
      reasoning: `${pages.length} pages compete for "${issue.query}" (${issue.totalImpressions} impressions). ` +
        `Best page ranks at ${bestPage.position}. Consolidating to one authoritative page and ` +
        `redirecting others could improve ranking and capture ~${estimatedGain} additional clicks.`,
    });
  }

  // Score and sort all recommendations by estimated opportunity
  recs.sort((a, b) => b.estimatedOpportunity - a.estimatedOpportunity);

  // Assign priorities
  const final = recs.slice(0, maxRecommendations).map((rec, i) => ({
    ...rec,
    priority: i + 1,
  }));

  const summary = {
    update: final.filter((r) => r.action === "update").length,
    create: final.filter((r) => r.action === "create").length,
    consolidate: final.filter((r) => r.action === "consolidate").length,
    totalOpportunity: final.reduce((sum, r) => sum + r.estimatedOpportunity, 0),
  };

  return { recommendations: final, summary };
}
