"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitSitemap = submitSitemap;
exports.listSitemaps = listSitemaps;
const auth_js_1 = require("../auth.js");
const oauth_js_1 = require("../oauth.js");
/**
 * The Sitemaps API accepts sc-domain: properties directly, so the configured
 * property is always tried as-is first (#7). The URL-prefix conversions stay
 * on as fallbacks for accounts where the permission actually lives on a
 * matching URL-prefix property rather than the domain property.
 */
function sitemapPropertyCandidates(siteUrl) {
    if (siteUrl.startsWith("sc-domain:")) {
        const domain = siteUrl.replace("sc-domain:", "");
        return [siteUrl, `https://${domain}/`, `https://www.${domain}/`];
    }
    return [siteUrl];
}
function defaultSitemapUrl(property) {
    if (property.startsWith("sc-domain:")) {
        return `https://${property.replace("sc-domain:", "")}/sitemap.xml`;
    }
    return `${property}sitemap.xml`;
}
function fallbackNote(used, configured) {
    if (used === configured)
        return undefined;
    return (`The configured property (${configured}) rejected the call, so the ` +
        `URL-prefix property (${used}) was used instead. The results belong to ` +
        `that property, which may differ from the domain property's own sitemap list.`);
}
function permissionHint(candidates) {
    return (` Tried: ${candidates.join(", ")}. Check that the authenticated account ` +
        `has sitemap permission on the property in Search Console.`);
}
async function submitSitemap(sitemapUrl) {
    if ((0, auth_js_1.getAuthMode)() === "oauth" && (0, oauth_js_1.getScopeTier)() === "readonly") {
        return {
            siteUrl: "",
            sitemapUrl: sitemapUrl || "",
            success: false,
            error: "Sitemap submission needs full access, but this install is in read only mode (GSC_SCOPES=readonly). " +
                "Re-run `npx suganthan-gsc-mcp setup --reauth` and choose full access, then try again.",
        };
    }
    const client = await (0, auth_js_1.getSearchConsoleClient)();
    const { siteUrl: configSiteUrl } = (0, auth_js_1.getConfig)();
    const candidates = sitemapPropertyCandidates(configSiteUrl);
    let firstError = null;
    for (const property of candidates) {
        const feedpath = sitemapUrl || defaultSitemapUrl(property);
        try {
            await client.sitemaps.submit({ siteUrl: property, feedpath });
            const note = fallbackNote(property, configSiteUrl);
            return {
                siteUrl: property,
                sitemapUrl: feedpath,
                success: true,
                error: null,
                ...(note && { note }),
            };
        }
        catch (err) {
            if (!firstError)
                firstError = err;
        }
    }
    return {
        siteUrl: configSiteUrl,
        sitemapUrl: sitemapUrl || defaultSitemapUrl(configSiteUrl),
        success: false,
        error: (firstError?.message || String(firstError)) + permissionHint(candidates),
    };
}
async function listSitemaps() {
    const client = await (0, auth_js_1.getSearchConsoleClient)();
    const { siteUrl: configSiteUrl } = (0, auth_js_1.getConfig)();
    const candidates = sitemapPropertyCandidates(configSiteUrl);
    let firstError = null;
    for (const property of candidates) {
        try {
            const response = await client.sitemaps.list({ siteUrl: property });
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
            const note = fallbackNote(property, configSiteUrl);
            return {
                siteUrl: property,
                sitemaps,
                ...(note && { note }),
            };
        }
        catch (err) {
            if (!firstError)
                firstError = err;
        }
    }
    throw new Error((firstError?.message || String(firstError)) + permissionHint(candidates));
}
