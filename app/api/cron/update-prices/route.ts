import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import yahooFinanceModule from 'yahoo-finance2';

// We need to handle the ESM/CJS compatibility for yahoo-finance2
const yahooFinance = yahooFinanceModule as any;

export async function GET(request: Request) {
    // Security check: Verify the secret token
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // In a real production environment, you should set CRON_SECRET in your environment variables
    const CRON_SECRET = process.env.CRON_SECRET || 'dev_secret_only';

    if (secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    try {
        console.log('Starting price update cron job...');

        // 1. Get all assets to update
        const { data: assetsToUpdate, error: assetsError } = await supabase
            .from('assets')
            .select('ticker');

        if (assetsError) throw assetsError;

        if (!assetsToUpdate || assetsToUpdate.length === 0) {
            return NextResponse.json({ message: 'No assets in catalog to update' });
        }

        // 2. Fetch new prices from Yahoo Finance
        const updatedAssets = [];
        const tickers = assetsToUpdate.map(a => a.ticker);

        console.log(`Fetching quotes for ${tickers.length} assets...`);

        // Fetch prices in parallel
        const quotes = await Promise.all(
            tickers.map(ticker =>
                yahooFinance.quote(ticker).catch((e: Error) => {
                    console.error(`Error fetching quote for ${ticker}:`, e.message);
                    return null;
                })
            )
        );

        for (const quote of quotes) {
            if (quote && quote.regularMarketPrice) {
                updatedAssets.push({
                    ticker: quote.symbol,
                    current_price: quote.regularMarketPrice,
                    last_updated: new Date().toISOString()
                });
            }
        }

        // 3. Batch update assets table
        if (updatedAssets.length > 0) {
            console.log(`Updating ${updatedAssets.length} assets in database...`);
            const { error: upsertError } = await supabase
                .from('assets')
                .upsert(updatedAssets, { onConflict: 'ticker' });

            if (upsertError) throw upsertError;
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

            const newBalance = (holdings || []).reduce((acc, h: any) => {
                if (h.assets && h.assets.current_price) {
                    return acc + (Number(h.quantity) * Number(h.assets.current_price));
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

    } catch (error: any) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
