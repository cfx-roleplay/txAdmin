import { useState, useEffect } from 'react';
import { useAuthedFetcher } from './fetch';

export interface GameBuild {
    build: string;
    dlcName: string;
}

export interface GameBuildsData {
    fivem: GameBuild[];
    availableFiveMBuilds: string[];
    lastUpdated: number;
}

export function useGameBuilds() {
    const [gameBuilds, setGameBuilds] = useState<GameBuildsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const authedFetcher = useAuthedFetcher();

    const fetchGameBuilds = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authedFetcher('/settings/getGameBuilds');
            
            if (data.status === 'success') {
                setGameBuilds(data.data);
            } else {
                setError(data.error || 'Failed to fetch game builds');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
            console.error('Failed to fetch game builds:', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGameBuilds();
    }, []);

    return {
        gameBuilds,
        isLoading,
        error,
        refetch: fetchGameBuilds,
    };
} 