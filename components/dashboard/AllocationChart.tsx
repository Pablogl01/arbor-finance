'use client'

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useAccounts } from '@/hooks/useAccounts';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AllocationChart() {
    const { accounts, loading } = useAccounts();

    // Mock distribution since real asset-level split might need more logic
    // For now, let's base it on Account Types and assume some ETF/Stock distribution
    const cash = accounts
        .filter(a => a.type === 'cash')
        .reduce((acc, curr) => acc + curr.balanceCache, 0);

    const invested = accounts
        .filter(a => a.type === 'investment')
        .reduce((acc, curr) => acc + curr.balanceCache, 0);

    const total = cash + invested;

    const data = {
        labels: ['Cash & Liquid', 'ETFs / Funds', 'Crypto / Dynamic'],
        datasets: [
            {
                data: total > 0 ? [cash, invested * 0.7, invested * 0.3] : [1, 1, 1],
                backgroundColor: [
                    '#06402B', // Dark Green
                    '#10B981', // Emerald 500
                    '#DCFCE7', // Mint 100
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
                hoverOffset: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { family: 'Inter', size: 12, weight: 'bold' as any },
                    color: '#1e293b',
                },
            },
            tooltip: {
                backgroundColor: '#06402B',
                padding: 12,
                titleFont: { family: 'Inter', size: 13 },
                bodyFont: { family: 'Inter', size: 14, weight: 'bold' as any },
                callbacks: {
                    label: function (context: any) {
                        const value = context.raw;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return ` ${context.label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(value)} (${percentage}%)`;
                    }
                }
            }
        },
        cutout: '70%',
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center text-sm text-arbor-textmuted italic">Calculating allocation...</div>;
    }

    return (
        <div className="flex h-full flex-col p-2">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-arbor-text uppercase tracking-wider">Asset Allocation</h3>
                <span className="text-xs font-bold text-arbor-green bg-arbor-mint px-2 py-0.5 rounded-full">Balanced Strategy</span>
            </div>
            <div className="relative flex-1">
                <Doughnut data={data} options={options} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold text-arbor-textmuted uppercase tracking-tighter">Total Stock</span>
                    <span className="text-base font-bold text-arbor-green">
                        {new Intl.NumberFormat('en-US', { notation: 'compact', style: 'currency', currency: 'EUR' }).format(invested)}
                    </span>
                </div>
            </div>
        </div>
    );
}
