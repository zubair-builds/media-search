export interface RawMediaItem {
  suchtext: string; // search text
  bildnummer: string; // image number
  fotografen: string; // photographers
  datum: string; // date
  hoehe: string; // height
  breite: string; // width
}

export interface MediaItem {
  id: string; // Map bildnummer to id
  suchtext: string;
  bildnummer: string;
  fotografen: string;
  datum: string;
  timestamp: number; // Parsed unix timestamp for fast sorting
  restrictions: string[]; // Extracted restrictions
  hoehe: string;
  breite: string;
}

export interface SearchQuery {
  q?: string;
  credit?: string[];
  dateFrom?: string; // ISO format or YYYY-MM-DD
  dateTo?: string;
  restrictions?: string[];
  sortBy?: 'date_asc' | 'date_desc' | 'relevance';
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  items: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AnalyticsData {
  totalSearches: number;
  avgQueryTimeMs: number;
  topKeywords: Record<string, number>;
}
