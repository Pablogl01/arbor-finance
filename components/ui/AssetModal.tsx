import { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAssets, usePortfolio } from '@/hooks/useAssets';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetName?: string;
  assetTicker?: string;
  accountId: string | null;
  onTrade?: () => void;
}

// Chart Data Configuration (Moved outside to prevent re-render lag)
const labels = ['01 Oct', '08 Oct', '15 Oct', '22 Oct', '29 Oct'];
const chartData = {
  labels,
  datasets: [
    {
      fill: true,
      label: 'Performance',
      data: [42000, 48000, 47000, 56000, 64281],
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

const chartOptions = {
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
        label: function(context: any) {
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
        maxTicksLimit: 5,
      },
    },
    y: {
      display: false, 
    },
  },
};

export default function AssetModal({ isOpen, onClose, assetName, assetTicker, accountId, onTrade }: AssetModalProps) {
  const { assets } = useAssets();
  const { holdings, trade, refresh } = usePortfolio(accountId);

  const [timeframe, setTimeframe] = useState('1M');
  const [tradeAction, setTradeAction] = useState<'buy' | 'sell' | 'adjust'>('buy');
  const [amount, setAmount] = useState('');
  const [targetBalance, setTargetBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current asset details
  const asset = useMemo(() => assets.find(a => a.ticker === assetTicker), [assets, assetTicker]);
  
  // Get current user holding for this asset
  const holding = useMemo(() => holdings.find(h => h.assetTicker === assetTicker), [holdings, assetTicker]);

  if (!isOpen) return null;

  const currentPrice = asset?.currentPrice || 0;
  
  const handleTrade = async () => {
    if (!accountId || !assetTicker || !currentPrice) return;
    
    try {
      setIsSubmitting(true);
      
      let finalType: 'buy' | 'sell' = tradeAction as 'buy' | 'sell';
      let finalQuantity = 0;

      if (tradeAction === 'adjust') {
        const target = Number(targetBalance.replace(',', '.'));
        if (isNaN(target)) throw new Error("Saldo inválido");
        
        const currentQty = holding?.quantity || 0;
        const targetQty = target / currentPrice;
        const diffQty = targetQty - currentQty;

        if (Math.abs(diffQty) < 0.00000001) {
          onClose();
          return;
        }

        finalType = diffQty > 0 ? 'buy' : 'sell';
        finalQuantity = Math.abs(diffQty);
      } else {
        if (!amount) return;
        finalQuantity = Number(amount.replace(',', '.'));
        finalType = tradeAction;
      }

      await trade({
        accountId,
        assetTicker,
        type: finalType,
        quantity: finalQuantity, // Always positive, the trigger handles the math
        price: currentPrice
      });
      
      setAmount('');
      setTargetBalance('');
      refresh();
      if (onTrade) onTrade();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err.message || "No se pudo procesar la operación"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(val);

  const timeframes = ['1W', '1M', '3M', '1Y', 'ALL'];

  const unrealizedPL = holding ? (holding.quantity * currentPrice) - (holding.quantity * holding.averageCost) : 0;
  const unrealizedPLPercentage = holding && holding.averageCost > 0 
    ? (unrealizedPL / (holding.quantity * holding.averageCost)) * 100 
    : 0;

  const totalValue = tradeAction === 'adjust' 
    ? (Number(targetBalance.replace(',', '.')) || 0)
    : (currentPrice * (Number(amount.replace(',', '.')) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
      <div className="relative flex w-full max-w-[1000px] max-h-[90vh] flex-col overflow-hidden rounded-[24px] bg-white text-left shadow-2xl">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-10 text-slate-400 transition-colors hover:text-arbor-text"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 p-5 md:p-6 md:pb-8">
          
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight text-arbor-text">Gestionar Inversión: {assetName || asset?.name}</h2>
          </div>

          <div className="flex flex-col gap-5">
            
            {/* Left Column (Asset Info & Chart) */}
            <div className="flex-1 flex flex-col gap-4">
              
              {/* Asset Header Info */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
                  <span className="text-xl font-bold">{assetTicker?.substring(0, 1)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-arbor-text">{assetName || asset?.name}</h3>
                  <p className="text-xs text-slate-400">{assetTicker}</p>
                </div>
              </div>

              {/* Current Value */}
              <div>
                <span className="text-xs font-bold text-slate-500">Precio Actual</span>
                <div className="flex items-end gap-3 mt-1">
                  <span className="text-[32px] font-bold tracking-tight text-arbor-text leading-none">{formatCurrency(currentPrice)}</span>
                  <span className={`mb-1 flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold ${currentPrice > 0 ? 'bg-arbor-mint text-arbor-darkmint' : 'bg-red-50 text-red-500'}`}>
                    {currentPrice > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    +4.2%
                  </span>
                </div>
              </div>

              {/* Chart Card */}
              <div className="rounded-2xl bg-[#F8FAF9] p-4 md:p-5 border border-arbor-border/30">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Rendimiento</span>
                  <div className="flex gap-4">
                    {timeframes.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`text-[10px] font-bold transition-colors ${
                          timeframe === tf
                            ? 'rounded-full bg-arbor-green px-3 py-1 text-white shadow-micro'
                            : 'text-arbor-text hover:text-arbor-green py-1'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative h-[140px] w-full mt-4">
                  <div className="absolute inset-0">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column (Holdings, Stats, & Trading Form) */}
            <div className="w-full flex flex-col lg:flex-row gap-5">
              
              <div className="flex flex-1 flex-col gap-5">
                {/* Your Holdings */}
                <div className="h-fit rounded-2xl bg-[#F8FAF9] p-4 md:p-5 border border-arbor-border/30">
                  <h4 className="mb-4 text-xs font-bold tracking-wider text-arbor-green uppercase">Tus Posiciones</h4>
                  
                  <div className="flex justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-slate-500">Balance Total</p>
                      <p className="text-sm font-bold text-arbor-text">{holding?.quantity.toFixed(6) || '0.00'} {assetTicker}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Coste Promedio</p>
                      <p className="text-sm font-bold text-arbor-text">{formatCurrency(holding?.averageCost || 0)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500">P&L No Realizado</p>
                    <p className={`text-base font-bold ${unrealizedPL >= 0 ? 'text-arbor-darkmint' : 'text-red-500'}`}>
                      {unrealizedPL >= 0 ? '+' : ''}{formatCurrency(unrealizedPL)} ({unrealizedPLPercentage.toFixed(2)}%)
                    </p>
                  </div>
                </div>

                {/* Market Statistics */}
                <div>
                  <h4 className="mb-3 text-[10px] font-bold tracking-wider text-arbor-text uppercase">Estadísticas de Mercado</h4>
                  <div className="flex flex-col text-xs">
                    <div className="flex justify-between py-2 border-b border-arbor-border/40">
                      <span className="text-slate-500">Volumen (24h)</span>
                      <span className="font-bold text-arbor-text">€35.1B</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-arbor-border/40">
                      <span className="text-slate-500">Capitalización</span>
                      <span className="font-bold text-arbor-text">€1.26T</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trading Form */}
              <div className="flex-1 rounded-xl border border-arbor-border p-1 mt-5 lg:mt-0">
                {/* Tabs */}
                <div className="flex border-b border-arbor-border">
                  <button 
                    onClick={() => setTradeAction('buy')}
                    className={`flex-1 py-2 text-sm font-bold transition-all ${
                      tradeAction === 'buy'
                        ? 'border-b-2 border-arbor-green text-arbor-green'
                        : 'text-slate-400 hover:text-arbor-text'
                    }`}
                  >
                    Comprar
                  </button>
                  <button 
                    onClick={() => setTradeAction('sell')}
                    className={`flex-1 py-2 text-sm font-bold transition-all ${
                      tradeAction === 'sell'
                        ? 'border-b-2 border-arbor-green text-arbor-green'
                        : 'text-slate-400 hover:text-arbor-text'
                    }`}
                  >
                    Vender
                  </button>
                  <button 
                    onClick={() => setTradeAction('adjust')}
                    className={`flex-1 py-2 text-sm font-bold transition-all ${
                      tradeAction === 'adjust'
                        ? 'border-b-2 border-arbor-green text-arbor-green'
                        : 'text-slate-400 hover:text-arbor-text'
                    }`}
                  >
                    Ajustar
                  </button>
                </div>

                {/* Form Body */}
                <div className="p-4 flex flex-col gap-3">
                  {tradeAction === 'adjust' ? (
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Nuevo Saldo Total (EUR)
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={targetBalance}
                          onChange={(e) => setTargetBalance(e.target.value)}
                          placeholder="0.00" 
                          className="w-full rounded-lg bg-[#F8FAF9] px-3.5 py-2.5 text-sm font-bold text-arbor-text outline-none focus:ring-2 focus:ring-arbor-mint/50 transition-all placeholder:text-slate-400"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">EUR</span>
                      </div>
                      <p className="mt-2 text-[9px] text-slate-400 italic">
                        El sistema generará una transacción de corrección para igualar este saldo.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Cantidad ({assetTicker})
                      </label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00" 
                          className="w-full rounded-lg bg-[#F8FAF9] px-3.5 py-2.5 text-sm font-bold text-arbor-text outline-none focus:ring-2 focus:ring-arbor-mint/50 transition-all placeholder:text-slate-400"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{assetTicker}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Precio Unitario (€)
                    </label>
                    <div className="flex items-center justify-between rounded-lg bg-[#F8FAF9] px-3.5 py-2.5">
                      <span className="text-sm font-bold text-arbor-text">{formatCurrency(currentPrice)}</span>
                      <span className="text-sm font-bold text-slate-400">EUR</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {tradeAction === 'adjust' ? 'Saldo Objetivo' : 'Total Est.'}
                    </span>
                    <span className="text-sm font-bold text-arbor-text">{formatCurrency(totalValue)}</span>
                  </div>

                  <button 
                    onClick={handleTrade}
                    disabled={isSubmitting || (tradeAction !== 'adjust' && (!amount || Number(amount) <= 0)) || (tradeAction === 'adjust' && !targetBalance)}
                    className="mt-1 w-full rounded-lg bg-arbor-green py-3 text-sm font-bold text-white transition-all hover:bg-[#043020] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Procesando...' : (
                      tradeAction === 'buy' ? `Comprar ${assetTicker}` : 
                      tradeAction === 'sell' ? `Vender ${assetTicker}` : 
                      `Confirmar Ajuste`
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Status */}
          <div className="mt-5 flex items-center justify-between border-t border-arbor-border/50 pt-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Execution by Arbor Trading Engine</span>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-arbor-darkmint"></span>
              <span className="text-[9px] font-bold text-arbor-textmuted">Live Market Data</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
