import { Asset, UserAsset, InvestmentTransaction } from '../../shared/domain/models';

export interface AssetRepository {
  getAssets(): Promise<Asset[]>;
  getUserAssets(accountId: string): Promise<UserAsset[]>;
  getInvestmentTransactions(accountId: string): Promise<InvestmentTransaction[]>;
  tradeAsset(transaction: Omit<InvestmentTransaction, 'id' | 'date'>): Promise<InvestmentTransaction>;
  upsertAsset(asset: Asset): Promise<void>;
  batchUpsertAssets(assets: Asset[]): Promise<void>;
}
