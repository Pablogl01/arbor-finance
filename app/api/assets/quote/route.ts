import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

const yf = new (yahooFinance as any)();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = await yf.quote(ticker);
    
    return NextResponse.json({ 
      ticker: quote.symbol,
      price: quote.regularMarketPrice || 0,
      currency: quote.currency || 'USD',
      name: quote.shortName || quote.longName || quote.symbol
    });
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
