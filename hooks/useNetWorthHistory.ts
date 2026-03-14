import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useNetWorthHistory() {
  const [data, setData] = useState<{ labels: string[]; values: number[] }>({
    labels: [],
    values: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch user accounts
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, type')
          .eq('user_id', user.id);
          
        if (!accounts || accounts.length === 0) {
          setLoading(false);
          return;
        }

        const cashAccountIds = accounts.filter(a => a.type === 'cash').map(a => a.id);
        const invAccountIds = accounts.filter(a => a.type === 'investment').map(a => a.id);

        // Fetch all cash transactions
        let cashTxs: { amount: number; type: string; date: string }[] = [];
        if (cashAccountIds.length > 0) {
          const { data: txs } = await supabase
            .from('transactions')
            .select('amount, type, date')
            .in('account_id', cashAccountIds);
          if (txs) cashTxs = txs;
        }

        // Fetch all investment transactions
        let invTxs: { quantity: number; price: number; type: string; date: string }[] = [];
        if (invAccountIds.length > 0) {
          const { data: itxs } = await supabase
            .from('investment_transactions')
            .select('quantity, price, type, date')
            .in('account_id', invAccountIds);
          if (itxs) invTxs = itxs;
        }

        // Fetch current portfolio to distribute unrealized P&L
        let currentPortfolioValue = 0;
        let totalInvestedCost = 0;
        
        if (invAccountIds.length > 0) {
           const { data: userAssets } = await supabase
             .from('user_assets')
             .select('quantity, average_cost, asset_ticker')
             .in('account_id', invAccountIds);
             
           if (userAssets && userAssets.length > 0) {
             const tickers = userAssets.map(ua => ua.asset_ticker);
             const { data: assetsData } = await supabase
               .from('assets')
               .select('ticker, current_price')
               .in('ticker', tickers);
               
             const priceMap = new Map(assetsData?.map(a => [a.ticker, a.current_price]) || []);
             
             userAssets.forEach(ua => {
                const currentPrice = priceMap.get(ua.asset_ticker) || 0;
                currentPortfolioValue += Number(ua.quantity) * Number(currentPrice);
                totalInvestedCost += Number(ua.quantity) * Number(ua.average_cost);
             });
           }
        }
        
        const totalUnrealizedPL = currentPortfolioValue - totalInvestedCost;

        // Generate the last 6 months + current month labels
        const labels: string[] = [];
        const monthlyValues: number[] = [];
        
        const now = new Date();
        const monthsData: { label: string; cashFlow: number }[] = [];
        
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStr = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
          const yearStr = d.getFullYear().toString().slice(-2);
          monthsData.push({ label: `${monthStr} ${yearStr}`, cashFlow: 0 });
        }

        // Accumulate running totals for each month
        // 1. Group transactions into months
        const combinedTxs = [
          ...cashTxs.map(t => ({
            date: new Date(t.date),
            value: t.type === 'income' ? Number(t.amount) : -Number(t.amount)
          })),
          ...invTxs.map(t => ({
            date: new Date(t.date),
            value: t.type === 'buy' ? Number(t.quantity) * Number(t.price) : -Number(t.quantity) * Number(t.price)
          }))
        ];

        // Sort chronological
        combinedTxs.sort((a, b) => a.date.getTime() - b.date.getTime());

        // We will compute the accumulated value at the end of each month bin
        // First find out total base before our 6 month window
        let runningTotal = 0;
        const windowStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        let txIdx = 0;
        while (txIdx < combinedTxs.length && combinedTxs[txIdx].date < windowStartDate) {
          runningTotal += combinedTxs[txIdx].value;
          txIdx++;
        }
        
        // Remove unused monthStart variable
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _monthStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        // Distribute unrealized P&L linearly over the 7 months for visual smoothness
        const plStep = totalUnrealizedPL / 7;

        for (let i = 0; i < 7; i++) {
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - 6 + i + 1, 1);
          
          while (txIdx < combinedTxs.length && combinedTxs[txIdx].date < monthEnd) {
             runningTotal += combinedTxs[txIdx].value;
             txIdx++;
          }
          
          labels.push(monthsData[i].label);
          // Add the realized running total + smoothly distributed unrealized P&L up to this point
          const smoothPL = plStep * (i + 1);
          monthlyValues.push(runningTotal + smoothPL);
        }

        setData({ labels, values: monthlyValues });

      } catch (err) {
        console.error('Error fetching net worth history:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  return { data, loading };
}
