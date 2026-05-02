'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { SearchResult, MediaItem } from '@/lib/types';

import { AnalyticsModal } from '@/components/AnalyticsModal';
import { FiltersSidebar, Facets } from '@/components/FiltersSidebar';
import { SearchControls } from '@/components/SearchControls';
import { MediaCard } from '@/components/MediaCard';
import { Pagination } from '@/components/Pagination';

// Core controller of the application. Manages query states, URL synchronization,
// and API interactions.
function SearchApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read current state from the URL (Single Source of Truth)
  const urlQ = searchParams.get('q') || '';
  const credit = searchParams.get('credit') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const restrictions = searchParams.get('restrictions') ? searchParams.get('restrictions')!.split(',') : [];
  const sortBy = searchParams.get('sortBy') || '';
  let page = parseInt(searchParams.get('page') || '1', 10);
  if (!isFinite(page) || page < 1) page = 1;
  let pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  if (!isFinite(pageSize) || pageSize < 1) pageSize = 10;
  pageSize = Math.min(100, pageSize);

  // Maintain local state ONLY for the search input to allow smooth, debounceable typing
  const [localQ, setLocalQ] = useState(urlQ);
  const debouncedQ = useDebounce(localQ, 300);

  // Sync back from URL if user uses browser history (back/forward buttons)
  useEffect(() => {
    setLocalQ(urlQ);
  }, [urlQ]);

  // Generic updater to modify URL params and trigger a React re-render cycle
  const updateUrl = (updates: Record<string, string | number | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','));
      } else {
        params.set(key, value.toString());
      }
    });

    // Replace the URL to avoid bloating history, without scrolling to the top
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  // Push debounced search query to URL, resetting to page 1
  useEffect(() => {
    if (debouncedQ !== urlQ) {
      updateUrl({ q: debouncedQ, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // Data fetching states
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets>({ credits: [], restrictions: [] });
  const [analyticsOpen, setAnalyticsOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch facets on mount for the sidebar filters
  useEffect(() => {
    fetch('/api/facets')
      .then(res => res.json())
      .then(data => setFacets(data))
      .catch(err => console.error('Failed to load facets', err));
  }, []);

  // Keyboard shortcut to focus search input (Cmd+K or Ctrl+K)
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

  // Fetch Search Results directly based on the URL searchParams
  useEffect(() => {
    setLoading(true);
    fetch(`/api/search?${searchParams.toString()}`)
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
  }, [searchParams]);

  // Handle addition/removal of restriction filters
  const toggleRestriction = (val: string) => {
    const newRestrictions = restrictions.includes(val)
      ? restrictions.filter(r => r !== val)
      : [...restrictions, val];
    updateUrl({ restrictions: newRestrictions, page: 1 });
  };

  // Reset all filters to their initial defaults
  const handleResetFilters = () => {
    // We clear all filter params
    updateUrl({
      q: null,
      credit: null,
      dateFrom: null,
      dateTo: null,
      restrictions: null,
      sortBy: null,
      page: 1
    });
    setLocalQ('');
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

        <SearchControls
          q={localQ}
          setQ={setLocalQ}
          searchInputRef={searchInputRef}
          loading={loading}
          totalResults={result ? result.total : 0}
          sortBy={sortBy}
          setSortBy={(val) => updateUrl({ sortBy: val, page: 1 })}
        />

        <AnalyticsModal
          isOpen={analyticsOpen}
          onClose={() => setAnalyticsOpen(false)}
        />

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          <FiltersSidebar
            facets={facets}
            credit={credit}
            setCredit={(val) => updateUrl({ credit: val, page: 1 })}
            dateFrom={dateFrom}
            setDateFrom={(val) => updateUrl({ dateFrom: val, page: 1 })}
            dateTo={dateTo}
            setDateTo={(val) => updateUrl({ dateTo: val, page: 1 })}
            restrictions={restrictions}
            toggleRestriction={toggleRestriction}
            onReset={handleResetFilters}
          />

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
                <MediaCard key={item.id} item={item} debouncedQ={urlQ} />
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
              <Pagination
                page={page}
                pageSize={pageSize}
                totalPages={result.totalPages}
                onPageChange={(p) => updateUrl({ page: p })}
                onPageSizeChange={(size) => updateUrl({ pageSize: size, page: 1 })}
              />
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
