import React from 'react';
import { MediaItem } from '@/lib/types';
import { formatDatum, getRestrictionColor } from '@/lib/utils';
import { restrictionLabels } from '@/constants';
import { HighlightText } from './HighlightText';

interface MediaCardProps {
  item: MediaItem;
  debouncedQ: string;
}

// Renders an item card with basic info, photographer, image size, and restriction tags.
export const MediaCard: React.FC<MediaCardProps> = ({ item, debouncedQ }) => {
  return (
    <article className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 group cursor-pointer" title={`View details for image ${item.bildnummer}`}>
      {/* Card Header: Shows ID and parsed Date */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="inline-flex items-center space-x-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">ID:</span>
            <span className="font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2.5 py-1 rounded">
              <HighlightText text={item.bildnummer} keyword={debouncedQ} />
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

      {/* Card Body: Highlights search keywords and adds restriction badges */}
      <div className="px-5 py-4">
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 h-[46px] mb-4" title={item.suchtext}>
          <HighlightText text={item.suchtext} keyword={debouncedQ} />
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

      {/* Card Footer: Metadata like photographer and original image dimensions */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs text-gray-600 min-w-0" title={`Photographer/Source: ${item.fotografen}`}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="truncate"><HighlightText text={item.fotografen} keyword={debouncedQ} /></span>
        </div>
        <span className="text-xs font-medium text-gray-600 flex-shrink-0 ml-2" title={`Image dimensions: ${item.breite} × ${item.hoehe} pixels`}>
          {item.breite}×{item.hoehe}
        </span>
      </div>
    </article>
  );
};
