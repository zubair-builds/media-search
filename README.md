# IMAGO Archive Search

A high-performance media search application built with Next.js (App Router), TypeScript, and Tailwind CSS. It features an in-memory inverted index, prefix matching, relevance scoring, advanced faceted search, and built-in usage analytics.

---

## 🚀 Installation & Local Development

### Prerequisites
- **Node.js** v18.x or later
- **npm** or **yarn**

### 1. Setup and Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Run the Development Server
Launch the local server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the application.

### 3. Run Test Suite
To run tests via Jest for search logic, date parsing, tokenization, and analytics:
```bash
npm test
```

---

## 🛠️ Architecture Overview

The application follows a decoupled client-server architecture inside the Next.js framework:

- **Next.js Frontend (`src/app/page.tsx`)**: Responsive, interactive React interface built with Tailwind CSS. State synchronization is tied directly to the URL via query parameters.
- **In-Memory Search Layer (`src/lib/search.ts`)**: Initializes at application startup by loading static media data, parsing it into structured models, and compiling an inverted index for sub-millisecond retrieval times.
- **RESTful API (`src/app/api/search/route.ts`)**: An HTTP endpoint that accepts search criteria via query string parameters, processes query sanitization, executes the search against the engine, tracks execution metrics, and yields paginated responses.

---

## 🔍 Search Strategy & Relevance/Scoring

### 1. Tokenization & Normalization
- Text strings are converted to lowercase, have diacritics removed, and are filtered using a curated set of German stop words (e.g., `der`, `die`, `das`).
- Punctuation and noisy tokens are stripped.
- Search queries are only accepted as a valid keyword search when they are at least **3 characters** long, filtering out low-quality free-text terms.

### 2. Inverted Index Strategy
The core search functionality is driven by a single-pass in-memory inverted index `Map<string, Set<string>>` where:
- Each key is a preprocessed, normalized word token.
- Each value is a `Set` of unique image IDs (`bildnummer`) where the token occurs.

### 3. Scoring & Relevance Mechanics
When a user submits a search query:
1. The query text is tokenized.
2. For each token, the search engine searches the index for exact matches or prefix matches.
   - **Exact Match**: Gives **2 points** to the document score.
   - **Prefix Match**: Gives **1 point** for partial matches (where token length > 2).
3. If a token exactly matches the **`bildnummer`**, an additional boost of **10 points** is awarded.
4. Total document relevance scores are summed, and results are returned sorted in descending order of score.

---

## 🧩 Preprocessing Strategy

Preprocessing converts inconsistent text payloads into highly queryable fields:

- **Date Parsing (`datum`)**: String representations like `01.01.1900` are parsed, converted into millisecond timestamps, and mapped to UTC to avoid timezone drift or parsing bugs.
- **Restriction Extraction (`suchtext`)**: Restriction tags matching the regex `/([A-Z]+x)+ONLY/` (e.g. `PUBLICATIONxINxGERxSUIxAUTxONLY`) are extracted from `suchtext`.
  - The regions within the tags are parsed out (e.g., `GER`, `SUI`) for faceted multi-filtering.
  - The match string is stripped from `suchtext` to prevent noise during inverted index creation.

```
Build Time / Ingestion      ->      Client/Server Queries
[Raw Data] -> [Extraction] -> [Build Inverted Index] -> [Faceted Results]
```

---

## 📈 Scaling for Millions of Items & Continuous Ingestion

The current in-memory inverted index runs under 50ms for up to **10,000 items**. To scale up to millions of documents and ingest new content per minute without blocking user requests, the architecture can evolve in the following ways:

### 1. Move to a Scalable Index (Elasticsearch / OpenSearch)
- **Why**: Storing millions of documents in memory per Next.js server instance causes high memory overhead (OOM) and doesn't scale across serverless or multi-region environments.
- **What**: Move the search and indexing layer to a persistent search-optimized cluster (e.g., Elasticsearch, OpenSearch, or Meilisearch) supporting distributed inverted indexes, text relevance tuning (BM25), and sub-100ms queries at scale.

