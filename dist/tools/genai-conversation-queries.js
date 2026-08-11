"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyQuery = classifyQuery;
exports.genaiConversationQueries = genaiConversationQueries;
const analytics_js_1 = require("../analytics.js");
/**
 * genai_conversation_queries — surfaces AI-conversation exhaust hiding in the
 * regular Search Analytics query dimension.
 *
 * Mechanism: Google counts every AI Mode follow-up as a brand-new query, and
 * AI Mode / AI Overview activity is folded into the web search type (Google's
 * click-and-impression counting docs; confirmed by John Mueller on LinkedIn,
 * Aug 2026, after Anastasia Kourou surfaced "yes" / "yes go on" rows). The
 * result: conversation fragments, full agent prompts, and AI-visibility
 * tracker probes all land in the query table with impressions, positions and
 * clicks. The dedicated Generative AI report has no query dimension, so this
 * is the only query-level AI evidence Google exposes anywhere.
 *
 * Buckets:
 *  - artefact:       bare affirmations/continuations ("yes", "go on") — a
 *                    person replying to the AI, logged as a query
 *  - pivot:          "what about X" mid-conversation comparisons
 *  - conversational: human questions with conversational markers, deictic
 *                    openers ("is it…", "can you…"), or 10+ word questions
 *  - tracker_probe:  synthetic prompts from AI-visibility tools (the
 *                    ". my location is X." suffix and "evaluate BRAND on
 *                    FACET" signatures)
 *  - agent_harness:  full agent instructions logged verbatim as queries
 *  - pasted_string:  error messages and CSV headers pasted (or piped) in
 *  - long_uncategorised: 10+ words with no other marker
 */
