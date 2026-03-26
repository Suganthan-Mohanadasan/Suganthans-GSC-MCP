"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitSitemap = submitSitemap;
exports.listSitemaps = listSitemaps;
const auth_js_1 = require("../auth.js");
async function submitSitemap(sitemapUrl) {
    const client = await (0, auth_js_1.getSearchConsoleClient)();
    const { siteUrl } = (0, auth_js_1.getConfig)();
    const url = sitemapUrl || `${siteUrl}sitemap.xml`;
    try {
        await client.sitemaps.submit({
            siteUrl,
            feedpath: url,
        });
        return {
            siteUrl,
            sitemapUrl: url,
            success: true,
            error: null,
        };
    }
    catch (err) {
        return {
            siteUrl,
            sitemapUrl: url,
            success: false,
            error: err.message || String(err),
        };
    }
}
async function listSitemaps() {
    const client = await (0, auth_js_1.getSearchConsoleClient)();
    const { siteUrl } = (0, auth_js_1.getConfig)();
    const response = await client.sitemaps.list({ siteUrl });
    const sitemaps = (response.data.sitemap || []).map((s) => ({
        path: s.path || "",
        lastSubmitted: s.lastSubmitted || null,
        isPending: s.isPending || false,
        lastDownloaded: s.lastDownloaded || null,
        warnings: Number(s.warnings) || 0,
        errors: Number(s.errors) || 0,
        contents: (s.contents || []).map((c) => ({
            type: c.type || "unknown",
            submitted: Number(c.submitted) || 0,
            indexed: Number(c.indexed) || 0,
        })),
    }));
    return {
        siteUrl,
        sitemaps,
    };
}
