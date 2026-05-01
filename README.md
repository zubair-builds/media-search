# IMAGO Archive Search

A high-performance media search application built with Next.js, TypeScript, and Tailwind CSS. It features an in-memory inverted index, prefix matching, relevance scoring, and advanced faceted search for fast and responsive data discovery.

## Key Features

- **In-Memory Search Engine**: Fast inverted index that parses and tokenizes queries, ignores common stop words, and supports prefix matching for partial searches.
- **Dynamic Facets**: Automatically extracts and strips restriction tags (e.g., region codes) and photographer metadata from the source data for filtering.
- **Modern Responsive UI**: Built with Tailwind CSS, featuring a unified sticky search bar, persistent card heights, and a smooth user interface.
- **Interactive Filtering**: Real-time filtering by photographer, date ranges, and access restrictions.
- **Advanced Pagination**: Customizable page size dropdown (10, 20, 50, 100) and page number controls with URL synchronization.
- **Search Analytics**: Tracks real-time keyword frequencies, search attempts, and query execution times.

---

## Installation & Local Development

Follow these steps to set up the project locally:

### 1. Prerequisites
- **Node.js** (v18.x or later)
- **npm** or **yarn**

### 2. Clone and Install Dependencies
Install the required packages:
```bash
npm install
```

### 3. Run the Development Server
Launch the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 4. Running the Tests
A comprehensive test suite using Jest validates the core search, tokenization, date parsing, and analytics tracking logic:
```bash
npm test
```

---

## Technical Overview

### 1. Preprocessing & Indexing
Upon startup, the search engine ingests the source data:
- Dates (`datum`) are converted into UTC timestamps for instantaneous filtering.
- Regional restriction codes (e.g., `PUBLICATIONxINxGERxSUIxAUTxONLY`) are extracted for faceted filtering and removed from keywords to prevent false-positive text matches.

### 2. URL State Synchronization
All active search queries, filters, and pagination options are synchronized directly with the URL query parameters. This allows for direct linking, page refreshing, and using browser navigation buttons without losing state.