// Pattern sources are shared between the API-side prefilter (RE2) and the
// local classifier (JS RegExp). Both engines accept this subset.
const ARTEFACT_SRC = "^(yes|yeah|yep|ok|okay|okey|sure|no|nope|go on|continue|keep going|tell me more|more|next|why not|how so|really|exactly|show me|and then|thanks|thank you|got it|what else|anything else)[?!.,]*$";
const PIVOT_SRC = "^(what|how) about .{1,40}$";
const TRACKER_SRC = "(\\. ?my location is )|(^evaluate the .+ on )";
const AGENT_SRC = "^(search the web for|browse the web)|do not invent|return the [0-9]+ most relevant|include source urls";
const CONV_SRC = "\\b(please|can you|could you|give me|show me|tell me|i want|i need|i have|i am|should i|do i need|is it worth|how do i|how can i|help me|walk me through)\\b";
const DEICTIC_SRC = "^(what|how|why|is|does|can|will|would) (it|that|this|they)\\b";
const TEN_PLUS_WORDS_SRC = "^([^ ]+ ){9,}[^ ]+$";
const PASTED_SRC = "([^,]*,){5}|has been captured for this url prefix";
const QSTART = /^(what|how|why|when|where|which|who|can|does|do|is|are|should|will|would)\b/;
const RE = {
    artefact: new RegExp(ARTEFACT_SRC),
    pivot: new RegExp(PIVOT_SRC),
    tracker: new RegExp(TRACKER_SRC),
    agent: new RegExp(AGENT_SRC),
    conv: new RegExp(CONV_SRC),
    deictic: new RegExp(DEICTIC_SRC),
    pasted: new RegExp(PASTED_SRC),
};
function classifyQuery(query) {
    const q = query.toLowerCase().trim();
    const words = q.split(/ +/).length;
    if (RE.artefact.test(q))
        return "artefact";
    if (RE.pivot.test(q))
        return "pivot";
    if (RE.agent.test(q))
        return "agent_harness";
    if (RE.tracker.test(q))
        return "tracker_probe";
    if (RE.pasted.test(q))
        return "pasted_string";
    if (RE.conv.test(q) || RE.deictic.test(q))
        return "conversational";
    if (words >= 10 && QSTART.test(q))
        return "conversational";
    if (words >= 10)
        return "long_uncategorised";
    return null; // an ordinary search that happened to match the prefilter
}
const BUCKET_ORDER = [
    "artefact",
    "pivot",
    "conversational",
    "tracker_probe",
    "agent_harness",
    "pasted_string",
    "long_uncategorised",
];
const BUCKET_MEANING = {
    artefact: "A person mid-conversation with Google's AI replied ('yes', 'go on') and the reply was logged as a query your page appeared for. Positions here are AI-block positions, not open-web rankings.",
    pivot: "Mid-conversation comparison questions ('what about resend'). Each one names the alternative users ask the AI about next; a ready-made comparison-section instruction for the landing page.",
    conversational: "Human questions shaped by AI conversation. High impressions with near-zero clicks here means your page is being read inside answers rather than clicked from results.",
    tracker_probe: "Synthetic daily prompts from AI-visibility tracking tools flowing through Google's grounding layer. Not human demand: exclude from opportunity analyses. If you run an AI tracker, this is its probes independently logged by Google; if you don't, third parties are sweeping topics you rank in.",
    agent_harness: "Complete agent instructions ('search the web for… do not invent results') logged as queries. Machine traffic; interesting for what agents surface you for, worthless as keyword demand.",
    pasted_string: "Error messages and CSV headers entered as searches, by people or pipelines.",
    long_uncategorised: "Ten or more words without another marker. A mix of quoted-sentence searches, agent fragments and rare long-tail; review manually before acting.",
};
const CANNOT_SEE = [
    "Anonymised (rare) queries are excluded by Google, so every number is a floor, not a total.",
    "AI Overviews and AI Mode cannot be told apart at query level; both fold into the web search type.",
    "Classification reads query shape, not certainty. A phrase like 'is it agent ready' can also be typed deliberately; treat single rows as evidence, not statistics.",
    "The operator behind tracker probes and agent harnesses is not identifiable from Search Console data alone.",
    "Impressions in probe and harness buckets are machine-generated views, not people.",
];
async function genaiConversationQueries(days = 480, minImpressions = 1, maxRowsPerBucket = 50, includeTimeline = true, siteUrl) {
    const { startDate, endDate } = (0, analytics_js_1.getDateRange)(days);
    const prefilter = [
        ARTEFACT_SRC,
        PIVOT_SRC,
        TRACKER_SRC,
        AGENT_SRC,
        CONV_SRC,
        DEICTIC_SRC,
        TEN_PLUS_WORDS_SRC,
        PASTED_SRC,
    ].join("|");
    // One paginated pull, query x page, so landing URLs come back without
    // BigQuery. fetchAllRows pages through the API's 25k row windows.
    const rows = await (0, analytics_js_1.fetchAllRows)({
        startDate,
        endDate,
        dimensions: ["query", "page"],
        dimensionFilterGroups: [
            {
                filters: [
                    { dimension: "query", operator: "includingRegex", expression: prefilter },
                ],
            },
        ],
        type: "web",
    }, siteUrl);
    // Aggregate per query (rows arrive per query x page).
    const byQuery = new Map();
    for (const r of rows) {
        const [query, page] = r.keys;
        let agg = byQuery.get(query);
        if (!agg) {
            agg = { impressions: 0, clicks: 0, posWeight: 0, pages: new Map() };
            byQuery.set(query, agg);
        }
        agg.impressions += r.impressions;
        agg.clicks += r.clicks;
        agg.posWeight += r.position * r.impressions;
        agg.pages.set(page, (agg.pages.get(page) || 0) + r.impressions);
    }
    const buckets = {
        artefact: [],
        pivot: [],
        conversational: [],
        tracker_probe: [],
        agent_harness: [],
        pasted_string: [],
        long_uncategorised: [],
    };
    let excludedOrdinary = 0;
    for (const [query, agg] of byQuery) {
        const bucket = classifyQuery(query);
        if (!bucket) {
            excludedOrdinary++;
            continue;
        }
        if (agg.impressions < minImpressions)
            continue;
        const topPages = [...agg.pages.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([page, impressions]) => ({ page, impressions }));
        buckets[bucket].push({
            query,
            impressions: agg.impressions,
            clicks: agg.clicks,
            ctr: agg.impressions ? Math.round((agg.clicks / agg.impressions) * 10000) / 100 : 0,
            position: agg.impressions ? Math.round((agg.posWeight / agg.impressions) * 10) / 10 : 0,
            top_pages: topPages,
        });
    }
    const summary = {};
    for (const b of BUCKET_ORDER) {
        buckets[b].sort((x, y) => y.impressions - x.impressions || x.query.localeCompare(y.query));
        summary[b] = {
            queries: buckets[b].length,
            impressions: buckets[b].reduce((s, r) => s + r.impressions, 0),
            clicks: buckets[b].reduce((s, r) => s + r.clicks, 0),
        };
    }
    // Temporal fingerprint: bare affirmation artefacts by month. On tested
    // properties this class is absent before AI Mode scaled and persistent
    // after, which dates the behaviour change cleanly.
    let timeline;
    if (includeTimeline) {
        const dateRows = await (0, analytics_js_1.fetchAllRows)({
            startDate,
            endDate,
            dimensions: ["date"],
            dimensionFilterGroups: [
                {
                    filters: [
                        { dimension: "query", operator: "includingRegex", expression: ARTEFACT_SRC },
                    ],
                },
            ],
            type: "web",
        }, siteUrl);
        const monthly = new Map();
        for (const r of dateRows) {
            const month = r.keys[0].slice(0, 7);
            const m = monthly.get(month) || { impressions: 0, clicks: 0 };
            m.impressions += r.impressions;
            m.clicks += r.clicks;
            monthly.set(month, m);
        }
        timeline = [...monthly.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, m]) => ({ month, ...m }));
    }
    return {
        period: { startDate, endDate },
        summary,
        total_conversation_queries: Object.values(summary).reduce((s, b) => s + b.queries, 0),
        total_conversation_impressions: Object.values(summary).reduce((s, b) => s + b.impressions, 0),
        excluded_ordinary_matches: excludedOrdinary,
        buckets: Object.fromEntries(BUCKET_ORDER.map((b) => [
            b,
            {
                meaning: BUCKET_MEANING[b],
                total_matched: buckets[b].length,
                rows: buckets[b].slice(0, maxRowsPerBucket),
            },
        ])),
        artefact_timeline_monthly: timeline,
        what_this_cannot_see: CANNOT_SEE,
    };
}
