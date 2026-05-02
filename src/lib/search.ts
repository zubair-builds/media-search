import { MediaItem, RawMediaItem } from './types';
import rawData from './data.json';

const GERMAN_STOP_WORDS = new Set([
  'der', 'die', 'das', 'und', 'in', 'im', 'zu', 'von', 'für', 'mit', 'ist', 'auf', 'aus', 'ein', 'eine', 'einer', 'eines', 'an', 'als', 'bei'
]);

function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function sanitizeQuery(input?: string): string | undefined {
  if (!input) return undefined;
  // Trim, collapse whitespace, remove control characters and potentially dangerous punctuation
  let s = input.trim().replace(/[\s\u0000-\u001f\u007f]+/g, ' ');
  // Remove angle brackets and backticks to avoid trivial injection-like content
  s = s.replace(/[<>`\\]/g, '');
  // Limit length to reasonable size
  if (s.length > 200) s = s.slice(0, 200);
  return s || undefined;
}

export function parseFlexibleDate(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  // Accept DD.MM.YYYY or DD.MM.YY
  if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(trimmed)) {
    const parts = trimmed.split('.');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year = year > 30 ? 1900 + year : 2000 + year;
    const date = new Date(Date.UTC(year, month, day));
    if (Number.isNaN(date.getTime())) return undefined;
    if (date.getUTCDate() !== day || date.getUTCMonth() !== month || date.getUTCFullYear() !== year) {
      return undefined;
    }
    return date.getTime();
  }

  // Try ISO / RFC parse
  const ts = Date.parse(trimmed);
  if (!Number.isNaN(ts)) return ts;
  return undefined;
}

// Analytics State
export const analyticsState = {
  totalSearches: 0,
  totalQueryTimeMs: 0,
  keywordCounts: new Map<string, number>(),
};

export function recordAnalytics(query: string | undefined, timeMs: number) {
  analyticsState.totalSearches++;
  analyticsState.totalQueryTimeMs += timeMs;

  if (query) {
    const term = normalizeText(query);
    if (term) {
      analyticsState.keywordCounts.set(term, (analyticsState.keywordCounts.get(term) || 0) + 1);
    }
  }
}

class SearchEngine {
  private items: MediaItem[] = [];
  private invertedIndex: Map<string, Set<string>> = new Map();
  // Filter lookups
  private credits: Set<string> = new Set();
  private allRestrictions: Set<string> = new Set();

  constructor(data: RawMediaItem[]) {
    this.ingest(data);
  }

  private parseDate(datum: string): number {
    // Expects DD.MM.YYYY
    const parts = datum.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      // Handle two-digit years safely
      const fullYear = year < 100 ? (year > 30 ? 1900 + year : 2000 + year) : year;
      // Use UTC to avoid timezone-shift bugs
      return new Date(Date.UTC(fullYear, month, day)).getTime();
    }
    return 0;
  }

  private extractRestrictions(text: string): { cleanText: string, restrictions: string[] } {
    const restrictionRegex = /([A-Z]+x)+ONLY/g;
    const matches = text.match(restrictionRegex);
    let cleanText = text;
    let restrictions: string[] = [];

    if (matches) {
      matches.forEach(match => {
        cleanText = cleanText.replace(match, '');
        // Split by 'x' and filter out 'IN' and 'ONLY' to get actual regions
        const parts = match.split('x').filter(p => p !== 'IN' && p !== 'ONLY' && p !== 'PUBLICATION');
        restrictions.push(...parts);
      });
    }

    return { cleanText: cleanText.trim().replace(/\s+/g, ' '), restrictions };
  }

  private tokenize(text: string): string[] {
    // Normalize Unicode and remove punctuation so accented and ASCII queries align.
    const cleanStr = normalizeText(text).replace(/[.,!?;:()]/g, ' ');
    return cleanStr
      .split(/\s+/)
      .filter(token => token.length > 1 && !GERMAN_STOP_WORDS.has(token));
  }

  private ingest(data: RawMediaItem[]) {
    this.items = data.map(raw => {
      const { cleanText, restrictions } = this.extractRestrictions(raw.suchtext);
      
      const item: MediaItem = {
        id: raw.bildnummer,
        ...raw,
        suchtext: cleanText, // Stripped suchtext
        timestamp: this.parseDate(raw.datum),
        restrictions
      };

      // Populate filter metadata
      this.credits.add(item.fotografen);
      restrictions.forEach(r => this.allRestrictions.add(r));

      // Build Inverted Index
      const tokens = this.tokenize(item.suchtext);
      const creditTokens = this.tokenize(item.fotografen);
      
      const uniqueTokens = new Set([...tokens, ...creditTokens, item.bildnummer.toLowerCase()]);
      
      uniqueTokens.forEach(token => {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token)!.add(item.id);
      });

      return item;
    });
  }

  // Exact API shape implementation
  public search(query: {
    q?: string,
    credit?: string[],
    dateFrom?: string,
    dateTo?: string,
    restrictions?: string[],
    sortBy?: 'date_asc' | 'date_desc' | 'relevance',
    page?: number,
    pageSize?: number
  }) {
    let resultItems = this.items;
    const normalizedQuery = sanitizeQuery(query.q);
    const hasSearchQuery = !!normalizedQuery && normalizedQuery.length >= 3;

    // Hard Filters
    if (query.credit && query.credit.length > 0) {
      resultItems = resultItems.filter(item => query.credit!.includes(item.fotografen));
    }

    if (query.restrictions && query.restrictions.length > 0) {
      resultItems = resultItems.filter(item => 
        query.restrictions!.some(r => item.restrictions.includes(r))
      );
    }

    if (query.dateFrom) {
      const fromTime = parseFlexibleDate(query.dateFrom);
      if (fromTime !== undefined) resultItems = resultItems.filter(item => item.timestamp >= fromTime);
    }

    if (query.dateTo) {
      const toTime = parseFlexibleDate(query.dateTo);
      if (toTime !== undefined) resultItems = resultItems.filter(item => item.timestamp <= toTime);
    }

    // Keyword Search (Relevance / Filtering)
    if (hasSearchQuery) {
      const searchTokens = this.tokenize(normalizedQuery!);
      
      if (searchTokens.length > 0) {
        // Find matching item IDs
        const matchedItemIds = new Map<string, number>(); // id -> score

        searchTokens.forEach(token => {
          // Exact match
          if (this.invertedIndex.has(token)) {
            this.invertedIndex.get(token)!.forEach(id => {
              matchedItemIds.set(id, (matchedItemIds.get(id) || 0) + 2); // Exact match score
            });
          } else if (token.length > 2) {
            // Prefix matching (slower, but necessary for partial words)
            for (const [indexToken, ids] of this.invertedIndex.entries()) {
              if (indexToken.startsWith(token)) {
                ids.forEach(id => {
                  matchedItemIds.set(id, (matchedItemIds.get(id) || 0) + 1); // Prefix match score
                });
              }
            }
          }
        });

        // Filter and add relevance scores
        resultItems = resultItems
          .filter(item => matchedItemIds.has(item.id))
          .map(item => {
             let score = matchedItemIds.get(item.id) || 0;
             // Boost score if bildnummer exact match
             if (normalizedQuery === item.bildnummer) score += 10;
             return { item, score };
          })
          .sort((a, b) => b.score - a.score) // Sort by relevance descending
          .map(x => x.item);
      } else {
        resultItems = [];
      }
    }

    // Sorting
    const activeSortBy = query.sortBy || (query.q ? 'relevance' : 'date_desc');
    
    if (activeSortBy === 'date_desc') {
      resultItems.sort((a, b) => b.timestamp - a.timestamp);
    } else if (activeSortBy === 'date_asc') {
      resultItems.sort((a, b) => a.timestamp - b.timestamp);
    }
    // Note: 'relevance' is already sorted if q is present, otherwise fallback to index order (or we can just leave it)

    // Pagination
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, (query.pageSize && query.pageSize > 0) ? query.pageSize : 20);
    const total = resultItems.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginatedItems = resultItems.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginatedItems,
      page,
      pageSize,
      total,
      totalPages
    };
  }

  public getFacets() {
    return {
      credits: Array.from(this.credits),
      restrictions: Array.from(this.allRestrictions)
    };
  }
}

// Singleton instance to persist across API requests in dev mode
export const searchEngine = new SearchEngine(rawData as RawMediaItem[]);
