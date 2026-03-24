"use strict";
/**
 * Hallucination guardrails for GSC MCP server.
 *
 * These ensure Claude sticks to the data returned by the GSC API
 * and does not speculate about causes, invent numbers, or fill gaps
 * with assumptions from its training data.
 *
 * Inspired by feedback from Krinal Mehta (https://www.linkedin.com/in/krinal/)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUARDRAIL_SUFFIX = void 0;
exports.withMeta = withMeta;
exports.GUARDRAIL_SUFFIX = " IMPORTANT: Base your analysis ONLY on the data returned. Report exact numbers from the results. Do not speculate about causes (e.g. algorithm updates, competitor actions) unless the data explicitly supports it. If the data does not contain enough information to answer a question, say so clearly rather than guessing.";
/**
 * Wraps tool results with a _meta provenance field so Claude
 * knows the data source and is anchored to the actual numbers.
 */
function withMeta(data, toolName, params) {
    return {
        _meta: {
            source: "Google Search Console API (live data)",
            tool: toolName,
            parameters: params,
            note: "All numbers in this response come directly from the Google Search Console API. They are exact values, not estimates. Base your analysis only on this data. Do not invent or assume additional context.",
        },
        data,
    };
}
