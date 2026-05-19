"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareWebVsImage = compareWebVsImage;
const analytics_js_1 = require("../analytics.js");
/**
 * For each query, returns side-by-side performance across the web and image
 * search surfaces. Two API calls (type=web, type=image), joined on query.
 *
 * The `imageVsWebImpressionsRatio` field surfaces queries where image search
 * carries a disproportionate share of impressions vs web search; on
 * image-heavy sites this ratio can exceed 1 across most of the catalogue.
 * `-1` indicates the query has image impressions but zero web impressions.
 */
async function compareWebVsImage(days = 90, minCombinedImpressions = 100, rowLimit = 50) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const [webRows, imageRows] = await Promise.all([
        (0, analytics_js_1.fetchAllRows)({ startDate, endDate, dimensions: ["query"], type: "web" }),
        (0, analytics_js_1.fetchAllRows)({ startDate, endDate, dimensions: ["query"], type: "image" }),
    ]);
    const toMap = (rows) => {
        const map = new Map();
        for (const r of rows) {
            map.set(r.keys[0], r);
        }
        return map;
    };
    const webMap = toMap(webRows);
    const imageMap = toMap(imageRows);
    const queries = new Set();
    for (const q of webMap.keys())
        queries.add(q);
    for (const q of imageMap.keys())
        queries.add(q);
    const results = [];
    for (const query of queries) {
        const web = webMap.get(query);
        const image = imageMap.get(query);
        const webImpr = web?.impressions || 0;
        const imageImpr = image?.impressions || 0;
        if (webImpr + imageImpr < minCombinedImpressions)
            continue;
        results.push({
            query,
            webClicks: web?.clicks || 0,
            webImpressions: webImpr,
            webCtr: web ? Math.round(web.ctr * 10000) / 100 : 0,
            webPosition: web ? Math.round(web.position * 10) / 10 : null,
            imageClicks: image?.clicks || 0,
            imageImpressions: imageImpr,
            imageCtr: image ? Math.round(image.ctr * 10000) / 100 : 0,
            imagePosition: image ? Math.round(image.position * 10) / 10 : null,
            imageVsWebImpressionsRatio: webImpr > 0
                ? Math.round((imageImpr / webImpr) * 100) / 100
                : -1,
        });
    }
    // Sort by combined impressions desc
    results.sort((a, b) => b.webImpressions + b.imageImpressions - (a.webImpressions + a.imageImpressions));
    return results.slice(0, rowLimit);
}
