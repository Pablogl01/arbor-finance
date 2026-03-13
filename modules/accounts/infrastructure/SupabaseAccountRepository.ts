import { createClient } from '@/utils/supabase/client';
import { Account, Transaction, RecurringTransaction } from '../../shared/domain/models';
import { AccountRepository } from '../domain/AccountRepository';

export class SupabaseAccountRepository implements AccountRepository {
  private supabase = createClient();

  async getAccounts(): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      name: item.name,
      type: item.type,
      strategy: item.strategy,
      balanceCache: Number(item.balance_cache),
      createdAt: new Date(item.created_at),
    }));
  }

  async getTransactions(accountId: string): Promise<Transaction[]> {
    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      accountId: item.account_id,
      amount: Number(item.amount),
      type: item.type,
      category: item.category,
      concept: item.concept,
      date: new Date(item.date),
    }));
  }

  async getRecurringTransactions(accountId: string): Promise<RecurringTransaction[]> {
    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .select('*')
      .eq('account_id', accountId);

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      accountId: item.account_id,
      name: item.name,
      amount: Number(item.amount),
      frequency: item.frequency,
      dayOfMonth: item.day_of_month,
      dayOfWeek: item.day_of_week,
      nextDueDate: new Date(item.next_due_date),
    }));
  }

  async createTransaction(transaction: Omit<Transaction, 'id' | 'date'>): Promise<Transaction> {
    const { data, error } = await this.supabase
      .from('transactions')
      .insert({
        account_id: transaction.accountId,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        concept: transaction.concept,
      })
      .select()
      .single();

    if (error) throw error;

    // Update the account balance
    const { data: accData } = await this.supabase
      .from('accounts')
      .select('balance_cache')
      .eq('id', transaction.accountId)
      .single();

    if (accData) {
      const currentBalance = Number(accData.balance_cache);
      const newBalance = transaction.type === 'income' 
        ? currentBalance + transaction.amount 
        : currentBalance - transaction.amount;
        
      await this.supabase
        .from('accounts')
        .update({ balance_cache: newBalance })
        .eq('id', transaction.accountId);
    }

    return {
      id: data.id,
      accountId: data.account_id,
      amount: Number(data.amount),
      type: data.type,
      category: data.category,
      concept: data.concept,
      date: new Date(data.date),
    };
  }

  async createAccount(account: Omit<Account, 'id' | 'createdAt' | 'balanceCache' | 'userId'>): Promise<Account> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error("User must be authenticated to create an account.");

    const { data, error } = await this.supabase
      .from('accounts')
      .insert({
        user_id: user.id,
        name: account.name,
        type: account.type,
        strategy: account.strategy,
        balance_cache: 0
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      type: data.type,
      strategy: data.strategy,
      balanceCache: Number(data.balance_cache),
      createdAt: new Date(data.created_at),
    };
  }

  async createRecurringTransaction(transaction: Omit<RecurringTransaction, 'id'>): Promise<RecurringTransaction> {
    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .insert({
        account_id: transaction.accountId,
        name: transaction.name,
        amount: transaction.amount,
        frequency: transaction.frequency,
        day_of_month: transaction.dayOfMonth,
        day_of_week: transaction.dayOfWeek,
        next_due_date: transaction.nextDueDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      accountId: data.account_id,
      name: data.name,
      amount: Number(data.amount),
      frequency: data.frequency,
      dayOfMonth: data.day_of_month,
      dayOfWeek: data.day_of_week,
      nextDueDate: new Date(data.next_due_date),
    };
  }

  async updateRecurringTransaction(id: string, transaction: Partial<Omit<RecurringTransaction, 'id' | 'accountId'>>): Promise<RecurringTransaction> {
    const updateData: any = {};
    if (transaction.name !== undefined) updateData.name = transaction.name;
    if (transaction.amount !== undefined) updateData.amount = transaction.amount;
    if (transaction.frequency !== undefined) updateData.frequency = transaction.frequency;
    if (transaction.dayOfMonth !== undefined) updateData.day_of_month = transaction.dayOfMonth;
    if (transaction.dayOfWeek !== undefined) updateData.day_of_week = transaction.dayOfWeek;
    if (transaction.nextDueDate !== undefined) updateData.next_due_date = transaction.nextDueDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('recurring_transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      accountId: data.account_id,
      name: data.name,
      amount: Number(data.amount),
      frequency: data.frequency,
      dayOfMonth: data.day_of_month,
      dayOfWeek: data.day_of_week,
      nextDueDate: new Date(data.next_due_date),
    };
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    const { data: txData, error: txError } = await this.supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError) throw txError;

    const { error: delError } = await this.supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (delError) throw delError;

    const { data: accData } = await this.supabase
      .from('accounts')
      .select('balance_cache')
      .eq('id', txData.account_id)
      .single();

    if (accData) {
      const currentBalance = Number(accData.balance_cache);
      const amount = Number(txData.amount);
      const newBalance = txData.type === 'income' 
        ? currentBalance - amount 
        : currentBalance + amount;
        
      await this.supabase
        .from('accounts')
        .update({ balance_cache: newBalance })
        .eq('id', txData.account_id);
    }
  }
}
