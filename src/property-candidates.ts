/**
 * Several Search Console APIs (Sitemaps, URL Inspection) accept sc-domain:
 * properties directly, so the configured property is always tried as-is
 * first. The URL-prefix conversions stay on as fallbacks for accounts where
 * the permission actually lives on a matching URL-prefix property rather
 * than the domain property.
 */
export function propertyCandidates(siteUrl: string): string[] {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.replace("sc-domain:", "");
    return [siteUrl, `https://${domain}/`, `https://www.${domain}/`];
  }
  return [siteUrl];
}

export function fallbackNote(used: string, configured: string): string | undefined {
  if (used === configured) return undefined;
  return (
    `The configured property (${configured}) rejected the call, so the ` +
    `URL-prefix property (${used}) was used instead. The results belong to ` +
    `that property, which may differ from the configured property's own data.`
  );
}

export function permissionHint(candidates: string[]): string {
  return (
    ` Tried: ${candidates.join(", ")}. Check that the authenticated account ` +
    `has permission on the property in Search Console.`
  );
}
