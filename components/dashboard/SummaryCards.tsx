'use client'

import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import AccountModal from '@/components/ui/AccountModal';
import InvestmentModal from '@/components/ui/InvestmentModal';
import { useAccounts } from '@/hooks/useAccounts';
import { RebalanceUseCase } from '@/modules/assets/application/RebalanceUseCase';

interface SummaryCardProps {
  title: string;
  amount: string;
  change: number;
  changeAmount?: string;
  isMain?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}

function SummaryCard({ title, amount, change, changeAmount, isMain = false, onClick, clickable = false }: SummaryCardProps) {
  const isPositive = change >= 0;

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all ${clickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1.5 shadow-soft bg-white/50 backdrop-blur-sm' : 'shadow-soft hover:-translate-y-1'
        } ${isMain ? 'bg-arbor-green text-white cursor-default hover:shadow-soft hover:-translate-y-1' : 'bg-white text-arbor-text'
        }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-sm font-medium ${isMain ? 'text-arbor-mint/80' : 'text-arbor-textmuted'}`}>
          {title}
        </h3>
        {isMain && <Wallet className="h-5 w-5 text-arbor-mint/50" />}
      </div>

      <div>
        <div className="text-3xl font-bold tracking-tight">{amount}</div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${isMain
              ? 'bg-white/10 text-arbor-mint'
              : isPositive
                ? 'text-arbor-darkmint'
                : 'text-red-500'
              }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeAmount && (
            <span className={`text-xs ${isMain ? 'text-arbor-mint/70' : 'text-arbor-textmuted'}`}>
              ({changeAmount})
            </span>
          )}
        </div>
      </div>

      {/* Decorative gradient blob for the main card */}
      {isMain && (
        <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white opacity-5 blur-2xl" />
      )}
    </div>
  );
}

export default function SummaryCards() {
  const { accounts, loading, refresh } = useAccounts();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const totalNetWorth = accounts.reduce((acc, curr) => acc + curr.balanceCache, 0);
  const liquidCash = accounts
    .filter(a => a.type === 'cash')
    .reduce((acc, curr) => acc + curr.balanceCache, 0);
  const investedAmount = accounts
    .filter(a => a.type === 'investment')
    .reduce((acc, curr) => acc + curr.balanceCache, 0);

  const rebalanceAdvice = RebalanceUseCase.calculateSuggestions(totalNetWorth, liquidCash, investedAmount);
  const investedPercentage = (investedAmount / (totalNetWorth || 1)) * 100;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(val);

  const handleOpenAccount = (type: 'cash' | 'investment') => {
    const account = accounts.find(a => a.type === type);
    setSelectedAccountId(account?.id || null);
    if (type === 'cash') setIsAccountModalOpen(true);
    else setIsInvestmentModalOpen(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-soft" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SummaryCard
          title="Net Worth Total"
          amount={formatCurrency(totalNetWorth)}
          change={2.4}
          changeAmount="€29k"
          isMain={true}
        />
        <SummaryCard
          title="Liquid (Cash)"
          amount={formatCurrency(liquidCash)}
          change={-0.5}
          onClick={() => handleOpenAccount('cash')}
          clickable={true}
        />
        <SummaryCard
          title="Invested (Dynamic)"
          amount={formatCurrency(investedAmount)}
          change={3.1}
          onClick={() => handleOpenAccount('investment')}
          clickable={true}
        />
      </div>

      {/* Allocation Summary - Replacing Sidebar functionalities */}
      <div className="rounded-2xl bg-white p-6 shadow-soft border border-arbor-border/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-arbor-text uppercase tracking-wider mb-3">Portfolio Strategy</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-arbor-textmuted uppercase tracking-wider">Target Allocation</span>
                  <span className="text-arbor-green">82% Invested</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-arbor-bg">
                  <div
                    className="h-full rounded-full bg-arbor-green transition-all duration-500"
                    style={{ width: `${Math.min(investedPercentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="hidden md:block h-10 w-[1px] bg-arbor-border/50" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-arbor-textmuted uppercase">Strategy Status</span>
                <span className={`text-sm font-bold ${rebalanceAdvice.status === 'Optimized' ? 'text-arbor-green' : 'text-orange-500'}`}>
                  {rebalanceAdvice.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:w-1/3">
            <div className={`rounded-xl p-4 border ${rebalanceAdvice.status === 'Optimized' ? 'bg-arbor-mint/30 border-arbor-green/10' : 'bg-orange-50 border-orange-200'}`}>
              <p className="text-xs font-bold text-arbor-text mb-1">Advisor Tip:</p>
              <p className="text-xs leading-relaxed text-arbor-text/80">
                {rebalanceAdvice.suggestion}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        accountId={selectedAccountId}
        onTransactionAdded={refresh}
      />

      <InvestmentModal
        isOpen={isInvestmentModalOpen}
        onClose={() => setIsInvestmentModalOpen(false)}
        accountId={selectedAccountId}
        onTrade={refresh}
      />
    </>
  );
}
