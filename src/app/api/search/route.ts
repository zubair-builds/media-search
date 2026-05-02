import { NextRequest, NextResponse } from 'next/server';
import { searchEngine, recordAnalytics, sanitizeQuery } from '@/lib/search';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;

  const rawQuery = searchParams.get('q') || undefined;
  const sanitizedQ = sanitizeQuery(rawQuery);
  const q = sanitizedQ && sanitizedQ.length >= 3 ? sanitizedQ : undefined;
  const creditParam = searchParams.get('credit');
  const credit = creditParam ? creditParam.split(',') : undefined;
  
  const dateFrom = searchParams.get('dateFrom') || undefined;
  const dateTo = searchParams.get('dateTo') || undefined;
  
  const restParam = searchParams.get('restrictions');
  const restrictions = restParam ? restParam.split(',') : undefined;
  
  const sortByParam = searchParams.get('sortBy');
  const sortBy = (sortByParam === 'date_asc' || sortByParam === 'date_desc' || sortByParam === 'relevance') 
    ? sortByParam 
    : undefined;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  let pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  if (!isFinite(pageSize) || pageSize < 1) pageSize = 10;
  // Defensive cap to prevent OOM/abuse
  pageSize = Math.min(100, pageSize);

  try {
    const result = searchEngine.search({
      q,
      credit,
      dateFrom,
      dateTo,
      restrictions,
      sortBy,
      page,
      pageSize
    });

    const executionTimeMs = Date.now() - startTime;
    recordAnalytics(q, executionTimeMs);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
