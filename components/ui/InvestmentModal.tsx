import { useState, useEffect, useCallback } from 'react';
import {
  X,
  TrendingUp,
  Plus,
  Scale
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  ScriptableContext,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import AssetModal from '@/components/ui/AssetModal';
import { usePortfolio, useAssets } from '@/hooks/useAssets';
import { useAccounts } from '@/hooks/useAccounts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  onTrade?: () => void;
}

// Chart Data Configuration (Keep mostly static for mockup unless we want to map history)
const labels = ['ENE', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV', 'ENE'];
const chartData = {
  labels,
  datasets: [
    {
      fill: true,
      label: 'Performance',
      data: [15, 25, 20, 45, 75, 25, 80],
      borderColor: '#06402B',
      backgroundColor: (context: ScriptableContext<'line'>) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(6, 64, 43, 0.15)'); // Light green fade
        gradient.addColorStop(1, 'rgba(6, 64, 43, 0)');
        return gradient;
      },
    },
  ],
};

const chartOptions: any = {
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
            label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(context.parsed.y * 1000);
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
      },
    },
    y: {
      display: false,
      min: 0,
    },
  },
};

export default function InvestmentModal({ isOpen, onClose, accountId, onTrade }: InvestmentModalProps) {
  const { assets, refresh: refreshAssets } = useAssets();
  const { holdings, trade, refresh: refreshPortfolio } = usePortfolio(accountId);
  
  const [timeframe, setTimeframe] = useState('1Y');
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<{ name: string, ticker: string } | null>(null);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createAccount } = useAccounts();
  const [newAccountName, setNewAccountName] = useState('Cartera de Inversión');

  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchResults, 400); // 400ms debounce
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectAsset = async (asset: any) => {
    setSearchQuery(asset.name);
    // Fetch live price for the selected asset
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/assets/quote?ticker=${encodeURIComponent(asset.ticker)}`);
      const data = await res.json();
      
      setSelectedAsset({
        ...asset,
        currentPrice: data.price || 0,
      });
    } catch (err) {
      console.error(err);
      setSelectedAsset(asset); // fallback
    } finally {
      setIsSubmitting(false);
      setSearchResults([]); // clear dropdown
    }
  };

  const handleAddAsset = async () => {
    if (!accountId) {
      alert("Debes crear una cuenta de inversión primero.");
      return;
    }
    if (!selectedAsset || !investAmount) return;
    try {
      setIsSubmitting(true);
      const parsedAmount = Number(investAmount.replace(',', '.'));
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Cantidad inválida");
      }
      
      await trade({
        accountId,
        assetTicker: selectedAsset.ticker,
        assetName: selectedAsset.name,
        assetType: selectedAsset.type,
        type: 'buy',
        quantity: parsedAmount / selectedAsset.currentPrice,
        price: selectedAsset.currentPrice
      });
      setIsAddingAsset(false);
      setSearchQuery('');
      setSelectedAsset(null);
      setInvestAmount('');
      await refreshAssets();
      await refreshPortfolio();
      if (onTrade) onTrade();
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(val);

  const portfolioHoldings = holdings.map(h => {
    const asset = assets.find(a => a.ticker === h.assetTicker);
    return {
      ...h,
      assetName: asset?.name || h.assetTicker,
      currentPrice: asset?.currentPrice || 0,
      totalValue: h.quantity * (asset?.currentPrice || 0)
    };
  });

  const totalPortfolioValue = portfolioHoldings.reduce((acc, curr) => acc + curr.totalValue, 0);

  const timeframes = ['1D', '1W', '1M', '6M', '1Y', 'ALL'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6">
        <div className="relative flex w-full max-w-[1000px] max-h-[90vh] flex-col overflow-hidden rounded-[24px] bg-white text-left shadow-2xl">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-6 top-6 z-10 text-slate-400 transition-colors hover:text-arbor-text"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-arbor-text">Detalle de Cuenta de Inversión</h2>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Activo
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Cartera de inversión de Supabase</p>

              <div className="mt-6 flex items-end gap-4">
                <span className="text-[40px] font-bold tracking-tight text-arbor-text leading-none">
                  {formatCurrency(totalPortfolioValue)}
                </span>
                <span className="mb-2 flex items-center gap-1 rounded-full bg-arbor-mint px-2.5 py-1 text-xs font-bold text-arbor-darkmint">
                  <TrendingUp className="h-3 w-3" />
                  +12.4%
                </span>
              </div>
            </div>

            {!accountId ? (
              <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-arbor-border bg-slate-50 py-12 px-6 text-center">
                <TrendingUp className="h-10 w-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-arbor-text mb-1">Cuenta de Inversión no configurada</h3>
                <p className="text-xs text-arbor-textmuted mb-6 max-w-sm">
                  Necesitas crear una cuenta de inversión en el sistema para poder registrar activos y operaciones.
                </p>
                <div className="w-full max-w-[240px] mb-4">
                  <label className="mb-1.5 block text-left text-[10px] font-bold uppercase tracking-wider text-arbor-textmuted">
                    Nombre de la Cuenta
                  </label>
                  <input 
                    type="text" 
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="Ej: Mi Cartera" 
                    className="w-full text-center rounded-lg border border-arbor-border bg-white px-4 py-2.5 text-sm text-arbor-text outline-none focus:border-arbor-mint focus:ring-2 focus:ring-arbor-mint/50 transition-all placeholder:text-slate-400"
                  />
                </div>
                <button 
                  onClick={async () => {
                    if (!newAccountName.trim()) return;
                    try {
                      setIsSubmitting(true);
                      if (createAccount) {
                        await createAccount({ name: newAccountName, type: 'investment', strategy: 'none' });
                        window.location.reload();
                      }
                    } catch (e) {
                      console.error(e);
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting || !newAccountName.trim()}
                  className="rounded-xl bg-arbor-green px-6 py-2.5 text-sm font-bold text-white shadow-soft transition-all hover:bg-arbor-darkmint hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Cuenta de Inversión'}
                </button>
              </div>
            ) : (
              <>
                {/* Chart Section */}
                <div className="mb-6 border-b border-arbor-border/50 pb-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-arbor-text">Rendimiento Histórico</h3>
                    <div className="flex rounded-lg bg-slate-100/80 p-1">
                      {timeframes.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`rounded-md px-3 py-1 text-[10px] font-bold transition-all ${timeframe === tf
                              ? 'bg-arbor-green text-white shadow-micro'
                              : 'text-slate-500 hover:text-arbor-text'
                            }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative h-[200px] w-full">
                    <div className="absolute inset-0">
                      <Line data={chartData} options={chartOptions} />
                    </div>
                  </div>
                </div>

                {/* Portfolio Composition Section */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-arbor-green">Composición de la Cartera</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsAddingAsset(!isAddingAsset)}
                        className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition-all ${isAddingAsset
                            ? 'border-arbor-green bg-arbor-green text-white'
                            : 'border-arbor-border bg-white text-arbor-text hover:border-arbor-green hover:text-arbor-green'
                          }`}
                      >
                        <Plus className={`h-4 w-4 transition-transform ${isAddingAsset ? 'rotate-45' : ''}`} />
                        {isAddingAsset ? 'Cerrar' : 'Añadir Activo'}
                      </button>
                      <button className="flex items-center gap-2 rounded-lg bg-arbor-green px-3 py-1.5 text-sm font-bold text-white shadow-micro transition-colors hover:bg-[#043020]">
                        <Scale className="h-4 w-4" />
                        Rebalancear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row items-start lg:gap-6 overflow-hidden">
                    {/* Table */}
                    <div className={`transition-all duration-500 ease-in-out ${isAddingAsset ? 'w-full lg:w-1/2' : 'w-full'}`}>
                      <div className="overflow-hidden rounded-xl border border-arbor-border/50">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#F8FAF9] text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                            <tr>
                              <th className="px-6 py-4">Activo</th>
                              {!isAddingAsset && <th className="px-6 py-4">Precio Actual</th>}
                              <th className="px-6 py-4">Balance</th>
                              {!isAddingAsset && <th className="px-6 py-4 text-right">Cantidad</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-arbor-border/50 text-arbor-text bg-white">
                            {portfolioHoldings.map(holding => (
                              <tr
                                key={holding.id}
                                className="transition-all hover:bg-slate-50 cursor-pointer"
                                onClick={() => setSelectedAssetDetail({ name: holding.assetName, ticker: holding.assetTicker })}
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-[10px]">
                                      {holding.assetTicker.substring(0, 3)}
                                    </div>
                                    <div>
                                      <p className="font-bold whitespace-nowrap">{holding.assetName}</p>
                                      <p className="text-xs text-slate-400 whitespace-nowrap">{holding.assetTicker}</p>
                                    </div>
                                  </div>
                                </td>
                                {!isAddingAsset && <td className="px-6 py-4 font-bold">{formatCurrency(holding.currentPrice)}</td>}
                                <td className="px-6 py-4">
                                  <p className="font-bold whitespace-nowrap">{formatCurrency(holding.totalValue)}</p>
                                  <p className={`text-[10px] font-bold whitespace-nowrap ${holding.totalValue > (holding.quantity * holding.averageCost) ? 'text-arbor-darkmint' : 'text-red-500'}`}>
                                    {((holding.totalValue / (holding.quantity * holding.averageCost) - 1) * 100).toFixed(2)}%
                                  </p>
                                </td>
                                {!isAddingAsset && (
                                    <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                                    {holding.quantity.toFixed(4)}
                                  </td>
                                )}
                              </tr>
                            ))}
                            {portfolioHoldings.length === 0 && (
                              <tr>
                                <td colSpan={isAddingAsset ? 2 : 4} className="px-6 py-8 text-center text-slate-400 text-sm italic">
                                  No hay activos en la cartera. Añade un nuevo activo para comenzar.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Add Asset Form */}
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isAddingAsset ? 'w-full lg:w-1/2 opacity-100 mt-6 lg:mt-0' : 'w-0 h-0 opacity-0'}`}>
                      <div className="rounded-2xl bg-[#F8FAF9] border border-arbor-border/50 p-3 md:p-4 min-w-[300px]">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-arbor-text">Nuevo Activo</h4>
                          <button
                            onClick={handleAddAsset}
                            disabled={!selectedAsset || !investAmount || isSubmitting}
                            className="rounded-lg bg-arbor-green px-4 py-1.5 text-xs font-bold text-white shadow-micro transition-all hover:bg-[#043020] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="relative">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Buscador de Activos</label>
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (selectedAsset) setSelectedAsset(null);
                              }}
                              placeholder="Ej: Vanguard S&P 500..."
                              className="w-full rounded-xl border border-arbor-border bg-white px-4 py-1.5 text-sm font-bold text-arbor-text focus:border-arbor-green focus:outline-none transition-all"
                            />

                            {isSearching && !selectedAsset && searchQuery.length >= 2 && (
                              <div className="absolute z-20 mt-1 w-full rounded-xl border border-arbor-border bg-white shadow-xl p-3 text-center text-xs text-slate-400">
                                Buscando...
                              </div>
                            )}
                            {!isSearching && searchResults.length > 0 && !selectedAsset && (
                              <div className="absolute z-20 mt-1 w-full rounded-xl border border-arbor-border bg-white shadow-xl max-h-[160px] overflow-y-auto custom-scrollbar">
                                {searchResults.map(asset => (
                                  <button
                                    key={asset.ticker}
                                    onClick={() => handleSelectAsset(asset)}
                                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-arbor-border/30 last:border-0"
                                  >
                                    <div>
                                      <p className="text-sm font-bold text-arbor-text">{asset.name}</p>
                                      <p className="text-[10px] text-slate-400 uppercase">{asset.ticker} • {asset.type || 'ASSET'}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {selectedAsset && (
                               <div className="mt-2 text-[10px] font-bold text-arbor-green bg-arbor-mint px-3 py-1.5 rounded-lg flex justify-between items-center">
                                 <span>Cotización Actual (Live):</span>
                                 <span className="text-sm">{formatCurrency(selectedAsset.currentPrice)}</span>
                               </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cantidad a Invertir (€)</label>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={investAmount}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^[0-9.,]*$/.test(val)) {
                                    setInvestAmount(val);
                                  }
                                }}
                                placeholder="0.00"
                                className="w-full rounded-xl border border-arbor-border bg-white px-4 py-1.5 text-sm font-bold text-arbor-text focus:border-arbor-green focus:outline-none transition-all"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">EUR</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      <AssetModal
        isOpen={!!selectedAssetDetail}
        onClose={() => setSelectedAssetDetail(null)}
        assetName={selectedAssetDetail?.name}
        assetTicker={selectedAssetDetail?.ticker}
        accountId={accountId}
        onTrade={onTrade}
      />
    </>
  );
}
