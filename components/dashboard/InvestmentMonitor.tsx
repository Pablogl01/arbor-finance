'use client'

import { useState, useMemo } from 'react';
import { Bitcoin, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import AssetModal from '@/components/ui/AssetModal';
import { useAssets, usePortfolio } from '@/hooks/useAssets';
import { useAccounts } from '@/hooks/useAccounts';

interface AssetRowProps {
  icon: React.ReactNode;
  name: string;
  ticker: string;
  quantity: string;
  price: string;
  change: number;
  iconBgColor?: string;
  iconColor?: string;
  onClick?: () => void;
}

function AssetRow({
  icon,
  name,
  ticker,
  quantity,
  price,
  change,
  iconBgColor = 'bg-arbor-bg',
  iconColor = 'text-arbor-green',
  onClick
}: AssetRowProps) {
  const isPositive = change >= 0;

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl bg-white p-4 transition-all ${onClick ? 'cursor-pointer hover:shadow-soft shadow-micro hover:-translate-y-0.5' : 'shadow-micro'
        }`}
    >
      <div className="flex w-1/3 items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBgColor} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-arbor-text line-clamp-1">{name}</h3>
          <p className="text-xs text-arbor-textmuted mt-0.5">{ticker}</p>
        </div>
      </div>

      <div className="w-1/3 text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider text-arbor-textmuted">Quantity</p>
        <p className="text-sm font-bold text-arbor-text mt-0.5">{quantity}</p>
      </div>

      <div className="w-1/3 text-right">
        <p className="text-sm font-bold text-arbor-text">{price}</p>
        <div className="mt-1 flex justify-end">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isPositive
              ? 'bg-arbor-mint text-arbor-darkmint'
              : 'bg-red-50 text-red-500'
              }`}
          >
            {isPositive ? <TrendingUp className="h-2 w-2 inline mr-1" /> : <TrendingDown className="h-2 w-2 inline mr-1" />}
            {isPositive ? '+' : ''}{change}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface InvestmentMonitorProps {
  accounts: any[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export default function InvestmentMonitor({ accounts, loading: accountsLoading, refresh }: InvestmentMonitorProps) {
  const { assets, loading: assetsLoading } = useAssets();

  // Find the first investment account to show on dashboard
  const investmentAccount = useMemo(() =>
    accounts.find(a => a.type === 'investment'),
    [accounts]);

  const { holdings, loading: portfolioLoading } = usePortfolio(investmentAccount?.id || null);

  const [selectedAsset, setSelectedAsset] = useState<{ name: string, ticker: string } | null>(null);

  const isLoading = accountsLoading || assetsLoading || (!!investmentAccount && portfolioLoading);

  const handleAssetClick = (name: string, ticker: string) => {
    setSelectedAsset({ name, ticker });
  };

  const dashboardHoldings = useMemo(() => {
    return holdings.map(h => {
      const asset = assets.find(a => a.ticker === h.assetTicker);
      const currentPrice = asset?.currentPrice || 0;
      const averageCost = h.averageCost || 0;

      // Calculate unrealized P&L percentage
      const pnlPercentage = averageCost > 0
        ? ((currentPrice - averageCost) / averageCost) * 100
        : 0;

      return {
        ...h,
        name: asset?.name || h.assetTicker,
        currentPrice,
        pnlPercentage,
        type: asset?.type || 'asset'
      };
    });
  }, [holdings, assets]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(val);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-arbor-text">Investment Monitor</h2>
          <button className="text-xs font-bold text-arbor-green hover:underline">View All →</button>
        </div>

        <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col gap-3 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white shadow-micro rounded-xl" />)}
            </div>
          ) : dashboardHoldings.length > 0 ? (
            dashboardHoldings.map(holding => (
              <AssetRow
                key={holding.id}
                icon={holding.type === 'crypto' ? <Bitcoin className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                name={holding.name}
                ticker={holding.assetTicker}
                quantity={`${holding.quantity.toFixed(4)} Units`}
                price={formatCurrency(holding.currentPrice)}
                change={Number(holding.pnlPercentage.toFixed(2))}
                onClick={() => handleAssetClick(holding.name, holding.assetTicker)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white border border-arbor-border/30 shadow-micro">
              <Building2 className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No hay inversiones registradas</p>
            </div>
          )}
        </div>
      </div>

      <AssetModal
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        assetName={selectedAsset?.name}
        assetTicker={selectedAsset?.ticker}
        accountId={investmentAccount?.id || null}
        onTrade={refresh}
      />
    </>
  );
}
