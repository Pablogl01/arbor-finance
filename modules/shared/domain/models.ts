export type AccountType = 'cash' | 'investment';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  strategy?: string;
  balanceCache: number;
  createdAt: Date;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  category?: string;
  concept?: string;
  date: Date;
}

export interface RecurringTransaction {
  id: string;
  accountId: string;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  nextDueDate: Date;
}

export type AssetType = 'ETF' | 'Stock' | 'Crypto';

export interface Asset {
  ticker: string;
  name: string;
  type: AssetType;
  currentPrice: number;
  lastUpdated: Date;
}

export interface UserAsset {
  id: string;
  accountId: string;
  assetTicker: string;
  quantity: number;
  averageCost: number;
}

export interface InvestmentTransaction {
  id: string;
  accountId: string;
  assetTicker: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  date: Date;
}
