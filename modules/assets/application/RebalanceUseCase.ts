import { Account } from "../../shared/domain/models";

export interface RebalanceSuggestion {
    assetTicker: string;
    action: 'buy' | 'sell';
    amount: number;
    message: string;
}

export class RebalanceUseCase {
    /**
     * Simple rebalance logic based on target percentage.
     * Currently suggests basic actions to move towards an 80/20 split if deviations are high.
     */
    public static calculateSuggestions(
        totalNetWorth: number,
        liquidCash: number,
        investedAmount: number,
        targetInvestedPercentage: number = 0.82
    ): { status: string; suggestion: string } {
        const currentInvestedPercentage = investedAmount / (totalNetWorth || 1);
        const diff = targetInvestedPercentage - currentInvestedPercentage;

        if (Math.abs(diff) < 0.03) {
            return {
                status: 'Optimized',
                suggestion: 'Your portfolio is well-balanced according to your strategy.'
            };
        }

        if (diff > 0) {
            const amountToInvest = totalNetWorth * diff;
            return {
                status: 'Under-invested',
                suggestion: `Consider investing €${amountToInvest.toFixed(0)} into your dynamic assets to reach your target.`
            };
        } else {
            const amountToDeleverage = totalNetWorth * Math.abs(diff);
            return {
                status: 'Over-exposed',
                suggestion: `Your liquid reserves are low. Consider securing €${amountToDeleverage.toFixed(0)} from your investments.`
            };
        }
    }
}
