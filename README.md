# IMAGO Media Search Application

A Next.js + TypeScript search application for IMAGO-style media metadata.

Quick demo: https://imago-search-demo.onrender.com/

## Installation

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
npm install
```

### Run locally
```bash
npm run dev
```

Open http://localhost:3000.

### Run tests
```bash
npm test
```

## High-level Approach

1. **Standard decoupled client-server layout inside Next.js (App Router)**: Frontend UI, API layer, Search engine, and Dataset are independently testable and swappable, so a backend change (for example, moving to Elasticsearch) does not require UI modifications.

2. **Custom in-memory inverted index**: Handles 10,000 records with full API responses returning in under 10 ms on warm cache.

3. **Computationally intensive preprocessing runs once at server startup**: Normalization, tokenization, indexing, and restriction extraction happen at startup, keeping query-time logic minimal and fast.

4. **Frontend state managed entirely via URL query parameters**: Ensures shareable links, bookmarks, and native browser back/forward navigation work without complex state-sync code.

5. **Architecture explicitly sized for 10k-record scale with defined upgrade path**: Includes a migration strategy to Elasticsearch and a CQRS pattern for when the dataset exceeds RAM capacity.

## Assumptions

- Minimum useful keyword length is 3; queries shorter than 3 are not used for ranking.
- Credit String Uniformity: The `fotografen` field acts as a discrete categorical tag (e.g., IMAGO / Getty Images), making it appropriate for dropdown filtering.
- Date Completeness: Missing or malformed dates are gracefully excluded from strict range filters without crashing the parsing logic.
- Restriction Syntax: The `PUBLICATIONxINx...xONLY` pattern is assumed to be consistent enough to safely parse and purge from the display text without losing context.


## Search and Relevance

### Query handling
- API sanitizes q with sanitizeQuery.
- Keyword search is active only when q length is at least 3.
- q of length 1-2 is treated as no keyword search.

### UI behavior for short queries
- When user types 1-2 characters:
1. UI shows helper text with result count and guidance to type at least 3 characters.
2. URL/API q is not sent.
3. Highlighting is disabled.

Implementation references:
- [src/app/page.tsx](src/app/page.tsx)
- [src/components/HighlightText.tsx](src/components/HighlightText.tsx)
- [src/app/api/search/route.ts](src/app/api/search/route.ts)

### Tokenization and normalization
Implemented in [src/lib/search.ts](src/lib/search.ts):
1. lowercasing
2. Unicode normalization + diacritic removal
3. punctuation cleanup
4. German stop-word removal

### Indexed fields and weights
- suchtext: 1.0
- fotografen: 0.6
- bildnummer: 0.3

Match weights:
- exact: 2.0
- prefix: 1.0

Per-token contribution:
- score += matchWeight * fieldWeight

### Matching and ranking
1. Exact token matches from inverted index.
2. Prefix matches via token startsWith scan.
3. Score accumulated per item.
4. Special rule: if raw query equals bildnummer, score is overridden to 10.

Sort behavior:
1. Relevance sort by score desc.
2. Tie-breaker by newer timestamp first.
3. date_asc/date_desc overrides are supported.
4. If no q, default sorting is date_desc.

### Design Decisions & Search Relevance

- In-Memory Storage over Database: Data is loaded directly into Node.js RAM to guarantee zero external dependencies and instant startup for this evaluation environment.
- Tokenization & Normalization: Queries and index tokens are normalized (lowercased, accents stripped via .normalize('NFKD')) and filtered for German stop-words before lookups occur.
- Prefix vs. Fuzzy Matching: The engine relies on .startsWith() rather than Levenshtein distance to maintain strict <10 ms latency, trading typo-correction for raw retrieval speed.
- Two-Axis Relevance Scoring: The search engine evaluates relevance using a two-axis model that respects the data hierarchy: score += matchWeight * fieldWeight.
- Field Weights: Matches in suchtext (primary) have a 1.0 multiplier, fotografen (secondary) have a 0.6 multiplier, and bildnummer (optional text) have a 0.3 multiplier.
- Match Weights: Exact token matches provide a base score of 2.0, while prefix matches provide a 1.0 base score.
- The ID Short-Circuit: An exact equality match against a complete bildnummer implies an unambiguous user lookup; this triggers a flat +10 boost and ranks the item first, bypassing standard text evaluation.

1. Frontend
- Main page and state orchestration: [src/app/page.tsx](src/app/page.tsx)
- URL query parameters are the source of truth for q, filters, sort, page, and pageSize.
- Search input is debounced (300ms).

2. API layer
- Search API: [src/app/api/search/route.ts](src/app/api/search/route.ts)
- Facets API: [src/app/api/facets/route.ts](src/app/api/facets/route.ts)
- Analytics API: [src/app/api/analytics/route.ts](src/app/api/analytics/route.ts)

3. Search engine
- In-memory engine and scoring: [src/lib/search.ts](src/lib/search.ts)
- Types: [src/lib/types.ts](src/lib/types.ts)
- Seed data: [src/lib/data.json](src/lib/data.json)

4. UI components
- Search controls: [src/components/SearchControls.tsx](src/components/SearchControls.tsx)
- Filters: [src/components/FiltersSidebar.tsx](src/components/FiltersSidebar.tsx)
- Result cards: [src/components/MediaCard.tsx](src/components/MediaCard.tsx)
- Highlighting: [src/components/HighlightText.tsx](src/components/HighlightText.tsx)
- Pagination: [src/components/Pagination.tsx](src/components/Pagination.tsx)

## Search and Relevance

### Query handling
- API sanitizes q with sanitizeQuery.
- Keyword search is active only when q length is at least 3.
- q of length 1-2 is treated as no keyword search.

### UI behavior for short queries
- When user types 1-2 characters:
1. UI shows helper text with result count and guidance to type at least 3 characters.
2. URL/API q is not sent.
3. Highlighting is disabled.

Implementation references:
- [src/app/page.tsx](src/app/page.tsx)
- [src/components/HighlightText.tsx](src/components/HighlightText.tsx)
- [src/app/api/search/route.ts](src/app/api/search/route.ts)

### Tokenization and normalization
Implemented in [src/lib/search.ts](src/lib/search.ts):
1. lowercasing
2. Unicode normalization + diacritic removal
3. punctuation cleanup
4. German stop-word removal

### Indexed fields and weights
- suchtext: 1.0
- fotografen: 0.6
- bildnummer: 0.3

Match weights:
- exact: 2.0
- prefix: 1.0

Per-token contribution:
- score += matchWeight * fieldWeight

### Matching and ranking
1. Exact token matches from inverted index.
2. Prefix matches via token startsWith scan.
3. Score accumulated per item.
4. Special rule: if raw query equals bildnummer, score is overridden to 10.

Sort behavior:
1. Relevance sort by score desc.
2. Tie-breaker by newer timestamp first.
3. date_asc/date_desc overrides are supported.
4. If no q, default sorting is date_desc.

### Design Decisions & Search Relevance

- In-Memory Storage over Database: Data is loaded directly into Node.js RAM to guarantee zero external dependencies and instant startup for this evaluation environment.
- Tokenization & Normalization: Queries and index tokens are normalized (lowercased, accents stripped via .normalize('NFKD')) and filtered for German stop-words before lookups occur.
- Prefix vs. Fuzzy Matching: The engine relies on .startsWith() rather than Levenshtein distance to maintain strict <10 ms latency, trading typo-correction for raw retrieval speed.
- Two-Axis Relevance Scoring: The search engine evaluates relevance using a two-axis model that respects the data hierarchy: score += matchWeight * fieldWeight.
- Field Weights: Matches in suchtext (primary) have a 1.0 multiplier, fotografen (secondary) have a 0.6 multiplier, and bildnummer (optional text) have a 0.3 multiplier.
- Match Weights: Exact token matches provide a base score of 2.0, while prefix matches provide a 1.0 base score.
- The ID Short-Circuit: An exact equality match against a complete bildnummer implies an unambiguous user lookup; this triggers a flat +10 boost and ranks the item first, bypassing standard text evaluation.

## Filters, Sorting, Pagination

### Filters
- credit (fotografen)
- dateFrom/dateTo range
- restrictions extracted from suchtext

### Restrictions extraction
- Regex-based extraction for patterns like PUBLICATIONxINxGERxSUIxAUTxONLY.
- Parsed restrictions are stored as structured arrays per item.

### Pagination response
`GET /api/search` returns:
- items
- page
- pageSize
- total
- totalPages
- executionTimeMs

## Preprocessing Strategy

Executed at engine ingestion/startup in [src/lib/search.ts](src/lib/search.ts):
1. restriction extraction + cleanup
2. date parsing to UTC timestamp
3. text normalization/tokenization
4. inverted index build (token -> per-field posting sets)

For challenge-size scale testing, a 10,000 item generator exists in [scripts/generate-data.js](scripts/generate-data.js).

## New Items Every Minute (Scaling Plan)

Planned production approach:
1. Write new items to primary database.
2. Publish ingestion event to queue.
3. Worker applies the same preprocessing rules.
4. Worker upserts into search index.
5. API serves from search index without waiting for ingestion.

This keeps ingestion asynchronous and avoids UI blocking.

## Limitations & What I Would Do Next

### Limitations
- Single-Process Memory: The in-memory index is not shared across Node.js workers, meaning multi-instance deployments would currently suffer from duplicated memory overhead.
- No Fuzzy Matching: The current engine does not correct user typos.
- Missing Entity Extraction: Named entities (people, locations) are not currently extracted from the suchtext field.

### Next Steps
- Search Cluster Migration: Move the read layer to an Elasticsearch cluster to natively handle distributed inverted indexing, fuzzy matching, and BM25 (TF-IDF) relevance scoring so rare terms are not buried in long production descriptions.
- CQRS & Continuous Ingestion: Implement an event-driven architecture using a message queue (e.g., AWS SQS) and background workers to separate writes from reads, ensuring bulk upserts never block user queries.
- AI Enrichment: Introduce NLP/LLM models in the asynchronous ingestion pipeline to automatically extract entities and locations without impacting search latency.
- Hardened Security: Replace basic string-level validation with strict Zod schema validation and rate-limiting to prevent scraping and DoS attacks.

## Analytics

In-memory analytics in [src/lib/search.ts](src/lib/search.ts), exposed by [src/app/api/analytics/route.ts](src/app/api/analytics/route.ts):
1. total searches
2. average query time
3. top keywords

## Testing

Unit tests in [src/lib/search.test.ts](src/lib/search.test.ts) cover:
1. scoring and ranking
- ID short-circuit
- field weight precedence
- exact vs prefix

2. preprocessing and parsing
- restrictions extraction
- date parsing
- query sanitization
- accent-insensitive matching

3. filtering
- credit
- restrictions

4. analytics
- counts and timing aggregation

### scenarios

1. Field-weight scenario
- Query: apple
- Expected order:
1. suchtext exact
2. fotografen exact
3. suchtext prefix

2. Same-field exact vs prefix
- Query: jack
- Expected order:
1. suchtext exact jack
2. suchtext prefix jackson
3. suchtext prefix jackfruit
- If 2 and 3 tie on score, newer date ranks first.

3. ID short-circuit
- Query equals one bildnummer exactly.
- Expected: that item ranks first.
