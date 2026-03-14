import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
    // Security check: Verify the secret token
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // In a real production environment, you should set CRON_SECRET in your environment variables
    const CRON_SECRET = process.env.CRON_SECRET || 'dev_secret_only';

    if (secret !== CRON_SECRET) {
        console.error(`Unauthorized cron attempt with secret: ${secret?.substring(0, 3)}...`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    try {
        console.log('Starting price update cron job...');

        // 1. Get all assets to update
        const { data: assetsToUpdate, error: assetsError } = await supabase
            .from('assets')
            .select('ticker');

        if (assetsError) {
            console.error('Error fetching assets from DB:', assetsError);
            throw assetsError;
        }

        if (!assetsToUpdate || assetsToUpdate.length === 0) {
            console.log('No assets found in database to update.');
            return NextResponse.json({ message: 'No assets in catalog to update' });
        }

        // 2. Fetch new prices from Yahoo Finance
        const updatedAssets = [];
        const tickers = assetsToUpdate.map(a => a.ticker);

        console.log(`Fetching quotes for ${tickers.length} assets: ${tickers.join(', ')}`);

        // Fetch prices in parallel
        const quotes = await Promise.all(
            tickers.map(ticker =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (yahooFinance as any).quote(ticker).catch((e: Error) => {
                    console.error(`Error fetching quote for ${ticker}:`, e.message);
                    return null;
                })
            )
        );

        for (let i = 0; i < quotes.length; i++) {
            const quote = quotes[i];
            const originalTicker = tickers[i];
            
            if (quote && (quote.regularMarketPrice !== undefined)) {
                console.log(`Successfully fetched price for ${originalTicker}: ${quote.regularMarketPrice}`);
                updatedAssets.push({
                    ticker: originalTicker, // IMPORTANT: Use original ticker to match DB key
                    current_price: quote.regularMarketPrice,
                    last_updated: new Date().toISOString()
                });
            } else {
                console.warn(`Could not get price for ${originalTicker} - quote response was empty or invalid`);
            }
        }

        // 3. Batch update assets table
        if (updatedAssets.length > 0) {
            console.log(`Updating ${updatedAssets.length} assets in database...`);
            const { error: upsertError } = await supabase
                .from('assets')
                .upsert(updatedAssets, { onConflict: 'ticker' });

            if (upsertError) {
                console.error('Error during upsert to assets table:', upsertError);
                throw upsertError;
            }
            console.log('Database updated successfully for assets.');
        } else {
            console.warn('No assets were updated (no valid quotes received).');
        }

        // 4. Recalculate balance_cache for all investment accounts
        console.log('Recalculating balances for investment accounts...');
        const { data: investmentAccounts, error: accountsError } = await supabase
            .from('accounts')
            .select('id')
            .eq('type', 'investment');

        if (accountsError) throw accountsError;

        const accountUpdates = [];

        for (const account of investmentAccounts) {
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

        // Update accounts in parallel where possible, or sequentially if needed
        // For simplicity and since there aren't many accounts usually:
        for (const update of accountUpdates) {
            await supabase
                .from('accounts')
                .update({ balance_cache: update.balance_cache })
                .eq('id', update.id);
        }

        return NextResponse.json({
            success: true,
            message: 'Prices and balances updated successfully',
            updatedAssetsCount: updatedAssets.length,
            updatedAccountsCount: accountUpdates.length
        });

    } catch (err) {
        const error = err as Error;
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
