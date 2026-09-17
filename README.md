# Media Search Lab

Next.js + TypeScript exploration of editorial image search: in-memory inverted index, URL-driven UI, facets, scoring, and tests.

Suggested repo name: `media-search`.

This is a learning project. I wanted to understand how a metadata search works end-to-end — tokenize captions, build a posting list, score fields, filter credits/dates/rights, and keep the query string as the source of truth.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| Search | Custom in-memory inverted index (`src/lib/search.ts`) |
| UI state | URL query params + 300 ms debounce |
| Tests | Jest (`npm test`) |

## Setup

```bash
git clone https://github.com/zubair-builds/imago-search.git
cd imago-search
npm install
npm run dev
```

http://localhost:3000 — `npm test` for the engine.

Optional 10k fixture: `npm run generate:data`.

## What I was exploring

1. Split UI, API, engine, and dataset so the index can later move to Elasticsearch without rewriting cards.
2. One-time preprocess at startup: strip rights tokens from `suchtext`, parse dates, normalize/tokenize (lowercase, diacritics, German stop words), build token → field postings.
3. Score = match weight × field weight (`suchtext` 1.0, photographer 0.6, image id 0.3). Exact token beats prefix. Exact image-id match short-circuits to the top.
4. Filters: credit, date range, parsed publication restrictions. Analytics: query count, average latency, top keywords.
5. `q` only applies at 3+ characters so 1–2 letter noise does not hit the index.

## Honest limits

- Index lives in one Node process; not shared across workers
- No fuzzy / typo tolerance (prefix only, to stay under ~10 ms on 10k rows)
- No NER on captions
- Sample credits and captions are synthetic

## Author

[Syed Zubair Haider](https://github.com/zubair-builds) · [LinkedIn](https://www.linkedin.com/in/syed-zubair-haider/)
