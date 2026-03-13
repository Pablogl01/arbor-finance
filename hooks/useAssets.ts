import { useState, useEffect, useCallback } from 'react';
import { Asset, UserAsset, InvestmentTransaction } from '../modules/shared/domain/models';
import { SupabaseAssetRepository } from '../modules/assets/infrastructure/SupabaseAssetRepository';

const assetRepo = new SupabaseAssetRepository();

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assetRepo.getAssets();
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return { assets, loading, refresh: fetchAssets };
}

export function usePortfolio(accountId: string | null) {
  const [holdings, setHoldings] = useState<UserAsset[]>([]);
  const [history, setHistory] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const [h, t] = await Promise.all([
        assetRepo.getUserAssets(accountId),
        assetRepo.getInvestmentTransactions(accountId)
      ]);
      setHoldings(h);
      setHistory(t);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const trade = async (tx: Omit<InvestmentTransaction, 'id' | 'date'> & { assetName?: string; assetType?: Asset['type'] }) => {
    // 1. Upsert the asset into the catalog first
    if (tx.assetName && tx.assetType) {
      await assetRepo.upsertAsset({
        ticker: tx.assetTicker,
        name: tx.assetName,
        type: tx.assetType,
        currentPrice: tx.price,
        lastUpdated: new Date()
      });
    }

    // 2. Perform the trade
    const { assetName, assetType, ...tradeData } = tx;
    const newTx = await assetRepo.tradeAsset(tradeData);
    
    // 3. Refresh portfolio holdings
    await fetchPortfolio(); 
    return newTx;
  };

  return { holdings, history, loading, refresh: fetchPortfolio, trade };
}
