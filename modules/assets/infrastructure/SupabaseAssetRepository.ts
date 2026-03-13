import { createClient } from '@/utils/supabase/client';
import { Asset, UserAsset, InvestmentTransaction } from '../../shared/domain/models';
import { AssetRepository } from '../domain/AssetRepository';

export class SupabaseAssetRepository implements AssetRepository {
  private supabase = createClient();

  async getAssets(): Promise<Asset[]> {
    const { data, error } = await this.supabase
      .from('assets')
      .select('*');

    if (error) throw error;

    return data.map(item => ({
      ticker: item.ticker,
      name: item.name,
      type: item.type,
      currentPrice: Number(item.current_price),
      lastUpdated: new Date(item.last_updated),
    }));
  }

  async getUserAssets(accountId: string): Promise<UserAsset[]> {
    const { data, error } = await this.supabase
      .from('user_assets')
      .select('*')
      .eq('account_id', accountId);

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      accountId: item.account_id,
      assetTicker: item.asset_ticker,
      quantity: Number(item.quantity),
      averageCost: Number(item.average_cost),
    }));
  }

  async getInvestmentTransactions(accountId: string): Promise<InvestmentTransaction[]> {
    const { data, error } = await this.supabase
      .from('investment_transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      accountId: item.account_id,
      assetTicker: item.asset_ticker,
      type: item.type,
      quantity: Number(item.quantity),
      price: Number(item.price),
      date: new Date(item.date),
    }));
  }

  async tradeAsset(transaction: Omit<InvestmentTransaction, 'id' | 'date'>): Promise<InvestmentTransaction> {
    const { data, error } = await this.supabase
      .from('investment_transactions')
      .insert({
        account_id: transaction.accountId,
        asset_ticker: transaction.assetTicker,
        type: transaction.type,
        quantity: transaction.quantity,
        price: transaction.price,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      accountId: data.account_id,
      assetTicker: data.asset_ticker,
      type: data.type,
      quantity: Number(data.quantity),
      price: Number(data.price),
      date: new Date(data.date),
    };
  }

  async upsertAsset(asset: Asset): Promise<void> {
    const { error } = await this.supabase
      .from('assets')
      .upsert({
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        current_price: asset.currentPrice,
        last_updated: asset.lastUpdated.toISOString()
      }, { onConflict: 'ticker' });

    if (error) throw error;
  }

  async batchUpsertAssets(assets: Asset[]): Promise<void> {
    const { error } = await this.supabase
      .from('assets')
      .upsert(assets.map(asset => ({
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        current_price: asset.currentPrice,
        last_updated: asset.lastUpdated.toISOString()
      })), { onConflict: 'ticker' });

    if (error) throw error;
  }
}
