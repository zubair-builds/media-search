import { NextResponse } from 'next/server';
import { searchEngine } from '@/lib/search';

export async function GET() {
  const facets = searchEngine.getFacets();
  return NextResponse.json(facets);
}