### 2. Continuous Ingestion Pipeline (Events & Workers)
- New items added minute-by-minute can be processed via an asynchronous pipeline:
  1. **Message Broker**: New files or updates emit an event to a queue (e.g., AWS SQS or Kafka).
  2. **Worker Function**: A background serverless function processes incoming items (normalizes text, extracts restrictions, converts dates).
  3. **Atomic Writes**: Background workers bulk-upsert transformed items into the search backend.
- Read operations are decoupled from write operations (CQRS pattern) to prevent search traffic from stalling when new content arrives.

### 3. Caching Layer
- Implementing an edge or caching tier (e.g., Redis, Cloudflare workers) saves frequent searches. The cache is automatically updated or cleared when new metadata is indexed.

---

## 📊 Analytics
We implement lightweight, in-memory search logging to capture user patterns:
- **`totalSearches`**: Tracks total search queries executed.
- **`totalQueryTimeMs`**: Measures total API execution time in milliseconds.
- **`keywordCounts`**: Uses a key-value hash map to evaluate top keywords to inform content indexing or popular tag trends.

---

## 📡 API Reference

### `GET /api/search`

Retrieves a paginated list of media search results matched against full-text queries and dynamic faceted filter options.

#### Query Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `q` | `string` | Search query keyword (min. 3 characters). |
| `credit` | `string` | Filter by one or more photographer names (comma-separated). |
| `dateFrom` | `string` | Start filter date (`DD.MM.YYYY` or `YYYY-MM-DD`). |
| `dateTo` | `string` | End filter date (`DD.MM.YYYY` or `YYYY-MM-DD`). |
| `restrictions` | `string` | Filter by one or more restriction codes (comma-separated). |
| `sortBy` | `string` | Either `date_asc`, `date_desc`, or `relevance`. Defaults to `relevance` if `q` is present. |
| `page` | `number` | The requested page number (defaults to `1`). |
| `pageSize` | `number` | Number of items per page (`10`, `20`, `50`, `100`, max `100`). Defaults to `10`. |

#### Example Query
```bash
GET /api/search?q=Michael+Jackson&credit=IMAGO+%2F+teutopress&sortBy=date_desc&pageSize=10
```

#### Example JSON Response
```json
{
  "items": [
    {
      "id": "0056821849",
      "suchtext": "Michael Jackson 11 95 her Mann Musik Gesang Pop USA Hemd leger Studio hoch ganz stehend Bühne...",
      "bildnummer": "0056821849",
      "fotografen": "IMAGO / teutopress",
      "datum": "01.11.1995",
      "hoehe": "948",
      "breite": "1440",
      "timestamp": 815184000000,
      "restrictions": []
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1,
  "totalPages": 1
}
```

---

## ⚙️ Design Decisions & Trade-offs

1. **In-Memory Storage over Database**: Opting for an in-memory inverted index allows our tests and development setup to start immediately without configuring relational or vector databases (e.g., PostgreSQL, Elasticsearch). The trade-off is higher RAM consumption as the corpus grows.
2. **Defensive Processing on the Server**: The Next.js API layer aggressively normalizes input search queries, restricting them to a max character count (200 characters) and removing non-printable control strings. This avoids injection and ensures consistent parsing.
3. **URL-first State Sync**: React application state is pushed directly into URL query parameters. This ensures that bookmarking, linking, and browser "back/forward" operations work out-of-the-box.
4. **Keyword Filtering Behavior**: Query strings shorter than 3 characters are evaluated as empty queries. This avoids overwhelming users with noisy results and allows active faceted filtering (such as photographer or restriction chips) to operate smoothly without interfering keywords.

---

## 🔮 Future Improvements / Roadmap
- **Text Highlighting**: Return snippets with matching words highlighted with `<mark>` tags to provide visual context directly to the search interface.
- **Advanced Stemming**: Introduce porter-stemming algorithms to equate singular and plural queries (`Jackson` vs `Jacksons`).
- **Fuzzy Search Capabilities**: Implement Levenshtein Distance or trigram indexing to tolerate common typos.
