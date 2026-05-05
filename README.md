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

3. **One-time preprocessing at startup**: Normalization, tokenization, indexing, and restriction extraction happen at startup, keeping query-time logic minimal and fast. Steps executed in [src/lib/search.ts](src/lib/search.ts):
   1. Restriction extraction + cleanup from `suchtext`
   2. Date parsing to UTC timestamp
   3. Text normalization and tokenization (lowercasing → Unicode/diacritic removal → punctuation cleanup → German stop-word removal)
   4. Inverted index build (token → per-field posting sets)

4. **Frontend state managed entirely via URL query parameters**: Ensures shareable links, bookmarks, and native browser back/forward navigation work without complex state-sync code. Search input is debounced (300 ms).

5. **Architecture explicitly sized for 10k-record scale with defined upgrade path**: Includes a migration strategy to Elasticsearch and a CQRS pattern for when the dataset exceeds RAM capacity. For scale testing, a 10,000-item generator exists in [scripts/generate-data.js](scripts/generate-data.js).

## Assumptions

- **Minimum query length**: Keyword search is only active when `q` is at least 3 characters; 1–2 character queries are treated as no keyword and return all results with filters applied. The UI shows helper text guiding users to type at least 3 characters, suppresses URL/API `q`, and disables highlighting.
- **Credit string uniformity**: The `fotografen` field acts as a discrete categorical tag (e.g., `IMAGO / Getty Images`), making it appropriate for dropdown filtering.
- **Date completeness**: Missing or malformed dates are gracefully excluded from strict range filters without crashing the parsing logic.
- **Restriction syntax**: The `PUBLICATIONxINx...xONLY` pattern is assumed consistent enough to safely parse via regex and purge from display text without losing context. Parsed restrictions are stored as structured arrays per item and exposed as a filterable facet.
- **Frontend — highlighting**: Matching tokens are highlighted client-side; suppressed below the 3-character minimum.
- **Frontend — UI states**: UI handles loading, empty, and error states with keyboard-accessible controls.

## Design Decisions & Search Relevance

### Scoring model

The engine uses a two-axis relevance model: `score += matchWeight × fieldWeight`.

**Field weights** (data hierarchy):
| Field | Weight |
|---|---|
| `suchtext` | 1.0 |
| `fotografen` | 0.6 |
| `bildnummer` | 0.3 |

**Match weights** (match quality):
| Match type | Weight |
|---|---|
| Exact token | 2.0 |
| Prefix (`startsWith`) | 1.0 |

**ID short-circuit**: An exact equality match against a full `bildnummer` implies an unambiguous lookup — score is overridden to +10, ranking that item first and bypassing standard text evaluation.

**Sort behavior**:
1. Relevance score descending.
2. Tie-breaker: newer timestamp first.
3. `date_asc` / `date_desc` overrides are supported.
4. When no `q` is present, default sort is `date_desc`.

### Key decisions

- **In-memory storage over a database**: Data is loaded directly into Node.js RAM to guarantee zero external dependencies and instant startup for this evaluation environment.
- **Prefix over fuzzy matching**: The engine uses `.startsWith()` rather than Levenshtein distance to maintain strict <10 ms latency, trading typo-correction for raw retrieval speed.
- **Query sanitization**: `sanitizeQuery` strips unsafe characters before any index lookup occurs.
- **Filters**: `credit` (fotografen), `dateFrom`/`dateTo` range, and parsed `restrictions` are supported. `GET /api/search` returns `items`, `page`, `pageSize`, `total`, `totalPages`, and `executionTimeMs`.
- **In-memory analytics**: Tracked in [src/lib/search.ts](src/lib/search.ts) and exposed via [src/app/api/analytics/route.ts](src/app/api/analytics/route.ts) — total searches, average query time, top keywords.
- **Scaling plan**: New items would be written to a primary database → ingestion event published to a queue → worker applies preprocessing → worker upserts into search index → API serves from index without blocking on ingestion.

### Test coverage

Unit tests in [src/lib/search.test.ts](src/lib/search.test.ts) cover scoring/ranking (ID short-circuit, field-weight precedence, exact vs. prefix), preprocessing (restriction extraction, date parsing, query sanitization, accent-insensitive matching), filtering (credit, restrictions), and analytics (counts and timing aggregation).

Key scenarios:
- **Field-weight ordering** — query `apple`: suchtext exact → fotografen exact → suchtext prefix.
- **Exact vs. prefix tie-breaking** — query `jack`: exact `jack` → prefix `jackson` → prefix `jackfruit`; ties broken by newer date first.
- **ID short-circuit** — query equals a full `bildnummer`: that item ranks first regardless of other scores.

## Limitations & What I Would Do Next

### Limitations

- **Single-process memory**: The in-memory index is not shared across Node.js workers, so multi-instance deployments duplicate memory overhead.
- **No fuzzy matching**: The engine does not correct user typos.
- **Missing entity extraction**: Named entities (people, locations) are not currently extracted from `suchtext`.

### Next steps

- **Search cluster migration**: Move the read layer to Elasticsearch for distributed inverted indexing, native fuzzy matching, and BM25/TF-IDF relevance so rare terms are not buried in long descriptions.
- **CQRS & continuous ingestion**: Event-driven architecture with a message queue (e.g., AWS SQS) and background workers to separate writes from reads — bulk upserts never block user queries.
- **AI enrichment**: NLP/LLM models in the async ingestion pipeline to automatically extract entities and locations without impacting search latency.
- **Hardened security**: Replace basic string validation with strict Zod schema validation and rate-limiting to prevent scraping and DoS attacks.

