import { z } from 'zod';

export const AccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  type: z.enum(['checking', 'savings', 'investment', 'other']),
  strategy: z.enum(['manual', 'automated', 'mixed']).optional(),
  balance_cache: z.number().default(0),
});

export const TransactionSchema = z.object({
  account_id: z.string().uuid("Invalid account ID"),
  amount: z.number().finite("Amount must be a finite number"),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1).max(50),
  concept: z.string().min(1).max(200),
  date: z.date().optional(),
});

export const RecurringTransactionSchema = z.object({
  account_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  amount: z.number(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  day_of_month: z.number().min(1).max(31).optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  next_due_date: z.date(),
});
