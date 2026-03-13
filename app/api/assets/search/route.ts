import { NextResponse } from 'next/server';
import yahooFinanceModule from 'yahoo-finance2';
const yahooFinance = new (yahooFinanceModule as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    }, { validateResult: false }) as any;
    
    // Filter out non-equity/ETF entities and map to simplified schema
    const filtered = results.quotes.filter((q: any) => q.isYahooFinance).map((q: any) => ({
      ticker: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      type: q.quoteType === 'ETF' ? 'ETF' : q.quoteType === 'EQUITY' ? 'Stock' : 'Crypto',
      currentPrice: 0, // Will be fetched when selecting explicitly or we can fetch a batch of quotes if needed
    }));

    return NextResponse.json({ results: filtered });
  } catch (error) {
    console.error('Error fetching assets from Yahoo Finance:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}
