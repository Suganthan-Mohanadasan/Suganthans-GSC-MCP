"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imagePageAudit = imagePageAudit;
const node_html_parser_1 = require("node-html-parser");
const image_size_1 = require("image-size");
const exifr_1 = __importDefault(require("exifr"));
/**
 * Fetches pages from the user's own site and audits every image on them
 * against the on-page factors that drive image-search performance: alt text,
 * filenames, dimension attributes, lazy loading on the LCP candidate,
 * responsive markup, file format and weight, intrinsic dimensions against
 * Google's ~250x200 indexing minimum, ImageObject / licensable schema,
 * max-image-preview, and (optionally) the metadata inside the image files
 * themselves (camera EXIF that should be stripped, IPTC editorial fields
 * that should survive, XMP DigitalSourceType on AI-generated images).
 *
 * This is the bridge from "which pages fail" (image_impressions_no_clicks,
 * image_search_quick_wins) to "why they fail". It only ever fetches the
 * URLs it is given; no third-party service is involved.
 */
const USER_AGENT = "suganthan-gsc-mcp/2.5 image_page_audit (+https://github.com/Suganthan-Mohanadasan/Suganthans-GSC-MCP)";
const PAGE_TIMEOUT_MS = 15000;
const IMAGE_TIMEOUT_MS = 12000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const INDEX_MIN_WIDTH = 250;
const INDEX_MIN_HEIGHT = 200;
const INDEX_MIN_AREA = 50000;
const HEAVY_BYTES = 300 * 1024;
const OVERSIZED_BYTES = 500 * 1024;
const PNG_PHOTO_BYTES = 150 * 1024;
const GENERIC_ALTS = new Set([
    "image",
    "img",
    "photo",
    "picture",
    "pic",
    "icon",
    "logo",
    "graphic",
    "banner",
    "screenshot",
    "untitled",
    "alt",
    "thumbnail",
]);
const GENERIC_FILENAME = /^(img|image|dsc[fn]?|mvimg|pxl|screen[-_ ]?shot|screenshot|photo|unnamed|untitled|capture|whatsapp[-_ ]image|signal[-_]attachment|hero|thumbnail|default|placeholder|final|new)[\-_ ]?\d*$/i;
function basenameNoExt(src) {
    try {
        const path = new URL(src).pathname;
        const base = path.split("/").filter(Boolean).pop() ?? "";
        return decodeURIComponent(base.replace(/\.[a-z0-9]+$/i, ""));
    }
    catch {
        return "";
    }
}
function classifyFilename(src) {
    const base = basenameNoExt(src);
    if (!base)
        return "ok";
    if (GENERIC_FILENAME.test(base) || /^\d+$/.test(base)) {
        return "generic_or_nondescriptive";
    }
    if (/^[0-9a-f]{16,}$/i.test(base.replace(/-/g, "")))
        return "hash_or_id";
    return "ok";
}
function classifyAlt(alt, src, duplicateAlts) {
    if (alt === null)
        return "missing";
    const trimmed = alt.trim();
    if (trimmed === "")
        return "empty";
    const lower = trimmed.toLowerCase();
    if (GENERIC_ALTS.has(lower))
        return "generic";
    const base = basenameNoExt(src).toLowerCase().replace(/[-_]+/g, " ").trim();
    if (base && lower === base)
        return "filename_as_alt";
    if (duplicateAlts.has(lower))
        return "duplicate";
    return "ok";
}
function walkForImageObjects(node, hits) {
    if (Array.isArray(node)) {
        for (const item of node)
            walkForImageObjects(item, hits);
        return;
    }
    if (node && typeof node === "object") {
        const obj = node;
        const type = obj["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.includes("ImageObject"))
            hits.push(obj);
        for (const value of Object.values(obj))
            walkForImageObjects(value, hits);
    }
}
async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
            redirect: "follow",
            signal: controller.signal,
        });
    }
    finally {
        clearTimeout(timer);
    }
}
async function auditImage(src, fetchMetadata) {
    const result = { fetched: false };
    const response = await fetchWithTimeout(src, IMAGE_TIMEOUT_MS);
    if (!response.ok)
        return result;
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > MAX_IMAGE_BYTES)
        return result;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES)
        return result;
    result.fetched = true;
    result.bytes = buffer.length;
    const contentType = response.headers.get("content-type") ?? "";
    result.format = contentType.split(";")[0].trim() || null;
    try {
        const dims = (0, image_size_1.imageSize)(buffer);
        result.intrinsic_width = dims.width ?? null;
        result.intrinsic_height = dims.height ?? null;
        if (dims.width && dims.height) {
            result.below_indexing_minimum =
                dims.width * dims.height < INDEX_MIN_AREA ||
                    dims.width < INDEX_MIN_WIDTH ||
                    dims.height < INDEX_MIN_HEIGHT;
        }
    }
    catch {
        result.intrinsic_width = null;
        result.intrinsic_height = null;
    }
    result.weight_status =
        buffer.length > OVERSIZED_BYTES
            ? "oversized"
            : buffer.length > HEAVY_BYTES
                ? "heavy"
                : "ok";
    result.png_likely_photo =
        result.format === "image/png" && buffer.length > PNG_PHOTO_BYTES;
    if (fetchMetadata) {
        try {
            const meta = await exifr_1.default.parse(buffer, {
                tiff: true,
                exif: true,
                gps: true,
                iptc: true,
                xmp: true,
            });
            if (meta) {
                result.metadata = {
                    camera_exif_present: Boolean(meta.Make || meta.Model || meta.ISO),
                    gps_present: Boolean(meta.latitude || meta.longitude || meta.GPSLatitude),
                    iptc_creator: Boolean(meta.Creator || meta["By-line"] || meta.Byline || meta.creator),
                    iptc_copyright: Boolean(meta.Copyright || meta.CopyrightNotice || meta.rights),
                    iptc_caption: Boolean(meta.Caption || meta["Caption-Abstract"] || meta.description),
                    digital_source_type: typeof meta.DigitalSourceType === "string"
                        ? meta.DigitalSourceType.split("/").pop() ?? null
                        : null,
                };
            }
            else {
                result.metadata = null;
            }
        }
        catch {
            result.metadata = null;
        }
    }
    return result;
}
function imageIssues(finding) {
    const issues = [];
    if (finding.alt_status === "missing")
        issues.push("alt attribute missing");
    if (finding.alt_status === "generic")
        issues.push("generic alt text");
    if (finding.alt_status === "filename_as_alt")
        issues.push("alt text is just the filename");
    if (finding.alt_status === "duplicate")
        issues.push("alt text duplicated on this page");
    if (finding.filename_status !== "ok")
        issues.push("non-descriptive filename");
    if (!finding.has_width_height_attrs)
        issues.push("no width/height attributes (layout shift)");
    if (finding.below_indexing_minimum)
        issues.push("below Google's ~250x200 indexing minimum");
    if (finding.weight_status === "oversized")
        issues.push("over 500KB");
    if (finding.png_likely_photo)
        issues.push("photo shipped as PNG (use WebP/AVIF)");
    if (finding.metadata?.gps_present)
        issues.push("GPS coordinates in EXIF (privacy)");
    return issues;
}
async function imagePageAudit(urls, fetchMetadata = true, maxImagesPerPage = 12, maxImagesReported = 20) {
    const audits = [];
    for (const rawUrl of urls.slice(0, 5)) {
        const audit = { url: rawUrl, status: "ok", http_status: null };
        audits.push(audit);
        let response;
        try {
            response = await fetchWithTimeout(rawUrl, PAGE_TIMEOUT_MS);
        }
        catch (error) {
            audit.status = "fetch_failed";
            audit.error = error instanceof Error ? error.message : String(error);
            continue;
        }
        audit.http_status = response.status;
        if (!response.ok) {
            audit.status = "fetch_failed";
            audit.error = `HTTP ${response.status}`;
            continue;
        }
        const html = await response.text();
        const root = (0, node_html_parser_1.parse)(html);
        const pageUrl = response.url || rawUrl;
        // ── Page-level checks ────────────────────────────────────────────
        const robotsContent = root
            .querySelectorAll('meta[name="robots"], meta[name="googlebot"]')
            .map((m) => m.getAttribute("content") ?? "")
            .join(",");
        const previewMatch = robotsContent.match(/max-image-preview:\s*(\w+)/i);
        const ldBlocks = root.querySelectorAll('script[type="application/ld+json"]');
        const imageObjects = [];
        let hasPrimaryImage = false;
        for (const block of ldBlocks) {
            try {
                const json = JSON.parse(block.textContent);
                walkForImageObjects(json, imageObjects);
                if (JSON.stringify(json).includes("primaryImageOfPage"))
                    hasPrimaryImage = true;
            }
            catch {
                // Malformed JSON-LD is its own problem, but not this tool's.
            }
        }
        const hasLicensable = imageObjects.some((o) => o.license || o.acquireLicensePage || o.creditText || o.copyrightNotice);
        const backgroundCount = root
            .querySelectorAll("[style]")
            .filter((el) => /background(-image)?\s*:\s*url\(/i.test(el.getAttribute("style") ?? "")).length;
        const modernSources = root
            .querySelectorAll("picture source")
            .some((s) => /image\/(avif|webp)/i.test(s.getAttribute("type") ?? ""));
        // ── Collect content images ───────────────────────────────────────
        const imgElements = root.querySelectorAll("img");
        const candidates = [];
        const seen = new Set();
        for (const el of imgElements) {
            let src = el.getAttribute("src") ??
                el.getAttribute("data-src") ??
                (el.getAttribute("srcset") ?? "").split(/[\s,]+/)[0] ??
                "";
            if (!src || src.startsWith("data:"))
                continue;
            try {
                src = new URL(src, pageUrl).href;
            }
            catch {
                continue;
            }
            if (seen.has(src))
                continue;
            seen.add(src);
            candidates.push({ el, src });
        }
        const isIconLike = (c) => {
            const w = Number(c.el.getAttribute("width") ?? "0");
            const h = Number(c.el.getAttribute("height") ?? "0");
            if ((w && w < 100) || (h && h < 100))
                return true;
            return /logo|icon|avatar|favicon|badge|emoji/i.test(c.src);
        };
        const contentImages = candidates.filter((c) => !isIconLike(c));
        const svgImages = contentImages.filter((c) => /\.svg(\?|$)/i.test(c.src));
        const fetchable = contentImages.filter((c) => !/\.svg(\?|$)/i.test(c.src));
        const lcpCandidate = contentImages[0] ?? null;
        // Duplicate alt detection across the page.
        const altCounts = new Map();
        for (const c of contentImages) {
            const alt = c.el.getAttribute("alt");
            if (alt && alt.trim()) {
                const key = alt.trim().toLowerCase();
                altCounts.set(key, (altCounts.get(key) ?? 0) + 1);
            }
        }
        const duplicateAlts = new Set([...altCounts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
        // ── Per-image findings ───────────────────────────────────────────
        const findings = [];
        for (const c of contentImages) {
            const alt = c.el.hasAttribute("alt") ? (c.el.getAttribute("alt") ?? "") : null;
            const finding = {
                src: c.src,
                alt,
                alt_status: classifyAlt(alt, c.src, duplicateAlts),
                filename_status: classifyFilename(c.src),
                has_width_height_attrs: c.el.hasAttribute("width") && c.el.hasAttribute("height"),
                loading: c.el.getAttribute("loading") ?? null,
                fetchpriority: c.el.getAttribute("fetchpriority") ?? null,
                has_srcset: c.el.hasAttribute("srcset"),
                fetched: false,
                format: null,
                bytes: null,
                intrinsic_width: null,
                intrinsic_height: null,
                below_indexing_minimum: null,
                weight_status: null,
                png_likely_photo: null,
                metadata: null,
                issues: [],
            };
            findings.push(finding);
        }
        const toFetch = findings
            .filter((f) => fetchable.some((c) => c.src === f.src))
            .slice(0, maxImagesPerPage);
        for (const finding of toFetch) {
            try {
                Object.assign(finding, await auditImage(finding.src, fetchMetadata));
            }
            catch {
                // Fetch failure on one image never sinks the audit.
            }
        }
        for (const finding of findings)
            finding.issues = imageIssues(finding);
        // ── Summaries ────────────────────────────────────────────────────
        const issueCounts = {};
        for (const finding of findings) {
            for (const issue of finding.issues) {
                issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
            }
        }
        const lcpLazy = lcpCandidate
            ? (lcpCandidate.el.getAttribute("loading") ?? "").toLowerCase() === "lazy"
            : null;
        const topFixes = [];
        if (lcpLazy)
            topFixes.push("Remove loading=\"lazy\" from the LCP image and add fetchpriority=\"high\"");
        const altBroken = (issueCounts["alt attribute missing"] ?? 0) +
            (issueCounts["generic alt text"] ?? 0) +
            (issueCounts["alt text is just the filename"] ?? 0);
        if (altBroken > 0)
            topFixes.push(`Rewrite alt text on ${altBroken} image(s) to describe what the image shows`);
        if (issueCounts["below Google's ~250x200 indexing minimum"])
            topFixes.push(`Re-export ${issueCounts["below Google's ~250x200 indexing minimum"]} image(s) above 250x200; below that Google skips them`);
        if ((issueCounts["over 500KB"] ?? 0) + (issueCounts["photo shipped as PNG (use WebP/AVIF)"] ?? 0) > 0)
            topFixes.push("Convert heavy PNG/oversized images to WebP or AVIF");
        if (issueCounts["non-descriptive filename"])
            topFixes.push(`Rename ${issueCounts["non-descriptive filename"]} image file(s) to subject-modifier-context form`);
        if (imageObjects.length === 0)
            topFixes.push("Add ImageObject schema (with about/mainEntity) for the page's key images");
        if (!previewMatch)
            topFixes.push("Add max-image-preview:large to the robots meta for full-size previews");
        audit.page_checks = {
            total_img_tags: imgElements.length,
            content_images: contentImages.length,
            images_fetched: toFetch.length,
            lcp_candidate_src: lcpCandidate?.src ?? null,
            lcp_candidate_lazy_loaded: lcpLazy,
            lcp_candidate_fetchpriority: lcpCandidate?.el.getAttribute("fetchpriority") ?? null,
            inline_background_images: backgroundCount,
            max_image_preview: previewMatch ? previewMatch[1].toLowerCase() : "not_set",
            image_object_schema_count: imageObjects.length,
            has_licensable_fields: hasLicensable,
            has_primary_image_of_page: hasPrimaryImage,
            images_with_srcset: findings.filter((f) => f.has_srcset).length,
            modern_format_sources: modernSources,
        };
        audit.images = findings.slice(0, maxImagesReported);
        audit.images_not_reported = Math.max(0, findings.length - maxImagesReported);
        audit.issue_counts = issueCounts;
        audit.top_fixes = topFixes;
        void svgImages;
    }
    const overall = {
        pages_audited: audits.filter((a) => a.status === "ok").length,
        pages_failed: audits.filter((a) => a.status !== "ok").length,
        total_issues: audits.reduce((sum, a) => sum + Object.values(a.issue_counts ?? {}).reduce((s, n) => s + n, 0), 0),
        note: "empty alt (alt=\"\") is correct for decorative images; it is reported but not counted as an issue.",
    };
    return { audits, overall };
}
