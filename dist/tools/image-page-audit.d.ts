interface ImageFinding {
    src: string;
    alt: string | null;
    alt_status: "missing" | "empty" | "generic" | "filename_as_alt" | "duplicate" | "ok";
    filename_status: "generic_or_nondescriptive" | "hash_or_id" | "ok";
    has_width_height_attrs: boolean;
    loading: string | null;
    fetchpriority: string | null;
    has_srcset: boolean;
    fetched: boolean;
    format: string | null;
    bytes: number | null;
    intrinsic_width: number | null;
    intrinsic_height: number | null;
    below_indexing_minimum: boolean | null;
    weight_status: "ok" | "heavy" | "oversized" | null;
    png_likely_photo: boolean | null;
    metadata: {
        camera_exif_present: boolean;
        gps_present: boolean;
        iptc_creator: boolean;
        iptc_copyright: boolean;
        iptc_caption: boolean;
        digital_source_type: string | null;
    } | null;
    issues: string[];
}
interface PageAudit {
    url: string;
    status: "ok" | "fetch_failed";
    http_status: number | null;
    error?: string;
    page_checks?: {
        total_img_tags: number;
        content_images: number;
        images_fetched: number;
        lcp_candidate_src: string | null;
        lcp_candidate_lazy_loaded: boolean | null;
        lcp_candidate_fetchpriority: string | null;
        inline_background_images: number;
        max_image_preview: string | "not_set";
        image_object_schema_count: number;
        has_licensable_fields: boolean;
        has_primary_image_of_page: boolean;
        images_with_srcset: number;
        modern_format_sources: boolean;
    };
    images?: ImageFinding[];
    images_not_reported?: number;
    issue_counts?: Record<string, number>;
    top_fixes?: string[];
}
export declare function imagePageAudit(urls: string[], fetchMetadata?: boolean, maxImagesPerPage?: number, maxImagesReported?: number): Promise<{
    audits: PageAudit[];
    overall: Record<string, unknown>;
}>;
export {};
