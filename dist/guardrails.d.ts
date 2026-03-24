/**
 * Hallucination guardrails for GSC MCP server.
 *
 * These ensure Claude sticks to the data returned by the GSC API
 * and does not speculate about causes, invent numbers, or fill gaps
 * with assumptions from its training data.
 *
 * Inspired by feedback from Krinal Mehta (https://www.linkedin.com/in/krinal/)
 */
export declare const GUARDRAIL_SUFFIX = " IMPORTANT: Base your analysis ONLY on the data returned. Report exact numbers from the results. Do not speculate about causes (e.g. algorithm updates, competitor actions) unless the data explicitly supports it. If the data does not contain enough information to answer a question, say so clearly rather than guessing.";
/**
 * Wraps tool results with a _meta provenance field so Claude
 * knows the data source and is anchored to the actual numbers.
 */
export declare function withMeta(data: unknown, toolName: string, params: Record<string, unknown>): {
    _meta: {
        source: string;
        tool: string;
        parameters: Record<string, unknown>;
        note: string;
    };
    data: unknown;
};
