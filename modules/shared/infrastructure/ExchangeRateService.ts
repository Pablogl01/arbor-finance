export interface ExchangeRate {
    base: string;
    rates: Record<string, number>;
}

export class ExchangeRateService {
    private static instance: ExchangeRateService;
    private cache: Map<string, { rate: number; timestamp: number }> = new Map();
    private CACHE_TTL = 1000 * 60 * 60; // 1 hour

    private constructor() { }

    public static getInstance(): ExchangeRateService {
        if (!ExchangeRateService.instance) {
            ExchangeRateService.instance = new ExchangeRateService();
        }
        return ExchangeRateService.instance;
    }

    /**
     * Mock implementation of fetching exchange rates.
     * In a real app, this would call an API like fixer.io or openexchangerates.org
     */
    public async getRate(from: string, to: string): Promise<number> {
        if (from === to) return 1;

        const cacheKey = `${from}_${to}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.rate;
        }

        // Mock rates
        const mockRates: Record<string, number> = {
            'USD_EUR': 0.92,
            'EUR_USD': 1.09,
            'GBP_EUR': 1.17,
            'EUR_GBP': 0.85,
        };

        const rate = mockRates[cacheKey] || 1;
        this.cache.set(cacheKey, { rate, timestamp: Date.now() });

        return rate;
    }

    public async convert(amount: number, from: string, to: string): Promise<number> {
        const rate = await this.getRate(from, to);
        return amount * rate;
    }
}
