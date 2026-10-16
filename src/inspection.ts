import { searchconsole_v1 } from "googleapis";
import { getSearchConsoleClient, getConfig } from "./auth.js";
import { propertyCandidates, fallbackNote, permissionHint } from "./property-candidates.js";

export interface InspectionResult {
  siteUrl: string;
  indexed: boolean;
  indexingState: string;
  lastCrawlTime: string | null;
  crawlAllowed: boolean;
  robotsTxtState: string;
  indexingAllowed: boolean;
  pageFetchState: string;
  googleCanonical: string | null;
  userCanonical: string | null;
  canonicalMatch: boolean;
  mobileUsability: string;
  verdict: string;
  issues: string[];
  note?: string;
}

export async function inspectUrl(url: string): Promise<InspectionResult> {
  const client = await getSearchConsoleClient();
  const { siteUrl: configSiteUrl } = getConfig();
  const candidates = propertyCandidates(configSiteUrl);

  let response: { data: searchconsole_v1.Schema$InspectUrlIndexResponse } | undefined;
  let usedSiteUrl = configSiteUrl;
  let firstError: any = null;

  for (const property of candidates) {
    try {
      response = await client.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: property,
        },
      });
      usedSiteUrl = property;
      break;
    } catch (err: any) {
      if (!firstError) firstError = err;
    }
  }

  if (!response) {
    throw new Error((firstError?.message || String(firstError)) + permissionHint(candidates));
  }

  const note = fallbackNote(usedSiteUrl, configSiteUrl);
  const result = response.data.inspectionResult;
  const indexStatus = result?.indexStatusResult;
  const mobileResult = result?.mobileUsabilityResult;

  const issues: string[] = [];

  if (indexStatus?.robotsTxtState === "DISALLOWED") {
    issues.push("Blocked by robots.txt");
  }
  if (indexStatus?.indexingState === "INDEXING_NOT_ALLOWED") {
    issues.push("Noindex tag detected");
  }
  if (indexStatus?.pageFetchState && indexStatus.pageFetchState !== "SUCCESSFUL") {
    issues.push(`Page fetch failed: ${indexStatus.pageFetchState}`);
  }

  const googleCanonical = indexStatus?.googleCanonical || null;
  const userCanonical = indexStatus?.userCanonical || null;

  if (googleCanonical && userCanonical && googleCanonical !== userCanonical) {
    issues.push(
      `Canonical mismatch: Google chose ${googleCanonical}, you declared ${userCanonical}`
    );
  }

  if (mobileResult?.verdict === "VERDICT_HAS_ISSUES") {
    const mobileIssues = mobileResult.issues || [];
    for (const issue of mobileIssues) {
      issues.push(`Mobile: ${issue.message || issue.issueType}`);
    }
  }

  return {
    siteUrl: usedSiteUrl,
    indexed: indexStatus?.coverageState === "Submitted and indexed" ||
             indexStatus?.verdict === "PASS",
    indexingState: indexStatus?.coverageState || "Unknown",
    lastCrawlTime: indexStatus?.lastCrawlTime || null,
    crawlAllowed: indexStatus?.robotsTxtState !== "DISALLOWED",
    robotsTxtState: indexStatus?.robotsTxtState || "Unknown",
    indexingAllowed: indexStatus?.indexingState !== "INDEXING_NOT_ALLOWED",
    pageFetchState: indexStatus?.pageFetchState || "Unknown",
    googleCanonical,
    userCanonical,
    canonicalMatch: googleCanonical === userCanonical || (!googleCanonical && !userCanonical),
    mobileUsability: mobileResult?.verdict || "Unknown",
    verdict: indexStatus?.verdict || "Unknown",
    issues,
    ...(note && { note }),
  };
}
