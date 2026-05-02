import React from 'react';
import { restrictionLabels } from '@/constants';

export interface Facets {
  credits: string[];
  restrictions: string[];
}

interface FiltersSidebarProps {
  facets: Facets;
  credit: string;
  setCredit: (val: string) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  restrictions: string[];
  toggleRestriction: (val: string) => void;
  onReset: () => void;
}

// Left sidebar containing photographer credits, date range, and restriction filters.
export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  facets,
  credit,
  setCredit,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  restrictions,
  toggleRestriction,
  onReset,
}) => {
  return (
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
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            title="Clear all active filters"
          >
            Reset
          </button>
        </div>

        {/* Credit Filter Dropdown */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <label htmlFor="credit-filter" className="block text-sm font-semibold text-gray-900 mb-3 cursor-pointer" title="Filter images by the photographer or image credit source">Credit (Photographer)</label>
          <select 
            id="credit-filter"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
            value={credit}
            onChange={(e) => setCredit(e.target.value)}
            title="Select a photographer or credit source to filter by"
          >
            <option value="">All Photographers</option>
            {facets.credits.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Date Range Selection Filter */}
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
                onChange={(e) => setDateFrom(e.target.value)}
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
                onChange={(e) => setDateTo(e.target.value)}
                title="Select the end date"
              />
            </div>
          </div>
        </div>

        {/* Publication Restrictions Multi-Checkboxes Filter */}
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
  );
};
