import { Account, Transaction, RecurringTransaction } from '../../shared/domain/models';

export interface AccountRepository {
  getAccounts(): Promise<Account[]>;
  getTransactions(accountId: string): Promise<Transaction[]>;
  getRecurringTransactions(accountId: string): Promise<RecurringTransaction[]>;
  createTransaction(transaction: Omit<Transaction, 'id' | 'date'>): Promise<Transaction>;
  createAccount(account: Omit<Account, 'id' | 'createdAt' | 'balanceCache' | 'userId'>): Promise<Account>;
  createRecurringTransaction(transaction: Omit<RecurringTransaction, 'id'>): Promise<RecurringTransaction>;
  updateRecurringTransaction(id: string, transaction: Partial<Omit<RecurringTransaction, 'id' | 'accountId'>>): Promise<RecurringTransaction>;
  deleteTransaction(transactionId: string): Promise<void>;
}
