import React, { useRef } from 'react';
import { getPageNumbers } from '@/lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

// Pagination controls containing per-page and page numbers navigators.
export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  const paginationButtonRefs = useRef(new Map<number, HTMLButtonElement | null>());

  if (totalPages === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 pt-8 mt-4">
      {/* Per Page Dropdown */}
      <div className="flex items-center space-x-3 text-sm text-gray-700">
        <label htmlFor="pageSizeSelect" className="font-medium text-gray-600">Items per page:</label>
        <select
          id="pageSizeSelect"
          className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
          title="Change number of items displayed per page"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className="flex flex-wrap justify-center items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
          tabIndex={-1}
          aria-label="Pagination controls"
        >
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="inline-flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            aria-label="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Previous</span>
          </button>

          {/* Page Numbers with ellipsis handling */}
          <div className="flex items-center space-x-1" role="list" aria-label="Page numbers">
            {getPageNumbers(page, totalPages).map((pageNum, idx) => (
              pageNum === '...' ? (
                <span key={`dots-${idx}`} className="px-2 text-gray-400">...</span>
              ) : (
                <button
                  key={pageNum}
                  ref={el => {
                    if (el) {
                      paginationButtonRefs.current.set(pageNum as number, el);
                    } else {
                      paginationButtonRefs.current.delete(pageNum as number);
                    }
                  }}
                  onClick={() => onPageChange(pageNum as number)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'border border-gray-200 text-gray-700 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  aria-current={page === pageNum ? 'page' : undefined}
                  aria-label={`Go to page ${pageNum}${page === pageNum ? ', current page' : ''}`}
                  aria-pressed={page === pageNum}
                  aria-posinset={typeof pageNum === 'number' ? pageNum : undefined}
                >
                  {pageNum}
                </button>
              )
            ))}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            aria-label={`Next page, currently on page ${page} of ${totalPages}`}
          >
            <span>Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
