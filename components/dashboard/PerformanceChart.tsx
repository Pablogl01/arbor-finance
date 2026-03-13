'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);



export const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: '#06402B',
      titleFont: { family: 'Inter', size: 13 },
      bodyFont: { family: 'Inter', size: 14, weight: 'bold' as const },
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: function (context: any) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
          }
          return label;
        }
      }
    },
  },
  elements: {
    line: {
      tension: 0.4, // Smooth organic curve
      borderWidth: 3,
    },
    point: {
      radius: 0,
      hoverRadius: 6,
      backgroundColor: '#06402B',
      borderWidth: 2,
      borderColor: '#ffffff',
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false,
      },
      ticks: {
        font: { family: 'Inter', size: 10, weight: 'bold' as const },
        color: '#94A3B8', // slate-400
        padding: 10,
      }
    },
    y: {
      display: false, // Hide Y axis per design
      min: 0,
    },
  },
};

export default function PerformanceChart() {
  const { data: historyData, loading } = useNetWorthHistory();

  const chartData = {
    labels: historyData.labels.length > 0 ? historyData.labels : [''],
    datasets: [
      {
        fill: true,
        label: 'Net Worth',
        data: historyData.values.length > 0 ? historyData.values : [0],
        borderColor: '#06402B',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(6, 64, 43, 0.15)'); // Light green fade
          gradient.addColorStop(1, 'rgba(6, 64, 43, 0)');
          return gradient;
        },
      },
    ],
  };

  return (
    <div className="flex h-full w-full flex-col rounded-2xl bg-white p-6 shadow-soft">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-arbor-text">Net Worth Performance</h2>
          <p className="text-sm text-arbor-textmuted">Wealth accumulation over 6 months</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md bg-arbor-mint px-3 py-1 text-xs font-bold text-arbor-green">1Y</button>
          <button className="rounded-md px-3 py-1 text-xs font-bold text-arbor-textmuted hover:bg-slate-50 transition-colors">ALL</button>
        </div>
      </div>

      <div className="relative flex-1 w-full">
        {/* The wrapper div needs relative position and explicit height for chart.js responsive to work well inside flex */}
        <div className="absolute inset-0">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">Cargando datos...</div>
          ) : (
            <Line options={options} data={chartData} />
          )}
        </div>
      </div>
    </div>
  );
}
