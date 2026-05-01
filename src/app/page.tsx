'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchResult, MediaItem } from '@/lib/types';

interface Facets {
  credits: string[];
  restrictions: string[];
}

interface AnalyticsData {
  totalSearches: number;
  avgQueryTimeMs: number;
  topKeywords: Record<string, number>;
}

function SearchApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Color mapping for restriction badges
  const restrictionColorMap: Record<string, { bg: string; text: string }> = {
    'JPN': { bg: 'bg-red-100', text: 'text-red-700' },
    'UK': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'USA': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    'GER': { bg: 'bg-amber-100', text: 'text-amber-700' },
  };

  // State initialization from URL
  const [q, setQ] = useState(searchParams.get('q') || '');
  const debouncedQ = useDebounce(q, 300);

  const [credit, setCredit] = useState<string>(searchParams.get('credit') || '');
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState<string>(searchParams.get('dateTo') || '');
  
  // Restrictions handle multiple values (comma separated in URL)
  const [restrictions, setRestrictions] = useState<string[]>(
    searchParams.get('restrictions') ? searchParams.get('restrictions')!.split(',') : []
  );
  
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sortBy') || '');
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize, setPageSize] = useState<number>(parseInt(searchParams.get('pageSize') || '10', 10));

  // Data fetching states
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets>({ credits: [], restrictions: [] });
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const analyticsCloseButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch facets on mount
  useEffect(() => {
    fetch('/api/facets')
      .then(res => res.json())
      .then(data => setFacets(data))
      .catch(err => console.error('Failed to load facets', err));
  }, []);

  useEffect(() => {
    if (!analyticsOpen) {
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    fetch('/api/analytics')
      .then(res => {
        if (!res.ok) {
          throw new Error('Analytics fetch failed');
        }

        return res.json();
      })
      .then(data => setAnalyticsData(data))
      .catch(err => {
        console.error(err);
        setAnalyticsError('Failed to load analytics data.');
      })
      .finally(() => {
        setAnalyticsLoading(false);
      });
  }, [analyticsOpen]);

  useEffect(() => {
    if (!analyticsOpen) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnalyticsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [analyticsOpen]);

  useEffect(() => {
    if (analyticsOpen) {
      analyticsCloseButtonRef.current?.focus();
    }
  }, [analyticsOpen]);

  // Handle Cmd+K keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update URL and fetch data whenever filters change
  useEffect(() => {
    // Input Guard: If search term is 1 or 2 characters, do nothing
    if (debouncedQ.trim().length > 0 && debouncedQ.trim().length < 3) {
      return;
    }

    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    if (credit) params.set('credit', credit);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (restrictions.length > 0) params.set('restrictions', restrictions.join(','));
    if (sortBy) params.set('sortBy', sortBy);
    if (page > 1) params.set('page', page.toString());
    if (pageSize !== 10) params.set('pageSize', pageSize.toString());

    // Update URL without reloading the page
    router.push(`/?${params.toString()}`);

    // Fetch Search Results
    setLoading(true);
    fetch(`/api/search?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Search failed');
        return res.json();
      })
      .then(data => {
        setResult(data);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch results. Please try again.');
        setResult(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedQ, credit, dateFrom, dateTo, restrictions, sortBy, page, pageSize, router]);

  // Handle restriction toggle
  const toggleRestriction = (val: string) => {
    setRestrictions(prev => 
      prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val]
    );
    setPage(1); // Reset page on filter change
  };

  // Reset page to 1 ONLY when debounced search query changes
  const prevDebouncedQ = React.useRef(debouncedQ);
  useEffect(() => {
    if (prevDebouncedQ.current !== debouncedQ) {
      setPage(1);
      prevDebouncedQ.current = debouncedQ;
    }
  }, [debouncedQ]);

  // Keyword in Context (KWIC) Highlighter
  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);
    
    const matchIndex = parts.findIndex(p => p.toLowerCase() === keyword.toLowerCase());
    if (matchIndex !== -1 && text.length > 100) {
      const windowSize = 40;
      let startText = parts.slice(0, matchIndex).join('');
      let endText = parts.slice(matchIndex + 1).join('');
      
      startText = startText.length > windowSize ? '...' + startText.slice(-windowSize) : startText;
      endText = endText.length > windowSize ? endText.slice(0, windowSize) + '...' : endText;
      
      return (
        <>
          {startText}
          <mark className="bg-yellow-200 px-1 rounded text-gray-900 font-semibold">{parts[matchIndex]}</mark>
          {endText}
        </>
      );
    }

    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200 px-1 rounded text-gray-900 font-semibold">{part}</mark> : part
    );
  };

  const getRestrictionColor = (restriction: string) => {
    return restrictionColorMap[restriction] || { bg: 'bg-slate-100', text: 'text-slate-700' };
  };

  const formatDatum = (datumStr: string) => {
    const parts = datumStr.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const fullYear = year < 100 ? (year > 30 ? 1900 + year : 2000 + year) : year;
      const date = new Date(Date.UTC(fullYear, monthIndex, day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC'
        });
      }
    }
    return datumStr;
  };

  // Map restriction codes to full country names
  const restrictionLabels: Record<string, string> = {
    'JPN': 'Japan',
    'GER': 'Germany',
    'SUI': 'Switzerland',
    'AUT': 'Austria',
    'UK': 'United Kingdom',
    'USA': 'United States of America',
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!result) return [];
    const totalPages = result.totalPages;
    const current = page;
    const delta = 2;
    const pages: (number | string)[] = [];

    for (let i = Math.max(1, current - delta); i <= Math.min(totalPages, current + delta); i++) {
      pages.push(i);
    }

    if (pages[0] !== 1) {
      if (pages[0] !== 2) pages.unshift('...');
      pages.unshift(1);
    }

    if (pages[pages.length - 1] !== totalPages) {
      if (pages[pages.length - 1] !== totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">IMAGO Archive</h1>
            <p className="text-gray-600 mt-2 text-sm">Professional image collection and search</p>
          </div>
          <button
            type="button"
            onClick={() => setAnalyticsOpen(true)}
            className="inline-flex items-center space-x-2 text-sm bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors shadow-sm"
            aria-haspopup="dialog"
            aria-expanded={analyticsOpen}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Analytics</span>
          </button>
        </div>

        {/* Sticky Search & Controls Container */}
        <div className="sticky top-0 z-20 pt-2 pb-6 bg-gradient-to-br from-slate-50/90 to-slate-100/90 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-center bg-white rounded-xl border border-gray-200 shadow-sm p-1.5">
              
              {/* Search Input */}
              <div className="relative flex-1 w-full">
                <label htmlFor="search-input" className="sr-only">Search</label>
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="search-input"
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by keywords, ID, photographer, or date..."
                  className="w-full text-base sm:text-lg border-transparent pl-12 pr-24 py-2.5 focus:border-transparent focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 outline-none transition-all text-gray-900 bg-transparent rounded-lg"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-describedby="search-shortcut-hint"
                />
                <div id="search-shortcut-hint" className="sr-only">Press Command K or Control K to focus search.</div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-2 pointer-events-auto">
                  {loading && (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                  )}
                  {!loading && (
                    <>
                      <span className="text-xs text-gray-600 font-medium whitespace-nowrap hidden sm:inline">
                        {result ? result.total.toLocaleString() : '0'} results
                      </span>
                      {q.length > 0 && (
                        <button
                          onClick={() => setQ('')}
                          className="inline-flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                          aria-label="Clear search"
                          title="Clear search query"
                          type="button"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      {q.length === 0 && (
                        <kbd className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded-lg">
                          <span className="text-sm">⌘K</span>
                        </kbd>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Vertical Divider (hidden on mobile) */}
              <div className="hidden lg:block w-px h-8 bg-gray-200"></div>

              {/* Controls Bar (Sort Only) */}
              <div className="flex items-center justify-end w-full lg:w-auto gap-2 px-3 lg:pr-4 py-2 lg:py-0">
                <label htmlFor="sort-by" className="text-sm text-gray-500 font-medium whitespace-nowrap">Sort:</label>
                <select 
                  id="sort-by"
                  className="text-sm border-0 bg-transparent text-gray-900 font-medium hover:text-blue-600 focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer p-0 pr-6 rounded"
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  aria-label="Sort results"
                >
                  <option value="">Best Match</option>
                  <option value="date_desc">Newest</option>
                  <option value="date_asc">Oldest</option>
                </select>
              </div>
            </div>
          </div>

          {analyticsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6" role="dialog" aria-modal="true" aria-labelledby="analytics-modal-title">
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                aria-label="Close analytics modal"
                onClick={() => setAnalyticsOpen(false)}
              />
              <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                  <div>
                    <h2 id="analytics-modal-title" className="text-xl font-semibold text-gray-900">Analytics Overview</h2>
                    <p className="mt-1 text-sm text-gray-500">Live search activity and keyword distribution</p>
                  </div>
                  <button
                    ref={analyticsCloseButtonRef}
                    type="button"
                    onClick={() => setAnalyticsOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="Close analytics modal"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-6">
                  {analyticsLoading && (
                    <div className="space-y-4" aria-live="polite">
                      <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
                      <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
                    </div>
                  )}

                  {!analyticsLoading && analyticsError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {analyticsError}
                    </div>
                  )}

                  {!analyticsLoading && analyticsData && (
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Searches</div>
                          <div className="mt-2 text-2xl font-semibold text-gray-900">{analyticsData.totalSearches.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Avg. Query Time</div>
                          <div className="mt-2 text-2xl font-semibold text-gray-900">{analyticsData.avgQueryTimeMs.toFixed(1)} ms</div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Top Keyword Count</div>
                          <div className="mt-2 text-2xl font-semibold text-gray-900">{Object.keys(analyticsData.topKeywords).length}</div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Top Keywords</h3>
                        <div className="mt-3 space-y-2">
                          {Object.entries(analyticsData.topKeywords).length > 0 ? (
                            Object.entries(analyticsData.topKeywords).map(([keyword, count]) => (
                              <div key={keyword} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                                <span className="text-sm font-medium text-gray-900">{keyword}</span>
                                <span className="text-sm text-gray-500">{count}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No analytics data available yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-4 lg:top-28">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 cursor-pointer" title="Filter results by photographer, date range, and access restrictions">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Filters</span>
                </h2>
                <button 
                  onClick={() => { setQ(''); setCredit(''); setDateFrom(''); setDateTo(''); setRestrictions([]); setSortBy(''); setPage(1); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  title="Clear all active filters"
                >
                  Reset
                </button>
              </div>

              {/* Credit Filter */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label htmlFor="credit-filter" className="block text-sm font-semibold text-gray-900 mb-3 cursor-pointer" title="Filter images by the photographer or image credit source">Credit (Photographer)</label>
                <select 
                  id="credit-filter"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                  value={credit}
                  onChange={(e) => { setCredit(e.target.value); setPage(1); }}
                  title="Select a photographer or credit source to filter by"
                >
                  <option value="">All Photographers</option>
                  {facets.credits.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-3 cursor-pointer" title="Filter images within a specific date range">Date Range</label>
                <div className="space-y-2">
                  <div>
                    <label htmlFor="date-from" className="text-xs text-gray-500 block mb-1 cursor-pointer" title="Start date for filtering (inclusive)">From</label>
                    <input 
                      id="date-from"
                      type="date" 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      title="Select the start date"
                    />
                  </div>
                  <div>
                    <label htmlFor="date-to" className="text-xs text-gray-500 block mb-1 cursor-pointer" title="End date for filtering (inclusive)">To</label>
                    <input 
                      id="date-to"
                      type="date" 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      title="Select the end date"
                    />
                  </div>
                </div>
              </div>

              {/* Restrictions Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3 cursor-pointer" title="Filter by publication restrictions for specific countries or regions">Restrictions</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 relative">
                  {facets.restrictions.map(r => (
                    <label key={r} className="flex items-center space-x-3 cursor-pointer group">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={restrictions.includes(r)}
                          onChange={() => toggleRestriction(r)}
                          title={`Filter to show only images with ${restrictionLabels[r] || r} restrictions`}
                        />
                        <div className="w-5 h-5 border border-gray-200 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all group-hover:border-gray-300"></div>
                        <svg className="absolute w-3 h-3 top-1 left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded" title={restrictionLabels[r] || r}>
                        {r}
                      </span>
                    </label>
                  ))}
                  {facets.restrictions.length === 0 && <span className="text-sm text-gray-500">No restrictions available</span>}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              {!loading && result && result.items.length === 0 && (
                <div className="col-span-full py-20 text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              )}
              
              {result && result.items.map((item: MediaItem) => (
                <article key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 group cursor-pointer" title={`View details for image ${item.bildnummer}`}>
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="inline-flex items-center space-x-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">ID:</span>
                        <span className="font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded">
                          {highlightText(item.bildnummer, debouncedQ)}
                        </span>
                      </span>
                      <span className="text-xs font-medium text-gray-500 flex items-center space-x-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDatum(item.datum)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4">
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 h-[46px] mb-4" title={item.suchtext}>
                      {highlightText(item.suchtext, debouncedQ)}
                    </p>

                    {/* Restriction Badges Container (Always rendered for consistent height) */}
                    <div className="flex flex-wrap gap-2 min-h-[26px]">
                      {item.restrictions.map(r => {
                        const colors = getRestrictionColor(r);
                        return (
                          <span key={r} className={`inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text}`} title={`Restricted in ${restrictionLabels[r] || r}`}>
                            {r}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs text-gray-600 min-w-0" title={`Photographer/Source: ${item.fotografen}`}>
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="truncate">{highlightText(item.fotografen, debouncedQ)}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2" title={`Image dimensions: ${item.breite} × ${item.hoehe} pixels`}>
                      {item.breite}×{item.hoehe}
                    </span>
                  </div>
                </article>
              ))}

              {/* Loading Skeleton Cards */}
              {loading && !result && Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-100">
                    <div className="flex justify-between mb-2">
                      <div className="h-3 bg-gray-300 rounded w-24"></div>
                      <div className="h-3 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="space-y-2 mb-4">
                      <div className="h-3 bg-gray-300 rounded"></div>
                      <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-300 rounded w-4/6"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-5 bg-gray-200 rounded-full w-12"></div>
                      <div className="h-5 bg-gray-200 rounded-full w-12"></div>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between">
                    <div className="h-3 bg-gray-300 rounded w-24"></div>
                    <div className="h-3 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination & Per Page Selector */}
            {result && result.total > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 pt-8 mt-4">
                {/* Per Page Dropdown */}
                <div className="flex items-center space-x-3 text-sm text-gray-700">
                  <label htmlFor="pageSizeSelect" className="font-medium text-gray-600">Items per page:</label>
                  <select
                    id="pageSizeSelect"
                    className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
                    value={pageSize}
                    onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                    title="Change number of items displayed per page"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Pagination Controls */}
                {result.totalPages > 1 && (
                  <div className="flex flex-wrap justify-center items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Previous</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {getPageNumbers().map((pageNum, idx) => (
                        pageNum === '...' ? (
                          <span key={`dots-${idx}`} className="px-2 text-gray-400">...</span>
                        ) : (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum as number)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                              page === pageNum
                                ? 'bg-blue-600 text-white border border-blue-600'
                                : 'border border-gray-200 text-gray-700 bg-white hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            aria-current={page === pageNum ? 'page' : undefined}
                            aria-label={`Go to page ${pageNum}`}
                            aria-pressed={page === pageNum}
                          >
                            {pageNum}
                          </button>
                        )
                      ))}
                    </div>

                    <button
                      onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                      disabled={page === result.totalPages}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                      aria-label="Next page"
                    >
                      <span>Next</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading app...</div>}>
      <SearchApp />
    </Suspense>
  );
}
