import { AccountRepository } from "../../accounts/domain/AccountRepository";

export class ProcessRecurringWorker {
    constructor(private accountRepo: AccountRepository) { }

    /**
     * Main execution loop for the worker.
     * In a real environment, this would be a Cron Job or Edge Function.
     */
    public async execute(): Promise<{ processedCount: number }> {
        const accounts = await this.accountRepo.getAccounts();
        let totalProcessed = 0;

        for (const account of accounts) {
            const recurringItems = await this.accountRepo.getRecurringTransactions(account.id);

            for (const item of recurringItems) {
                if (this.shouldProcess(item.nextDueDate)) {
                    await this.processItem(item);
                    totalProcessed++;
                }
            }
        }

        return { processedCount: totalProcessed };
    }

    private shouldProcess(nextDueDate: Date): boolean {
        const today = new Date();
        return nextDueDate <= today;
    }

    private async processItem(item: any): Promise<void> {
        // 1. Create the actual transaction
        await this.accountRepo.createTransaction({
            accountId: item.accountId,
            amount: item.amount,
            type: item.amount > 0 ? 'income' : 'expense',
            category: 'Recurring',
            concept: item.name
        });

        // 2. Calculate next execution date
        const nextDate = this.calculateNextDate(item.nextDueDate, item.frequency);

        // 3. Update the recurring transaction record
        await this.accountRepo.updateRecurringTransaction(item.id, {
            nextDueDate: nextDate
        });
    }

    private calculateNextDate(currentDate: Date, frequency: string): Date {
        const date = new Date(currentDate);
        switch (frequency) {
            case 'daily':
                date.setDate(date.getDate() + 1);
                break;
            case 'weekly':
                date.setDate(date.getDate() + 7);
                break;
            case 'monthly':
            default:
                date.setMonth(date.getMonth() + 1);
                break;
        }
        return date;
    }
}
