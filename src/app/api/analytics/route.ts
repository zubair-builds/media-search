import { NextResponse } from 'next/server';
import { analyticsState } from '@/lib/search';

export async function GET() {
  const topKeywords = Array.from(analyticsState.keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return NextResponse.json({
    totalSearches: analyticsState.totalSearches,
    avgQueryTimeMs: analyticsState.totalSearches > 0 
      ? analyticsState.totalQueryTimeMs / analyticsState.totalSearches 
      : 0,
    topKeywords: Object.fromEntries(topKeywords)
  });
}
