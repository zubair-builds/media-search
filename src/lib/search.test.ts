import { describe, expect, test, beforeEach } from '@jest/globals';
import { searchEngine, recordAnalytics, analyticsState } from './search';

describe('Search Engine Preprocessing & Core Logic', () => {
  test('should parse dates to unix timestamp correctly', () => {
    // 25.07.1952 in data.json (suchtext has "Wildlife photography lion safari Kenya Africa nature PUBLICATIONxINxJPNxONLY")
    const res = searchEngine.search({ q: 'Wildlife' });
    expect(res.items.length).toBeGreaterThan(0);
    // Uses UTC in SearchEngine.parseDate
    expect(res.items[0].timestamp).toBe(Date.UTC(1952, 6, 25));
  });

  test('should extract and strip restrictions correctly', () => {
    const res = searchEngine.search({ q: 'Olaf Scholz' });
    const item = res.items[0];
    
    // Original text had PUBLICATIONxINxGERxSUIxAUTxONLY
    expect(item.restrictions).toContain('GER');
    expect(item.restrictions).toContain('SUI');
    expect(item.restrictions).toContain('AUT');
    
    // The restriction string should be stripped from suchtext
    expect(item.suchtext).not.toContain('PUBLICATIONxINxGERxSUIxAUTxONLY');
  });

  test('should filter out German stop words during tokenization', () => {
    // "und", "der", "die" shouldn't yield matches because they are stop words
    const res = searchEngine.search({ q: 'der' });
    expect(res.items.length).toBe(0);
  });

  test('should match accented metadata with ASCII queries', () => {
    const res = searchEngine.search({ q: 'Munchen' });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].suchtext).toContain('München');
  });
});

describe('Search Filters & Relevance', () => {
  test('should exact match on bildnummer with highest score', () => {
    const res = searchEngine.search({ q: '0050000002' });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].bildnummer).toBe('0050000002');
  });

  test('should filter by credit (photographer)', () => {
    const res = searchEngine.search({ credit: ['IMAGO / teutopress'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].fotografen).toBe('IMAGO / teutopress');
  });

  test('should filter by restrictions', () => {
    const res = searchEngine.search({ restrictions: ['GER'] });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].restrictions).toContain('GER');
  });
});

describe('Analytics Tracking', () => {
  beforeEach(() => {
    analyticsState.totalSearches = 0;
    analyticsState.totalQueryTimeMs = 0;
    analyticsState.keywordCounts.clear();
  });

  test('should track query executions and keywords', () => {
    recordAnalytics('jackson', 15);
    recordAnalytics('jackson', 10);
    recordAnalytics('football', 5);

    expect(analyticsState.totalSearches).toBe(3);
    expect(analyticsState.totalQueryTimeMs).toBe(30);
    expect(analyticsState.keywordCounts.get('jackson')).toBe(2);
    expect(analyticsState.keywordCounts.get('football')).toBe(1);
  });
});
