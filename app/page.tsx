'use client'

import Header from '@/components/layout/Header';
import SummaryCards from '@/components/dashboard/SummaryCards';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import InvestmentMonitor from '@/components/dashboard/InvestmentMonitor';
import AllocationChart from '@/components/dashboard/AllocationChart';
import { useAccounts } from '@/hooks/useAccounts';

export default function Home() {
  const accountState = useAccounts();

  return (
    <div className="flex min-h-screen flex-col bg-arbor-bg font-sans">
      <Header />

      {/* Main Layout Container */}
      <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-8 px-6 py-7 xl:px-8">

        {/* Full Width Grid */}
        <div className="flex flex-1 flex-col gap-8">
          <SummaryCards 
            accounts={accountState.accounts}
            loading={accountState.loading}
            refresh={accountState.refresh}
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Chart Section - Takes 2 columns on large screens */}
            <section className="h-[320px] lg:col-span-2">
              <PerformanceChart />
            </section>

            {/* Allocation Section - Takes 1 column */}
            <div className="flex flex-col gap-8">
              <div className="rounded-2xl bg-white p-6 shadow-soft border border-arbor-border/40 h-full">
                <AllocationChart />
              </div>
            </div>
          </div>

          {/* Investment List - Full Width */}
          <section>
            <InvestmentMonitor 
              accounts={accountState.accounts}
              loading={accountState.loading}
              refresh={accountState.refresh}
            />
          </section>
        </div>

      </main>
    </div>
  );
}
