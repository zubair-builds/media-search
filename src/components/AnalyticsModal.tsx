import React, { useEffect, useRef, useState } from 'react';
import { AnalyticsData } from '@/lib/types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Dialog that displays live search analytics like keywords and speed.
export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const analyticsCloseButtonRef = useRef<HTMLButtonElement>(null);

  // Re-fetch data on every open
  useEffect(() => {
    if (!isOpen) return;

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    fetch('/api/analytics')
      .then(res => {
        if (!res.ok) throw new Error('Analytics fetch failed');
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
  }, [isOpen]);

  // Support pressing escape to close the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Autofocus close button when opening
  useEffect(() => {
    if (isOpen) {
      analyticsCloseButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6" role="dialog" aria-modal="true" aria-labelledby="analytics-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
        aria-label="Close analytics modal"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div>
            <h2 id="analytics-modal-title" className="text-xl font-semibold text-gray-900">Analytics Overview</h2>
            <p className="mt-1 text-sm text-gray-500">Search activity and keyword distribution</p>
          </div>
          <button
            ref={analyticsCloseButtonRef}
            type="button"
            onClick={onClose}
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
  );
};
