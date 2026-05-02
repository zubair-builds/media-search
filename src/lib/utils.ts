import { restrictionColorMap } from '@/constants';

// Fetches classes for restricted item tags, fallback to a neutral slate.
export const getRestrictionColor = (restriction: string) => {
  return restrictionColorMap[restriction] || { bg: 'bg-slate-100', text: 'text-slate-700' };
};

// Formats string date in DD.MM.YYYY format into human readable string like 'Jan 1, 2026'
export const formatDatum = (datumStr: string) => {
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

// Generates an array of page numbers and ellipses for the pagination control.
export const getPageNumbers = (page: number, totalPages: number) => {
  if (!totalPages) return [];
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
