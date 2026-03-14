import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import yahooFinance from 'yahoo-finance2';

// Force dynamic rendering to prevent Next.js from caching this GET request
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Security check: Verify the secret token
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    console.log('--- Price Update Cron Execution Started ---');
    console.log('Timestamp:', new Date().toISOString());

    // In a real production environment, you should set CRON_SECRET in your environment variables
    const CRON_SECRET = process.env.CRON_SECRET || 'dev_secret_only';

    if (secret !== CRON_SECRET) {
        console.error(`401 Unauthorized: Attempted with secret: "${secret?.substring(0, 3)}..." but expected starting with "${CRON_SECRET.substring(0, 3)}..."`);
        return NextResponse.json({ error: 'Unauthorized', details: 'Secret mismatch' }, { status: 401 });
    }

    const supabase = createAdminClient();

    try {
        console.log('1. Fetching assets from database...');
        const { data: assetsToUpdate, error: assetsError } = await supabase
            .from('assets')
            .select('ticker');

        if (assetsError) {
            console.error('CRITICAL: Error fetching assets from Supabase:', assetsError);
            throw assetsError;
        }

        if (!assetsToUpdate || assetsToUpdate.length === 0) {
            console.warn('Finished: No assets found in the "assets" table.');
            return NextResponse.json({ message: 'No assets in catalog to update' });
        }

        const tickers = assetsToUpdate.map(a => a.ticker);
        console.log(`2. Found ${tickers.length} tickers to fetch:`, tickers);

        // Fetch prices in parallel
        const quotes = await Promise.all(
            tickers.map(async (ticker) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const q = await (yahooFinance as any).quote(ticker);
                    return { ticker, quote: q };
                } catch (e: any) {
                    console.error(`Error fetching quote for ticker "${ticker}":`, e.message);
                    return { ticker, quote: null, error: e.message };
                }
            })
        );

        const updatedAssets = [];
        for (const item of quotes) {
            const { ticker, quote } = item;
            if (quote && quote.regularMarketPrice !== undefined) {
                console.log(`- Fetch OK: ${ticker} = ${quote.regularMarketPrice} ${quote.currency || ''}`);
                updatedAssets.push({
                    ticker: ticker,
                    current_price: quote.regularMarketPrice,
                    last_updated: new Date().toISOString()
                });
            } else {
                console.warn(`- Fetch FAILED: ${ticker} (Quote empty or price missing)`);
            }
        }

        console.log(`3. Preparing to update ${updatedAssets.length} assets in DB...`);

        // 3. Batch update assets table
        if (updatedAssets.length > 0) {
            const { data, error: upsertError } = await supabase
                .from('assets')
                .upsert(updatedAssets, { onConflict: 'ticker' })
                .select();

            if (upsertError) {
                console.error('CRITICAL: Supabase Upsert Error:', upsertError);
                throw upsertError;
            }
            console.log('SUCCESS: Asset prices updated. Records changed:', data?.length);
        } else {
            console.warn('SKIP: No valid quotes to update in the database.');
        }

        // 4. Recalculate balance_cache for all investment accounts
        console.log('4. Recalculating account balances...');
        const { data: investmentAccounts, error: accountsError } = await supabase
            .from('accounts')
            .select('id')
            .eq('type', 'investment');

        if (accountsError) {
            console.error('Error fetching accounts:', accountsError);
            throw accountsError;
        }

        const accountUpdates = [];
        for (const account of investmentAccounts || []) {
            const { data: holdings, error: holdingsError } = await supabase
                .from('user_assets')
                .select(`
                    quantity,
                    assets (current_price)
                `)
                .eq('account_id', account.id);

            if (holdingsError) {
                console.error(`Error fetching holdings for account ${account.id}:`, holdingsError);
                continue;
            }

            const newBalance = (holdings || []).reduce((acc, h) => {
                const holding = h as unknown as { quantity: number; assets: { current_price: number } | null };
                if (holding.assets && holding.assets.current_price) {
                    return acc + (Number(holding.quantity) * Number(holding.assets.current_price));
                }
                return acc;
            }, 0);

            accountUpdates.push({
                id: account.id,
                balance_cache: newBalance
            });
        }

        console.log(`5. Updating ${accountUpdates.length} account balances...`);
        for (const update of accountUpdates) {
            const { error: accUpdateError } = await supabase
                .from('accounts')
                .update({ balance_cache: update.balance_cache })
                .eq('id', update.id);
            
            if (accUpdateError) {
                console.error(`Error updating account ${update.id}:`, accUpdateError);
            }
        }

        console.log('--- Cron Execution Finished Successfully ---');
        return NextResponse.json({
            success: true,
            updatedAssetsCount: updatedAssets.length,
            updatedAccountsCount: accountUpdates.length
        });

    } catch (err) {
        const error = err as Error;
        console.error('--- Cron Job FAILED ---');
        console.error('Error Details:', error.message);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details: error.message 
        }, { status: 500 });
    }
}
