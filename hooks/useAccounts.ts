import { useState, useEffect, useCallback } from 'react';
import { Account, Transaction, RecurringTransaction } from '../modules/shared/domain/models';
import { SupabaseAccountRepository } from '../modules/accounts/infrastructure/SupabaseAccountRepository';

const accountRepo = new SupabaseAccountRepository();

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await accountRepo.getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = async (account: Omit<Account, 'id' | 'createdAt' | 'balanceCache' | 'userId'>) => {
    const newAccount = await accountRepo.createAccount(account);
    await fetchAccounts(true);
    return newAccount;
  };

  return { accounts, loading, error, refresh: () => fetchAccounts(true), createAccount };
}

export function useAccountDetails(accountId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetails = useCallback(async (silent = false) => {
    if (!accountId) return;
    try {
      if (!silent) setLoading(true);
      const [txs, rec] = await Promise.all([
        accountRepo.getTransactions(accountId),
        accountRepo.getRecurringTransactions(accountId)
      ]);
      setTransactions(txs);
      setRecurring(rec);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'date'>) => {
    const newTx = await accountRepo.createTransaction(tx);
    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  };

  const addRecurringTransaction = async (tx: Omit<RecurringTransaction, 'id'>) => {
    const newTx = await accountRepo.createRecurringTransaction(tx);
    setRecurring(prev => [newTx, ...prev]);
    return newTx;
  };

  const updateRecurringTransaction = async (id: string, tx: Partial<Omit<RecurringTransaction, 'id' | 'accountId'>>) => {
    const updatedTx = await accountRepo.updateRecurringTransaction(id, tx);
    setRecurring(prev => prev.map(item => item.id === id ? updatedTx : item));
    return updatedTx;
  };

  const deleteTransaction = async (transactionId: string) => {
    await accountRepo.deleteTransaction(transactionId);
    setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
  };

  return { transactions, recurring, loading, refresh: () => fetchDetails(true), addTransaction, addRecurringTransaction, updateRecurringTransaction, deleteTransaction };
}
