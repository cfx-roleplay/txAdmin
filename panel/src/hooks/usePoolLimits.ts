import { useState, useEffect } from 'react';
import { useAuthedFetcher } from './fetch';

export interface PoolLimits {
    pools: Record<string, number>;
    availablePoolNames: string[];
    lastUpdated: number;
}

export function usePoolLimits() {
    const [poolLimits, setPoolLimits] = useState<PoolLimits | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const authedFetcher = useAuthedFetcher();

    const fetchPoolLimits = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authedFetcher('/settings/getPoolLimits');
            
            if (data.status === 'success') {
                setPoolLimits(data.data);
            } else {
                setError(data.error || 'Failed to fetch pool limits');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            console.error('Failed to fetch pool limits:', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPoolLimits();
    }, []);

    return {
        poolLimits,
        isLoading,
        error,
        refetch: fetchPoolLimits,
    };
} 