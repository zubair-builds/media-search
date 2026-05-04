import { SearchEngine } from './search';
import { RawMediaItem } from './types';

describe('Search scoring', () => {
  test('ID short-circuit: exact bildnummer ranks first', () => {
    const data: RawMediaItem[] = [
      { suchtext: 'A photo of a cat', bildnummer: 'ID123', fotografen: 'Photog A', datum: '01.01.2000', hoehe: '100', breite: '100' },
      { suchtext: 'Some other content', bildnummer: 'ID456', fotografen: 'Photog B', datum: '02.02.2001', hoehe: '200', breite: '200' }
    ];

    const engine = new SearchEngine(data);
    const res = engine.search({ q: 'ID123', page: 1, pageSize: 10 });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items[0].id).toBe('ID123');
  });

  test('Field weight: match in suchtext outranks fotografen', () => {
    const data: RawMediaItem[] = [
      { suchtext: 'apple banana', bildnummer: 'A1', fotografen: 'Photog X', datum: '01.01.2010', hoehe: '100', breite: '100' },
      { suchtext: 'other content', bildnummer: 'B1', fotografen: 'apple', datum: '01.01.2011', hoehe: '100', breite: '100' }
    ];

    const engine = new SearchEngine(data);
    const res = engine.search({ q: 'apple', page: 1, pageSize: 10 });
    expect(res.items.length).toBe(2);
    // item A1 has 'apple' in suchtext (higher weight) and should appear before B1
    expect(res.items[0].id).toBe('A1');
    expect(res.items[1].id).toBe('B1');
  });

  test('Exact token match outranks prefix match', () => {
    const data: RawMediaItem[] = [
      { suchtext: 'jack', bildnummer: 'J1', fotografen: 'Photog', datum: '03.03.2012', hoehe: '100', breite: '100' },
      { suchtext: 'jackson', bildnummer: 'J2', fotografen: 'Photog', datum: '04.04.2013', hoehe: '100', breite: '100' }
    ];

    const engine = new SearchEngine(data);
    const res = engine.search({ q: 'jack', page: 1, pageSize: 10 });
    expect(res.items.length).toBe(2);
    // exact token 'jack' (J1) should outrank prefix match in 'jackson' (J2)
    expect(res.items[0].id).toBe('J1');
    expect(res.items[1].id).toBe('J2');
  });
});
import { describe, expect, test, beforeEach } from '@jest/globals';
import { searchEngine, recordAnalytics, analyticsState, sanitizeQuery, parseFlexibleDate } from './search';

describe('Search Engine Preprocessing & Core Logic', () => {
  test('should parse dates to unix timestamp correctly', () => {
    // Validate date parsing helper directly
    expect(parseFlexibleDate('25.07.1952')).toBe(Date.UTC(1952, 6, 25));
  });

  test('should extract and strip restrictions correctly', () => {
    // Use a small fixture to ensure restriction extraction works deterministically
    const fixture: RawMediaItem[] = [
      { suchtext: 'Some caption PUBLICATIONxINxGERxSUIxAUTxONLY', bildnummer: 'T1', fotografen: 'Photog', datum: '01.01.2000', hoehe: '100', breite: '100' }
    ];
    const localEngine = new SearchEngine(fixture);
    const res = localEngine.search({ q: 'Some caption' });
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

describe('Sanitize Query Helper', () => {
  test('should strip control characters and normalize spaces', () => {
    expect(sanitizeQuery('  hello\nworld\r  ')).toBe('hello world');
  });

  test('should strip angle brackets and backticks', () => {
    expect(sanitizeQuery('test <script> `backtick` \\slash')).toBe('test script backtick slash');
  });

  test('should limit length to 200 characters', () => {
    const longInput = 'a'.repeat(250);
    expect(sanitizeQuery(longInput)?.length).toBe(200);
  });
});

describe('Parse Flexible Date Helper', () => {
  test('should parse DD.MM.YYYY and DD.MM.YY format', () => {
    expect(parseFlexibleDate('15.08.2025')).toBe(Date.UTC(2025, 7, 15));
    expect(parseFlexibleDate('15.08.25')).toBe(Date.UTC(2025, 7, 15));
  });

  test('should parse standard ISO / RFC formats', () => {
    expect(parseFlexibleDate('2026-05-02')).toBe(Date.parse('2026-05-02'));
  });

  test('should return undefined for invalid dates', () => {
    expect(parseFlexibleDate('invalid-date')).toBeUndefined();
    expect(parseFlexibleDate('35.08.2025')).toBeUndefined();
  });
});
