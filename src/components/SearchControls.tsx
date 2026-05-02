import React, { RefObject } from 'react';

interface SearchControlsProps {
  q: string;
  setQ: (val: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  totalResults: number;
  sortBy: string;
  setSortBy: (val: string) => void;
}

// Top sticky control bar housing the main search input, loading spinners,
// result count, and sort order selector.
export const SearchControls: React.FC<SearchControlsProps> = ({
  q,
  setQ,
  searchInputRef,
  loading,
  totalResults,
  sortBy,
  setSortBy,
}) => {
  return (
    <div className="sticky top-0 z-20 pt-2 pb-6 bg-gradient-to-br from-slate-50/90 to-slate-100/90 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
      <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-center bg-white rounded-xl border border-gray-200 shadow-sm p-1.5">
        
        {/* Main Search Input */}
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
                  {totalResults.toLocaleString()} results
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

        {/* Sort Results Selector */}
        <div className="flex items-center justify-end w-full lg:w-auto gap-2 px-3 lg:pr-4 py-2 lg:py-0">
          <label htmlFor="sort-by" className="text-sm text-gray-500 font-medium whitespace-nowrap">Sort:</label>
          <select 
            id="sort-by"
            className="text-sm border-0 bg-transparent text-gray-900 font-medium hover:text-blue-600 focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer p-0 pr-6 rounded"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort results"
          >
            <option value="">Best Match</option>
            <option value="date_desc">Newest</option>
            <option value="date_asc">Oldest</option>
          </select>
        </div>
      </div>
    </div>
  );
};
