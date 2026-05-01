import { NextRequest, NextResponse } from 'next/server';
import { searchEngine, recordAnalytics } from '@/lib/search';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;

  const q = searchParams.get('q') || undefined;
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

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);

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
