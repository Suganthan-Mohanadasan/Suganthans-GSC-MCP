import { inspectUrl, InspectionResult } from "../inspection.js";

interface InspectionSummary {
  url: string;
  indexed: boolean;
  indexingState: string;
  lastCrawlTime: string | null;
  crawlAllowed: boolean;
  indexingAllowed: boolean;
  pageFetchState: string;
  googleCanonical: string | null;
  userCanonical: string | null;
  canonicalMatch: boolean;
  mobileUsability: string;
  issues: string[];
  summary: string;
}

export async function inspectUrlTool(url: string): Promise<InspectionSummary> {
  const result = await inspectUrl(url);

  let summary: string;

  if (result.indexed && result.issues.length === 0) {
    summary = `This URL is indexed and healthy.${
      result.lastCrawlTime ? ` Last crawled: ${result.lastCrawlTime}.` : ""
    }`;
  } else if (result.indexed && result.issues.length > 0) {
    summary = `This URL is indexed but has ${result.issues.length} issue(s): ${result.issues.join("; ")}.`;
  } else {
    summary = `This URL is NOT indexed. State: ${result.indexingState}. Issues: ${
      result.issues.length > 0 ? result.issues.join("; ") : "No specific issues detected, but the page is not in the index."
    }`;
  }

  return {
    url,
    indexed: result.indexed,
    indexingState: result.indexingState,
    lastCrawlTime: result.lastCrawlTime,
    crawlAllowed: result.crawlAllowed,
    indexingAllowed: result.indexingAllowed,
    pageFetchState: result.pageFetchState,
    googleCanonical: result.googleCanonical,
    userCanonical: result.userCanonical,
    canonicalMatch: result.canonicalMatch,
    mobileUsability: result.mobileUsability,
    issues: result.issues,
    summary,
  };
}
